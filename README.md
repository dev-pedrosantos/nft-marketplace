# NFT Marketplace — Frontend Challenge

Aplicação React + TypeScript baseada no design do desafio no Figma
([Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge)).

> **Status:** apenas a infraestrutura está configurada. As telas do marketplace ainda
> não foram implementadas; a rota `/` renderiza um placeholder vazio.

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
| Componentes | shadcn/ui (estilo `radix-nova`) | CLI 4 |
| Mock de API | MSW + `@mswjs/socket.io-binding` | 2.15 / 0.2 |
| Testes E2E | Playwright | 1.64 |

> O MSW está fixado na linha 2.x porque o `@mswjs/socket.io-binding` (simulação do Socket.IO)
> só é compatível com `msw@^2.10.2`.

## Requisitos

- Node.js **22.12+** (testado com Node 24)
- npm 10+

## Instalação

```bash
npm install
cp .env.example .env.local   # opcional: só se quiser sobrescrever os valores padrão
```

## Execução

```bash
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm run build     # typecheck + build de produção em dist/
npm run preview   # serve o build de produção localmente
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL da API REST usada pelo Axios. |
| `VITE_SOCKET_URL` | origem da aplicação | URL do servidor Socket.IO. |
| `VITE_ENABLE_MOCKS` | `false` | `true` inicia o MSW antes de renderizar a aplicação. |

O arquivo `.env.development` (versionado) já ativa os mocks em `npm run dev`.
Para sobrescrever localmente, crie `.env.development.local` (ignorado pelo git).

## Mocks da API (MSW)

### Como ativar / desativar

- **Ativar:** `VITE_ENABLE_MOCKS=true` (padrão em desenvolvimento via `.env.development`).
- **Desativar** (para usar uma API real):

  ```bash
  # .env.development.local
  VITE_ENABLE_MOCKS=false
  VITE_API_URL=https://sua-api.exemplo.com
  VITE_SOCKET_URL=https://seu-socket.exemplo.com
  ```

- **Build de produção com mocks** (ex.: deploy de demonstração sem backend):

  ```bash
  VITE_ENABLE_MOCKS=true npm run build
  ```

Com os mocks ativos, o console do navegador exibe `[MSW] Mocking enabled.` e o
service worker `mockServiceWorker.js` passa a controlar a página.

### Onde ficam

```
src/mocks/
├── browser.ts          # setupWorker + startMockWorker()
├── data/               # fixtures (respostas simuladas)
└── handlers/
    ├── index.ts        # agrega todos os handlers
    ├── http.ts         # handlers REST (http.get/post/...)
    └── socket.ts       # servidor Socket.IO simulado (ws.link + toSocketIo)
```

- Dados simulados ficam **somente** em `src/mocks/data`; nunca dentro de componentes.
- Requisições para `VITE_API_URL` sem handler geram um aviso no console.
- O worker (`public/mockServiceWorker.js`) é gerado pelo MSW. Após atualizar o `msw`,
  regenere com `npx msw init public`.

### Endpoints simulados

| Método | Rota (relativa a `VITE_API_URL`) | Usado em |
| --- | --- | --- |
| GET | `/nfts?tab&page&collection&network&minPrice&maxPrice&search` | Grade de NFTs da Home |
| GET | `/nfts/featured` | Banner "NFT em destaque" |
| GET | `/catalog/filters` | Filtros (coleções, faixa de preço, redes) |
| GET | `/promotions` | Cards promocionais |
| GET | `/posts?limit` | Diário da Cunhagem (blog) |
| GET | `/cart/summary` | Contador do carrinho no header |
| POST | `/newsletter/subscriptions` | Formulário de newsletter |

No mock de `/nfts`, apenas `page` e `search` alteram o resultado: o Figma não define quais
NFTs pertencem a cada aba, coleção, rede ou faixa de preço. Os demais parâmetros são
enviados e ficam na URL, prontos para uma API real.

### Socket.IO simulado

- O cliente (`src/lib/realtime/socket.ts`) usa **apenas o transporte `websocket`**, porque o MSW
  não intercepta o long-polling HTTP do Socket.IO.
- O handler responde ao handshake do Engine.IO/Socket.IO e envia pings periódicos para manter a
  conexão estável. Nenhum evento de negócio está simulado ainda: os eventos serão adicionados
  em `src/mocks/handlers/socket.ts` e tipados em `src/lib/realtime/events.ts` quando o contrato
  de tempo real for definido.
- Em desenvolvimento, `VITE_SOCKET_URL` precisa ter **origem diferente** do servidor Vite
  (padrão `http://localhost:3001`). O MSW intercepta a conexão antes de ela chegar à rede, então
  nenhum servidor precisa estar rodando nesse endereço. Usar a mesma origem do Vite faria o mock
  capturar também o WebSocket de HMR do Vite.

