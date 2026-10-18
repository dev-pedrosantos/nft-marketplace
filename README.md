# Kurio — NFT Marketplace (Frontend Challenge)

Marketplace de NFTs em React + TypeScript construído a partir do design do desafio no Figma
([Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge)).
Não há backend real: a API REST e o Socket.IO são simulados no navegador pelo MSW, com estado
persistido no `localStorage`. **Não existe blockchain nem pagamento real**: a compra é simulada e o
resultado depende apenas da resposta da API mockada.

A arquitetura (camadas, cache, sessão, checkout idempotente, tempo real, mocks, performance),
os desvios do Figma e as limitações estão em [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Telas e funcionalidades

| Rota | Tela | Destaques |
| --- | --- | --- |
| `/` | Home e catálogo | Busca, abas, filtros (coleção, rede, faixa de preço), ordenação e paginação, todos refletidos na URL |
| `/nfts/:nftId` | Detalhes | Galeria, edição (1/1, 1/10, 1/50, aberta), quantidade limitada ao estoque, favoritos, compra e preço/estoque em tempo real |
| `/carrinho` | Carrinho | Persistência no servidor (visitante e usuário), cupons, totais calculados pela API, avisos de preço/estoque alterados |
| `/checkout` | Pagamento | Dados do colecionador, carteira principal/secundária, rede, conexão simulada do provedor (WalletConnect, MetaMask, Coinbase) com recusa e desconexão, revisão de valores e envio idempotente |
| `/pedidos/:orderId` | Pedido e confirmação | Pendente, recusado ou confirmado; o recibo de confirmação só abre quando o pagamento é confirmado |
| `/conta/perfil` · `/conta/carteiras` · `/conta/favoritos` · `/conta/pedidos` | Conta | Perfil com avatar, senha, carteiras, favoritos e histórico de pedidos |
| `?auth=login` · `?auth=signup` | Login e cadastro | Diálogo sobre qualquer tela, validação, sessão persistida, logout e sessão expirada |

`/checkout`, `/pedidos/*` e `/conta/*` são rotas privadas: sem sessão, o usuário vai para o login
e volta à página pedida depois de entrar. Qualquer outro endereço mostra "Página não encontrada",
com link para o início.

## Stack

| Área | Biblioteca | Versão |
| --- | --- | --- |
| UI | React | 19 |
| Build / dev server | Vite | 8 |
| Linguagem | TypeScript | 6 |
| Roteamento | TanStack Router (rotas por arquivo) | 1.170 |
| Estado de servidor | TanStack Query | 5 |
| HTTP (REST) | Axios | 1.20 |
| Tempo real | Socket.IO Client | 4.8 |
| Estilos | Tailwind CSS (plugin Vite) | 4 |
| Componentes | shadcn/ui + Radix | CLI 4 |
| Mock de API | MSW + `@mswjs/socket.io-binding` | 2.15 / 0.2 |
| Testes E2E e regressão visual | Playwright | 1.64 |
| Auditoria de performance | Lighthouse | 13.5 |

> O MSW está fixado na linha 2.x porque o `@mswjs/socket.io-binding` só é compatível com
> `msw@^2.10.2`.

## Requisitos

- Node.js **22.12+** (testado com Node 24)
- npm 10+

## Instalação e execução

```bash
npm install
npm run dev          # http://localhost:5173, com os mocks ativos
npm run build        # typecheck + build de produção em dist/, sem mocks
npm run build:demo   # typecheck + build de demonstração em dist/, com os mocks (usado no deploy)
npm run preview      # serve o conteúdo de dist/
npm run lighthouse   # build:demo + auditoria Lighthouse (ver "Performance")
```

### Contas de demonstração

| E-mail | Senha | Observação |
| --- | --- | --- |
| `colecionador@kurio.com` | `kurio123` | Nova Sato: carrinho com 3 itens (total 26.846 ETH), duas carteiras |
| `ana@kurio.com` | `kurio123` | Outra conta, usada para verificar o isolamento de dados |

Também é possível criar uma conta pelo cadastro. Cupons disponíveis: `KURIO10` (10%),
`LANCAMENTO` (0,5 ETH acima de 5 ETH) e `EXPIRADO` (sempre recusado).

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL da API REST usada pelo Axios. |
| `VITE_SOCKET_URL` | origem da aplicação | URL do servidor Socket.IO. |
| `VITE_ENABLE_MOCKS` | `false` | `true` inicia o MSW antes de renderizar a aplicação. |

O `.env.development` (versionado) ativa os mocks em `npm run dev` e define
`VITE_SOCKET_URL=http://localhost:3001`. Para sobrescrever localmente, crie
`.env.development.local` (ignorado pelo git).

## API simulada (MSW)

- **Ativar:** `VITE_ENABLE_MOCKS=true` (padrão em desenvolvimento).
- **Desativar** para usar uma API real:

  ```bash
  # .env.development.local
  VITE_ENABLE_MOCKS=false
  VITE_API_URL=https://sua-api.exemplo.com
  VITE_SOCKET_URL=https://seu-socket.exemplo.com
  ```

- **Build de demonstração com mocks:** `npm run build:demo` (modo `demo`, variáveis em `.env.demo`).

O "banco" simulado fica em `localStorage['kurio.mock-db']` e sobrevive a recarregamentos. Para
voltar aos dados iniciais, rode `__kurioMock.reset()` no console ou limpe o `localStorage`.

### Endpoints

| Domínio | Endpoints |
| --- | --- |
| Autenticação | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me` |
| Catálogo | `GET /nfts?tab&sort&page&search&collection&network&minPrice&maxPrice` (sem `collection`, vale a primeira coleção; a busca ignora a coleção), `GET /nfts/featured`, `GET /nfts/:id`, `GET /nfts/:id/related`, `GET /catalog/filters` |
| Carrinho | `GET /cart?network`, `GET /cart/summary`, `POST /cart/items`, `PATCH /cart/items/:lineId`, `DELETE /cart/items/:lineId`, `POST /cart/items/:lineId/accept-price`, `POST /cart/coupon`, `DELETE /cart/coupon` |
| Checkout e pedidos | `POST /checkout/quote`, `POST /orders` (exige `Idempotency-Key` e carteira conectada), `GET /orders`, `GET /orders/:id` |
| Conta | `PUT /me/profile`, `PUT /me/password`, `PUT /me/avatar`, `DELETE /me/avatar`, `GET/POST /me/wallets`, `PUT/DELETE /me/wallets/:id`, `GET/POST/DELETE /me/wallet-connection`, `GET /me/favorites`, `PUT/DELETE /me/favorites/:nftId` |
| Conteúdo | `GET /promotions`, `GET /posts`, `POST /newsletter/subscriptions` |

Rotas autenticadas usam `Authorization: Bearer <token>`. O carrinho de visitante é identificado
por `X-Guest-Id` e é mesclado ao carrinho da conta no login.

### Eventos Socket.IO

| Evento | Direção | Conteúdo |
| --- | --- | --- |
| `nft.updated` | servidor → cliente | Preço e estoque por edição, com `version` |
| `order.updated` | servidor → cliente | Criação e mudança de status de um pedido, com `version`; só chega ao dono da sessão |
| `session.identify` | cliente → servidor | Associa a conexão ao token da sessão |

Todo evento do servidor leva `eventId` (repetido quando o evento é reentregue) e `occurredAt`.

### Cenários de falha

Ative pelo console (`__kurioMock.enable('<cenário>')`) ou gravando uma lista separada por
vírgulas em `localStorage['kurio.mock.scenarios']` antes de carregar a página.

| Cenário | Efeito |
| --- | --- |
| `payment-failure` | Os pagamentos são recusados |
| `payment-timeout` | O pagamento fica pendente por 45 s antes de confirmar |
| `price-change` | A próxima revisão de valores aumenta o preço do primeiro item (uso único) |
| `out-of-stock` | A próxima revisão esgota o primeiro item (uso único) |
| `slow-order` | A próxima criação de pedido responde depois do timeout do cliente; o pedido é criado mesmo assim (uso único) |
| `server-error` | A próxima criação de pedido falha com 503 (uso único) |
| `live-market` | Publica mudanças aleatórias de preço e estoque a cada poucos segundos |
| `no-latency` | Remove a latência artificial de 250 ms |
| `variable-latency` | Cada requisição espera entre 300 e 1500 ms |
| `out-of-order` | Uma requisição que chega enquanto outras esperam responde 500 ms antes delas, então as respostas voltam fora de ordem |
| `offline` | As requisições falham como se não houvesse rede e o socket cai e não reconecta enquanto o cenário estiver ligado |
| `http-500` | Toda requisição à API responde 500 |
| `http-429` | Toda requisição à API responde 429 com `Retry-After` |
| `favorites-failure` | Adicionar ou remover favoritos falha com 500 |
| `unreliable-events` | Cada evento em tempo real chega duas vezes, seguido do evento anterior do mesmo item |
| `wallet-rejected` | A carteira recusa os pedidos de conexão |

Outros utilitários do console: `__kurioMock.active()`, `disable(cenário)`, `reset()`,
`expireSessions()`, `setPrice(nftId, '1.50')`, `setAvailability(nftId, '1-10', 0)`,
`realtimeClients()` e `redeliverEvent(eventId)` (reenvia um evento já publicado, com o mesmo id).

## Build de produção e deploy

- `npm run build` gera um build **sem mocks**: o MSW fica fora do bundle e o app espera uma API real
  em `VITE_API_URL`.
- `npm run build:demo` gera o build de demonstração: lê `.env.demo` (mocks ligados, socket na
  própria origem) e inclui o MSW. O service worker (`mockServiceWorker.js`, copiado de `public/`)
  precisa ser servido na raiz do site.
- As rotas são do lado do cliente: o host precisa responder `index.html` para qualquer caminho
  desconhecido (fallback de SPA). Sem isso, recarregar `/carrinho` ou `/nfts/:id` retorna 404.
  O `npm run preview` já faz esse fallback e serve para conferir o build localmente.

**Vercel:** o `vercel.json` já define `npm ci`, `npm run build:demo`, a saída `dist/`, o fallback
de SPA (arquivos estáticos têm precedência sobre o rewrite) e cache longo para `/assets`. Basta
importar o repositório na Vercel (ou rodar `npx vercel --prod`); nenhuma variável de ambiente
precisa ser configurada no painel.

## Testes

```bash
npm run test:e2e:install   # baixa o Chromium do Playwright (uma vez)
npm run test:e2e           # roda os testes E2E (desktop + mobile)
npm run test:e2e:ui        # modo interativo
npm run test:e2e:report    # abre o último relatório HTML
```

Os specs ficam em `tests/e2e` e rodam nos projetos `desktop` (Desktop Chrome) e `mobile`
(Pixel 7). O Playwright sobe o `npm run dev` ou reutiliza um servidor já aberto na porta 5173.
Cada teste usa um contexto novo do navegador, então o banco simulado começa sempre dos dados
iniciais, com o cenário `no-latency` ligado.

| Spec | Cobertura |
| --- | --- |
| `catalog.spec.ts` | Busca, estado vazio, ordenação por preço, paginação, abas na URL e filtros combinados (coleção, rede e preço) conferidos contra a API, com volta à página 1 ao filtrar, refresh e voltar/avançar do navegador; drawer de filtros no mobile e a 768 px, com foco preso, Esc, foco devolvido ao botão e escolhas mantidas ao reabrir |
| `details.spec.ts` | Edição, limite de quantidade pelo estoque, compra, edição esgotada, NFT inexistente, favoritos com login, rollback quando favoritar falha, preço e estoque via socket, eventos duplicados e fora de ordem, reconciliação após reconexão |
| `auth.spec.ts` | Validação, credenciais inválidas, sessão após reload, logout, rota privada, sessão expirada, cadastro, conflito de e-mail e usuário no cadastro, troca de senha (senha atual conferida, só a nova vale no login, banco sem a senha em texto) e isolamento entre usuários |
| `account.spec.ts` | Perfil com erros de validação associados aos campos, conflito de usuário vindo da API e persistência; avatar com arquivo inválido, envio, persistência e remoção; carteiras principal e secundária com validação, falha 500 sem perder os dados e persistência; cancelar a remoção devolve o foco ao botão; validação da carteira direto na API |
| `responsive.spec.ts` | Sem rolagem horizontal em 320, 390, 768 e 1440 px nas telas públicas, da conta e do pagamento |
| `not-found.spec.ts` | Página não encontrada em endereço desconhecido, inclusive dentro de `/conta`, com volta ao início |
| `cart.spec.ts` | Totais, cupons válidos/inválidos/expirados, quantidade, remoção, persistência, carrinho de visitante até o checkout e preço alterado pelo socket com o carrinho aberto (aviso, resumo atualizado e finalização bloqueada até aceitar) |
| `checkout.spec.ts` | Compra com clique duplo sem pedido duplicado, pagamento recusado, mudança de preço, preço alterado pelo socket no checkout (nova revisão e cotação antiga recusada), sessão expirada no checkout com retomada dos dados preenchidos, rascunho descartado no logout, timeout com recuperação idempotente, erro 503 com nova tentativa, conexão da carteira (recusa, nova tentativa, persistência, troca e desconexão) e, direto na API, pedido sem carteira, chave reutilizada com outro conteúdo (409) e requisições simultâneas com a mesma chave |
| `orders-realtime.spec.ts` | `order.updated` recebido pelo socket do dono com versão, evento atrasado ou repetido sem tirar o pedido do status final, evento de outro usuário não entregue à sessão atual, confirmação perdida com a conexão fora do ar recuperada ao reconectar, recibo que não muda quando o catálogo muda, banner de pagamento pendente após sair da página e recarregar |
| `api-scenarios.spec.ts` | Offline com recuperação automática quando a conexão volta, erro 500 com novas tentativas automáticas e botão de nova tentativa, erro 429 sem repetição, respostas fora de ordem e skeleton com latência variável |
| `accessibility.spec.ts` | Foco preso no diálogo, Escape, foco visível e `prefers-reduced-motion` |
| `footer.spec.ts` | Coleções do rodapé filtrando o catálogo, links da conta com e sem sessão, e-mail e telefone |
| `coming-soon.spec.ts` | Aviso "Em breve" nos itens sem destino do header e do rodapé: abre no clique (não no hover), fecha pelo X, por Esc e clicando fora, fica centralizado e devolve o foco |
| `smoke.spec.ts` | Montagem da aplicação, service worker do MSW e conexão Socket.IO |
| `visual.spec.ts` | Regressão visual de página inteira de Início, Detalhe, Carrinho e Pagamento, com baselines versionadas |

**Regressão visual:** as baselines ficam em `tests/e2e/visual.spec.ts-snapshots/` e foram geradas
no Linux (Chromium do Playwright). Depois de uma mudança visual intencional, atualize com
`npx playwright test tests/e2e/visual.spec.ts --update-snapshots` e revise as imagens no diff.

**Relatório e traces:** cada execução gera o relatório HTML em `playwright-report/`
(`npm run test:e2e:report`). Testes que falham guardam trace e captura em `test-results/`; abra o
trace com `npx playwright show-trace <arquivo>.zip`.

Seis testes rodam só no `desktop`: os itens "Em breve" do header (o header não existe no layout
mobile do Figma), os filtros combinados pela coluna lateral (que só aparece a partir de 1024 px; no
mobile os mesmos filtros são testados pelo drawer), o foco visível por Tab (cenário de teclado
físico), o hover sem abrir o aviso (não há hover em toque) e os dois testes de overflow, que já
percorrem as larguras de 320 a 1440 px. Todo o resto roda nos dois projetos.

**Linux / WSL:** o Chromium precisa de bibliotecas do sistema. Se aparecer
`error while loading shared libraries: libnspr4.so`, instale-as:

```bash
sudo npx playwright install-deps chromium
```

Sem `sudo`, dá para extrair os pacotes localmente e apontar o `LD_LIBRARY_PATH` para eles
(a pasta `.playwright-libs` já está no `.gitignore`):

```bash
mkdir -p .playwright-libs/debs && cd .playwright-libs/debs
apt-get download libnspr4 libnss3 libasound2t64
for deb in *.deb; do dpkg -x "$deb" ..; done
cd ../..
export LD_LIBRARY_PATH=$PWD/.playwright-libs/usr/lib/x86_64-linux-gnu
npm run test:e2e
```

### Verificações de qualidade

```bash
npm run typecheck   # tsc -b (app, config do Vite e testes)
npm run lint        # ESLint
npm run check       # typecheck + lint + testes E2E
```

### Performance (Lighthouse)

```bash
npm run lighthouse
```

Gera o build de demonstração, serve com `vite preview` e audita Início e Detalhe três vezes nos
perfis mobile e desktop. A configuração versionada fica em `lighthouse/config.mjs`; os relatórios
HTML/JSON de cada execução vão para `lighthouse/reports/`, e as medianas por categoria, LCP, CLS,
TBT, versões e ambiente vão para [`lighthouse/summary.md`](lighthouse/summary.md) e
`lighthouse/summary.json`. O Chrome usado é o Chromium do Playwright (ou `CHROME_PATH`). A análise
dos resultados abaixo da meta está em `ARCHITECTURE.md`.

## Estrutura do projeto

```
src/
├── app/            # QueryClient, router, sincronização de sessão e de tempo real
├── assets/         # imagens e ícones exportados do Figma
├── components/     # layout (header, page shell, tab bar) e UI compartilhada (diálogo, formulários, estados)
├── config/env.ts   # leitura tipada das variáveis de ambiente
├── features/       # domínios: auth, cart, orders, nfts, wallets, favorites, profile, account...
├── lib/            # cliente HTTP e erros, Socket.IO, dinheiro em decimal, formatação, validação, formulários
├── mocks/          # MSW: handlers REST, Socket.IO, banco persistido, cenários e utilitários de console
├── pages/          # telas compostas a partir das features
├── routes/         # rotas do TanStack Router (arquivos finos que apontam para pages)
└── main.tsx        # entrada: inicia o MSW e só então carrega a aplicação
tests/e2e/          # specs Playwright, helpers (support.ts) e baselines visuais
lighthouse/         # configuração, relatórios e medianas da auditoria Lighthouse
scripts/            # script da auditoria Lighthouse
ARCHITECTURE.md     # arquitetura, desvios do Figma e limitações
vercel.json         # deploy na Vercel (build de demonstração + fallback de SPA)
```
