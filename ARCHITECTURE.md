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
- O rodapé usa as medidas fixas do frame desktop só a partir de 1440 px (breakpoint `wide`, em
  `index.css`). Entre 1024 e 1439 px ele usa a grade do tablet; com as medidas do Figma, títulos se
  sobrepunham e os links vazavam do rodapé a 1280 px.
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

`visual.spec.ts` compara capturas de página inteira de Início, Detalhe, Carrinho e Pagamento nos
dois projetos com as baselines versionadas em `tests/e2e/visual.spec.ts-snapshots/`. Para os
dados serem estáveis, o teste parte do banco inicial sem latência, fixa o relógio do navegador,
força o carregamento das imagens lazy, espera as fontes e desliga animações. `visual.css` esconde os
botões das devtools, que só existem no servidor de desenvolvimento usado pelos testes. As
baselines têm sufixo `-linux` porque a renderização de fontes muda entre sistemas operacionais.

## Performance e Lighthouse

`npm run lighthouse` gera o build de demonstração (`build:demo`, com MSW e o cenário padrão de
mocks, incluindo a latência de 250 ms), serve com `vite preview` e audita Início e Detalhe três
vezes em cada perfil. A configuração está em `lighthouse/config.mjs`: perfil mobile padrão do
Lighthouse (Moto G Power, 4G lento, CPU 4x mais lenta) e perfil desktop padrão, ambos com
throttling simulado. O script grava os relatórios HTML/JSON de cada execução em
`lighthouse/reports/`, e as medianas, o ambiente e as versões em `lighthouse/summary.md` e
`lighthouse/summary.json`. O Chrome é iniciado pelo próprio script (o `chrome-launcher` não
funciona no WSL) com o Chromium do Playwright, ou com `CHROME_PATH`.

Desktop fica em 99–100 em todas as categorias. No mobile, Accessibility, Best Practices e SEO estão
na meta; Performance fica abaixo de 90 (mediana em `lighthouse/summary.md`), com CLS ~0 e LCP
entre 3,2 e 3,4 s.

**Causa:** sem SSR, a primeira pintura depende de baixar e executar a cadeia de JavaScript na CPU
simulada 4x mais lenta: entrada (React) → chunk do MSW (173 KB gzip) → registro do service worker →
chunk do app. A ordem é obrigatória: o app só pode ser avaliado depois que o MSW intercepta o
`WebSocket`, porque o `engine.io-client` captura o construtor ao carregar. No navegador sem
throttling, o primeiro conteúdo e o LCP aparecem por volta de 350 ms.

**O que foi feito:**

- Skeleton do catálogo com as dimensões dos cards: o CLS da Início mobile caiu de 0,50 para 0.
- `meta description` e `robots.txt`: SEO de 83 para 100.
- Início e Detalhe saem no chunk do app em vez de chunks de rota (`splitBehavior` no
  `vite.config.ts`), o que elimina uma ida e volta de rede antes da primeira pintura: Performance
  mobile da Início de ~86 para ~87–89.
- As artes dos NFTs passaram de PNG 1254 px (~1,9 MB cada) para WebP 800 px (~45 KB). O LCP
  simulado não mudou, mas o download caiu de 7,8 MB para 175 KB.
- `fetchPriority="high"` na imagem principal do Detalhe, que é o LCP da página.

**O que não foi feito:**

- `modulepreload` do MSW e do app no HTML: as duas cargas passam a disputar banda com o CSS e a
  entrada, e o FCP mobile piorou de 2,2 para 3,3 s.
- Remover o MSW, adiar a interceptação do socket ou prerenderizar o HTML só para a auditoria.

## Desvios do Figma e decisões de UX

- O visitante começa com o carrinho vazio, então o contador "6" do header do Figma só aparece com itens.
- O checkout vem preenchido com a carteira principal (o Figma mostra os campos vazios) e o provedor
  de pagamento começa sem seleção (o Figma mostra Coinbase marcado), para que a escolha seja explícita.
- No checkout, o nome ENS tem um campo de texto além do seletor `.eth` do Figma, porque a validação exige o nome.
- No carrinho mobile, o Figma mostra a lixeira em um único item, sobreposta ao botão "+"; no app ela
  fica no canto de cada item, sem cobrir o controle de quantidade.
- Os frames de Perfil e Carteiras do Figma terminam sem rodapé; no app essas telas usam o mesmo
  rodapé das demais páginas.
- O Figma não tem frame mobile da confirmação; em telas estreitas o recibo empilha quantidade e
  subtotal e deixa os nomes quebrarem linha.
- "Ver no Etherscan" no recibo apenas avisa que a transação é simulada.
- O Figma não define destinos para o rodapé. No app, "Meu perfil", "Atividade" e "Lista de
  interesse" levam às telas da conta, e as coleções filtram o catálogo da página inicial
  (`/?collection=<id>#catalogo`). Os ícones de redes sociais não são links, porque a marca não
  tem perfis oficiais.
- Itens do header e do rodapé sem tela correspondente ("Criadores", "Aprenda", "Minha coleção",
  "Estúdio do criador" e a coluna "Central de ajuda") abrem, no clique, um aviso "Em breve"
  (`src/components/coming-soon.tsx`), construído sobre o diálogo compartilhado.
- As artes dos NFTs são as imagens exportadas do Figma, convertidas de PNG 1254 px para WebP 800 px
  (o maior uso é 404 px no detalhe desktop, então 800 px cobrem telas 2x).

## Limitações conhecidas

- Não há blockchain, carteira real nem gateway de pagamento. "Ver no Etherscan" apenas avisa que a
  transação é simulada; os botões de login social e "Esqueceu a senha?" mostram um aviso de que
  não estão disponíveis na demonstração.
- O banco simulado vive no `localStorage` do navegador e é carregado quando a aba abre. Mudanças
  feitas em outra aba só aparecem depois de recarregar, e a última aba a gravar prevalece. Outros
  navegadores não veem os dados.