## Testes

```bash
npm run test:e2e:install   # baixa o Chromium do Playwright (uma vez)
npm run test:e2e           # roda os testes E2E (desktop + mobile)
npm run test:e2e:ui        # modo interativo
npm run test:e2e:headed    # com o navegador visível
npm run test:e2e:report    # abre o último relatório HTML
```

- Os testes ficam em `tests/e2e`. O Playwright sobe o `npm run dev` automaticamente (ou reutiliza
  um servidor já aberto na porta 5173), com os mocks ativos.
- Projetos configurados: `desktop` (Desktop Chrome) e `mobile` (Pixel 7), ambos com Chromium.
- **Linux / WSL:** o Chromium precisa de bibliotecas do sistema. Se aparecer
  `error while loading shared libraries: libnspr4.so`, instale-as uma vez:

  ```bash
  sudo npx playwright install-deps chromium
  ```

### Verificações de qualidade

```bash
npm run typecheck   # tsc -b (app, config do Vite e testes)
npm run lint        # ESLint
npm run check       # typecheck + lint + testes E2E
```

## Estrutura do projeto

```
src/
├── app/                 # composição da aplicação: QueryClient, router, devtools
├── components/ui/       # componentes shadcn/ui (gerados pelo CLI)
├── config/env.ts        # leitura tipada das variáveis de ambiente
├── features/            # módulos por funcionalidade (ver convenção abaixo)
├── lib/
│   ├── api/             # cliente Axios e normalização de erros (ApiError)
│   ├── realtime/        # cliente Socket.IO, contrato de eventos e hook de conexão
│   └── utils.ts         # utilitário `cn` (shadcn)
├── mocks/               # MSW: handlers REST/Socket.IO e fixtures
├── pages/               # componentes de página, compostos a partir das features
├── routes/              # rotas do TanStack Router (arquivos finos que apontam para pages)
├── types/               # tipos compartilhados entre features
├── routeTree.gen.ts     # gerado automaticamente pelo TanStack Router (não editar)
├── App.tsx              # providers (QueryClient + Router)
└── main.tsx             # entrada: ativa o MSW (se habilitado) e renderiza
tests/
└── e2e/                 # testes Playwright
```

### Convenção para funcionalidades

Cada funcionalidade identificada no design ganha uma pasta em `src/features/<nome>/`:

```
src/features/<nome>/
├── api/          # funções de acesso à API (usam apiClient) e query options do TanStack Query
├── components/   # componentes específicos da funcionalidade
├── hooks/        # hooks específicos
└── types.ts      # tipos do domínio
```

Os handlers MSW correspondentes ficam em `src/mocks/handlers/` e as fixtures em `src/mocks/data/`.

### Adicionando componentes shadcn/ui

```bash
npx shadcn@latest add <componente>
```

Os componentes são gerados em `src/components/ui`. O tema (cores, raio, fontes) em
`src/index.css` ainda é o padrão do shadcn e será substituído pelos tokens do Figma.

## Roteamento

As rotas são definidas por arquivo em `src/routes`. O plugin do Vite regenera
`src/routeTree.gen.ts` automaticamente durante `dev` e `build`. O contexto do router expõe o
`queryClient` para uso em `loader`s (`context.queryClient.ensureQueryData(...)`).
