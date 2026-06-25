# Crash Game — Solução Full-stack

Implementação do desafio técnico [Jungle Gaming](https://github.com/junglegaming/fullstack-challenge): Crash Game multiplayer em tempo real com backend distribuído (NestJS + RabbitMQ) e frontend React.

**Autor:** João Lisboa  
**Repositório:** fork/implementação sobre o template oficial Jungle Gaming

---

## Quick Start

### Pré-requisitos

- [Bun](https://bun.sh) >= 1.x
- Docker & Docker Compose

### Subir tudo

```bash
git clone <seu-repo>
cd fullstack-challenge
bun install
bun run docker:up:build   # primeira vez (build + migrations)
# ou
bun run docker:up         # execuções seguintes
```

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API (Kong)** | http://localhost:8000 |
| **Keycloak** | http://localhost:8080 (admin / admin) |
| **Games Swagger** | http://localhost:4001/docs |
| **Wallets Swagger** | http://localhost:4002/docs |
| **RabbitMQ UI** | http://localhost:15672 (admin / admin) |

### Login de teste

| Campo | Valor |
|-------|-------|
| Usuário | `player` |
| Senha | `player123` |
| Saldo inicial | R$ 1.000,00 (carteira criada automaticamente no startup) |

---

## Arquitetura

```
Frontend (Vite + React)
    │  REST (JWT)          WebSocket (JWT)
    ▼                      ▼
Kong :8000 ──────► Games :4001          Wallets :4002
                      │                      │
                      └──── RabbitMQ ────────┘
                              │
                         PostgreSQL
                              │
                         Keycloak (OIDC)
```

### Bounded contexts

| Serviço | Responsabilidade |
|---------|------------------|
| **Games** | Rodadas, apostas, engine de multiplicador, provably fair, WebSocket |
| **Wallets** | Saldo do jogador, débito/crédito assíncrono |

### Saga via RabbitMQ

1. **Aposta:** Games publica `game.bet.placed` → Wallets debita → `wallet.debit.completed` ou `wallet.debit.failed`
2. **Compensação:** se débito falha, Games remove a aposta e emite `bet:removed` via WebSocket
3. **Cashout:** Games publica `game.cashout.completed` → Wallets credita → `wallet.credit.completed`

Contratos compartilhados em `packages/events`.

### Provably fair

- Hash chain de seeds (`generateSeedChain`, `hashSeed`)
- Crash point determinístico via HMAC-SHA256 + house edge (`crashPointBpsFromSeed`)
- Antes da rodada: apenas `serverSeedHash` exposto
- Após crash: `serverSeed` revelado
- Verificação: `GET /games/rounds/:roundId/verify`

### WebSocket (Games)

Path: `ws://localhost:8000/games/ws` (via Kong) ou direto `:4001/ws`

Eventos: `round:sync`, `round:betting`, `round:running`, `round:tick`, `round:crashed`, `bet:placed`, `bet:activated`, `bet:removed`, `bet:cashed_out`

O frontend usa WebSocket + **polling HTTP** como fallback para garantir sincronização.

---

## Decisões e trade-offs

| Decisão | Motivo |
|---------|--------|
| **Prisma + bigint** | Precisão monetária em centavos inteiros, sem float |
| **Vite + React** (sem Next.js) | SPA pura; jogo não precisa de SSR/SEO |
| **Hooks custom** (sem TanStack Query) | Estado do jogo é majoritariamente tempo real (WS + polling); Query agregaria complexidade sem ganho claro |
| **Componentes custom** (sem shadcn) | UI específica de cassino; Tailwind v4 puro com tema neon |
| **Polling + WebSocket** | Resiliência quando WS cai ou Kong tem latência; UX consistente |
| **Carteira seed no startup** | `WalletBootstrapService` cria carteira do `player` com UUID fixo no Keycloak |
| **Saga otimista na aposta** | Aposta aparece imediatamente; débito confirma async — UX mais responsiva, compensação se falhar |

### Limitações conhecidas

- Cashout não tem compensação se crédito na carteira falhar (aposta já marcada como `CASHED_OUT`)
- Verificação provably fair existe na API, mas sem tela dedicada no frontend
- Teste E2E de crash depende do timing da rodada (timeout até 90s)

---

## Testes

```bash
# Unitários (domínio)
cd services/games && bun test tests/unit      # Round, Bet, Provably Fair
cd services/wallets && bun test tests/unit    # Wallet, use cases

# E2E de API (requer docker:up)
cd services/games && bun test tests/e2e       # fluxos de aposta/cashout/validação
cd services/wallets && bun test tests/e2e     # carteira

# Frontend
cd frontend && bun test                       # helpers de formatação
```

Os testes E2E obtêm JWT via Keycloak (password grant) e chamam a API via Kong.

---

## Estrutura do projeto

```
fullstack-challenge/
├── frontend/           # Vite + React + Tailwind v4 + OIDC
├── services/
│   ├── games/          # Engine, REST, WebSocket, Prisma
│   └── wallets/        # Carteira, consumers RabbitMQ, Prisma
├── packages/events/    # Contratos de mensageria
├── docker/             # Kong, Keycloak realm, Postgres init
└── docker-compose.yml
```

---

## API (via Kong :8000)

### Wallets

| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/wallets` | Sim |
| GET | `/wallets/me` | Sim |

### Games

| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/games/rounds/current` | Não |
| GET | `/games/rounds/history` | Não |
| GET | `/games/rounds/:id/verify` | Não |
| GET | `/games/bets/me` | Sim |
| POST | `/games/bet` | Sim |
| POST | `/games/bet/cashout` | Sim |

---

## Desenvolvimento local (sem Docker nos serviços)

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env

bun run docker:up   # só infra (postgres, rabbitmq, keycloak, kong)

cd services/games && bun run dev    # :4001
cd services/wallets && bun run dev    # :4002
cd frontend && bun run dev            # :5173
```

---

## Enunciado original

Este projeto implementa o desafio descrito em [junglegaming/fullstack-challenge](https://github.com/junglegaming/fullstack-challenge). Consulte o repositório upstream para regras completas do jogo, critérios de avaliação e requisitos detalhados.

---

Boa sorte — e que o multiplicador esteja ao seu favor!
