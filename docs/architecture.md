# Arquitetura

Este documento descreve como o frontend do Kurio está organizado e por que algumas decisões foram
tomadas. Para instalação, contas de demonstração e cenários do mock, veja o [README](../README.md).

## Visão geral

```
Rota (TanStack Router)  →  Página (src/pages)  →  Features (src/features/*)
                                                     ├── api.ts: query options e mutações (TanStack Query)
                                                     ├── components/: UI específica do domínio
                                                     └── types.ts: contrato com a API
                                   ↓
                         apiClient (Axios)  ──HTTP──▶  MSW (src/mocks/handlers) ──▶ banco em localStorage
                         socket (Socket.IO) ──WS────▶  MSW (ws.link + socket.io-binding)
```

- **`src/routes`**: arquivos finos. Definem a URL, a validação dos parâmetros de busca e, nas rotas
  privadas, passam pelo layout `_authenticated`. O componente vem de `src/pages`.
- **`src/pages`**: compõem a tela a partir das features e cuidam dos estados de carregamento, erro,
  vazio e nova tentativa.
- **`src/features/<domínio>`**: auth, cart, orders, nfts, wallets, favorites, profile, account,
  promotions, blog e newsletter. Cada domínio expõe hooks (`useCart`, `useCheckout`,
  `useToggleFavorite`...) e esconde o formato das requisições.
- **`src/lib`**: infraestrutura sem regra de negócio (cliente HTTP, erros, Socket.IO, dinheiro,
  formatação, validação e um `useForm` mínimo).
- **`src/components`**: layout (header, `PageShell`, tab bar mobile) e UI compartilhada (diálogo
  acessível, campos de formulário, estados).
- **`src/mocks`**: o "backend" simulado. Nenhum componente importa dados de `src/mocks`; toda
  informação chega pela API.

## Estado de servidor e cache

O TanStack Query é a única fonte de dados do servidor. Não há store global para dados de domínio.

| Query key | Conteúdo |
| --- | --- |
| `['nfts', 'list', params]` | Página do catálogo (busca, aba, filtros, ordenação, página) |
| `['nfts', 'detail', id]` | Detalhes de um NFT, com `version` para o tempo real |
| `['nfts', 'related', id, limit]` · `['nfts', 'featured']` · `['catalog', 'filters']` | Listas auxiliares |
| `['cart', viewer, 'detail', networkId]` | Carrinho com totais calculados pelo servidor para a rede |
| `['cart', viewer, 'summary']` | Contador do header |
| `['favorites', viewer]` · `['wallets', viewer]` | Dados da conta |
| `['orders', viewer, 'list']` · `['orders', viewer, 'detail', id]` | Pedidos |

- **`viewer`** é o id do usuário ou `guest`. Toda chave de dado pessoal inclui o viewer, então o
  cache de uma conta nunca é servido para outra. Quando a sessão muda, o `SessionSync` remove as
  queries da conta anterior (`USER_SCOPED_QUERY_ROOTS`) e invalida o carrinho.
- **Padrões:** `staleTime` de 60 s, sem refetch no foco e até 2 novas tentativas automáticas,
  exceto para erros 4xx.
- **Mutações do carrinho** respondem com o carrinho recalculado, que é gravado direto no cache.
  Enquanto uma linha está sendo atualizada, seus controles ficam desabilitados, o que serializa
  as alterações da mesma linha e evita respostas fora de ordem.
- **Favoritos** usam atualização otimista com rollback em caso de erro.

## Dinheiro

Valores em ETH trafegam como **strings decimais** (`"1.19"`), nunca como `number`. Em
`src/lib/money.ts`, as contas são feitas em wei com `BigInt` (18 casas) e o resultado volta para
string. Os totais exibidos (subtotal, desconto, taxa e total) vêm sempre do servidor; o cliente só
formata.

## Sessão e autenticação

- `src/features/auth/session-store.ts` guarda a sessão em `localStorage['kurio.session']` e a
  expõe via `useSyncExternalStore`. Abas abertas se sincronizam pelo evento `storage`.
- O interceptor do Axios envia `Authorization: Bearer <token>` e `X-Guest-Id`. O carrinho de
  visitante é mesclado ao da conta no login.
- **Expiração:** um timer encerra a sessão em `expiresAt`, e qualquer resposta `401
  SESSION_EXPIRED` faz o mesmo. A store registra onde o usuário estava (`returnTo`), o diálogo de
  login abre com o aviso de sessão expirada e, depois do novo login, o usuário volta para essa
  página, mesmo que o redirecionamento ainda não tenha chegado à URL.
- **Rotas privadas:** o layout `_authenticated` redireciona para `/?auth=login&redirect=<url>`.
  O diálogo de login é controlado pela URL (`?auth=login|signup`), então abre sobre qualquer tela.
- **Logout** encerra a sessão no servidor e no cliente e sai das rotas privadas.

## Checkout, pagamento e idempotência

O fluxo fica em `src/features/orders/use-checkout.ts`:

1. **Revisão (`POST /checkout/quote`):** o servidor revalida preço, estoque, cupom e taxa da rede
   e devolve uma cotação com validade de 5 minutos e a lista de mudanças em relação ao total que o
   usuário viu. Se algo mudou, o diálogo "Os valores mudaram" mostra cada mudança e exige
   confirmação do novo total.
2. **Envio (`POST /orders`):** cada tentativa gera um `Idempotency-Key` (`crypto.randomUUID()`).
   A tentativa (chave, cotação e dados do pedido) fica em `sessionStorage['kurio.checkout.attempt']`.
3. **Clique duplo:** um `ref` bloqueia envios concorrentes e o botão fica desabilitado durante o envio.
4. **Resultado incerto** (timeout, falha de rede ou 5xx): a tentativa é mantida e o erro oferece
   "Tentar novamente", que reenvia **a mesma chave**. O servidor devolve o pedido já criado, se
   existir, sem cobrar de novo.
5. **Recuperação:** se a resposta se perdeu mas o pedido foi liquidado, as linhas compradas saem do
   carrinho. Nesse caso o checkout mostra "Sua compra anterior ainda não foi confirmada" com o
   botão "Verificar compra", que reenvia a tentativa salva (inclusive depois de recarregar a página).
6. **Erros definitivos** (4xx, como cotação expirada ou estoque insuficiente) descartam a tentativa
   e recarregam o carrinho.
7. **Pedido pendente:** a página do pedido acompanha o status pelo evento `order.updated` e, como
   reserva, consulta a API a cada 3 s enquanto o status for `pending`. O `PendingOrderBanner` lista
   pagamentos pendentes em qualquer página. O recibo de confirmação só abre com status
   `confirmed`; pagamentos recusados mostram a tela de falha e liberam as reservas de estoque.

## Tempo real

- `src/lib/realtime/socket.ts` cria um único cliente Socket.IO só com transporte `websocket`
  (o MSW não intercepta o long-polling). `src/app/realtime-sync.tsx` assina os eventos e envia
  `session.identify` com o token, para que `order.updated` chegue só ao dono do pedido.
- **`nft.updated`** atualiza os detalhes do NFT no cache apenas se `version` for maior que a
  atual (eventos fora de ordem são descartados), corrige o preço nas listas e nos favoritos e
  invalida o carrinho, cujos avisos de preço e estoque são calculados pelo servidor. A página de
  detalhes avisa quando o preço muda e limita a quantidade ao novo estoque.
- **`order.updated`** atualiza o status do pedido e invalida pedidos e carrinho.
- O `main.tsx` só importa a aplicação **depois** de iniciar o MSW, porque o `engine.io-client`
  captura o construtor `WebSocket` quando o módulo é avaliado; com import estático, o cliente
  ficaria com o WebSocket nativo e nunca alcançaria o mock.

## API simulada

- **`src/mocks/db.ts`:** banco em `localStorage['kurio.mock-db']` (usuários, sessões com TTL de
  30 minutos, carrinhos, cotações, pedidos, estoque e preços), criado a partir de `src/mocks/data`.
- **`src/mocks/projections.ts`:** cálculo de carrinho, cupom, taxa e avisos, compartilhado pelos
  handlers.
- **`src/mocks/handlers`:** um arquivo por domínio, com latência artificial de 250 ms, erros no
  formato `{ code, message }` e autorização por token. Carrinhos e pedidos são sempre filtrados
  pelo dono da sessão.
- **Pagamento simulado:** `POST /orders` reserva o estoque e cria o pedido como `pending`; após
  2,5 s ele é liquidado como `confirmed` (ou `failed` no cenário `payment-failure`) e o servidor
  emite `order.updated`.
- **`src/mocks/scenarios.ts`** e **`src/mocks/devtools.ts`:** cenários de falha e o objeto
  `window.__kurioMock`, usados manualmente e pelos testes E2E.
- O `main.tsx` testa `import.meta.env.VITE_ENABLE_MOCKS` diretamente, para que um build sem mocks
  descarte todo o código do MSW.

## Acessibilidade e responsividade

- Layouts para 390, 768 e 1440 px. Quando o Figma tem composições diferentes para desktop e mobile,
  as duas versões existem no DOM e uma fica oculta por CSS.
- Diálogos usam Radix (foco preso, Escape, título acessível). Grupos de escolha usam
  `role="radiogroup"`, quantidades têm rótulos por item e mensagens de erro usam `role="alert"`.
- Foco visível global para teclado (`:focus-visible`) e `prefers-reduced-motion` reduzindo
  animações e rolagem suave.

## Testes

Os specs Playwright em `tests/e2e` exercitam a aplicação real contra o MSW, nos projetos desktop e
mobile. `support.ts` cria uma fixture que liga o cenário `no-latency` e oferece helpers de login,
cenários e espera pela conexão do socket. A lista do que cada spec cobre está no README.

O `vite.config.ts` ignora `playwright-report` e `test-results` no watcher: sem isso, o relatório
gravado durante a execução recarregava todas as páginas abertas no meio dos testes.

## Limitações conhecidas

- Não há blockchain, carteira real nem gateway de pagamento. "Ver no Etherscan" apenas avisa que a
  transação é simulada; os botões de login social e "Esqueceu a senha?" mostram um aviso de que
  não estão disponíveis na demonstração.
- O banco simulado vive no `localStorage` do navegador e é carregado quando a aba abre. Mudanças
  feitas em outra aba só aparecem depois de recarregar, e a última aba a gravar prevalece. Outros
  navegadores não veem os dados.
