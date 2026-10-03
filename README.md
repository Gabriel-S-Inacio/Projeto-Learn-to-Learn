# Learn to Learn English

Aplicação de agendamento de aulas experimentais com front-end React, API REST em Express e PostgreSQL. O visual público preserva a referência oficial do projeto, enquanto autenticação, área do aluno e agenda administrativa usam os mesmos tokens e componentes.

## Stack

- React 19, Vite e React Router
- Node.js, Express e TypeScript
- PostgreSQL e Drizzle ORM
- Zod, bcrypt e sessões opacas em cookie `HttpOnly`
- Vitest e Supertest
- Docker Compose

## Configuração

Copie `.env.example` para `.env` e troque os valores de segurança:

```bash
cp .env.example .env
```

Variáveis principais:

- `VITE_API_URL`: URL pública da API para o front-end.
- `DATABASE_URL`: conexão PostgreSQL usada pela API, migrations e seed.
- `AUTH_SECRET`: segredo de pelo menos 32 caracteres usado no hash das sessões.
- `FRONTEND_ORIGIN`: origem autorizada pelo CORS.
- `SESSION_COOKIE_SECURE`: use `false` apenas em desenvolvimento HTTP e `true` em produção HTTPS.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: conta administrativa criada pelo seed; não existe cadastro público de ADMIN.

## Configurando o usuário administrador

Crie o arquivo local de ambiente a partir do exemplo:

```bash
cp .env.example .env
```

Defina credenciais exclusivamente locais no `.env` (sem versioná-las):

```ini
ADMIN_NAME=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

Com o PostgreSQL disponível e as migrations aplicadas, execute o seed pelo backend:

```bash
cd backend
npm run db:seed:admin
```

No fluxo com Docker, configure primeiro o `.env` da raiz e execute:

```bash
docker compose up -d
docker compose exec backend npm run db:seed:admin
```

O comando é idempotente: cria o ADMIN quando o e-mail ainda não existe e, quando ele já pertence a um ADMIN, sincroniza explicitamente o nome e a senha com os valores do `.env`. Ele recusa um e-mail já pertencente a um STUDENT e nunca altera essa role. Já o seed automático da inicialização do container apenas cria a conta ausente; em ambientes de produção ele não sobrescreve silenciosamente credenciais administrativas existentes.

Depois, acesse `http://localhost:5173/login`. STUDENT e ADMIN utilizam a mesma tela de login; a `role` da conta determina as áreas autorizadas. As páginas administrativas são:

- `/admin/agenda`
- `/admin/leads`

Nenhum endpoint público cria contas ADMIN. O seed valida todas as variáveis obrigatórias e não registra senha nem hash no terminal.

## Execução com Docker

Suba PostgreSQL e API:

```bash
docker compose up --build -d backend
```

A API fica em `http://localhost:3001/api` e aplica migrations e seed antes do servidor iniciar. O healthcheck está em `GET /api/health`.

Execute a suíte isolada de integração:

```bash
docker compose --profile test up --build --abort-on-container-exit --exit-code-from backend-test backend-test
```

O profile de testes usa um PostgreSQL temporário próprio (`postgres-test`, com `tmpfs`) e nunca executa `TRUNCATE` no banco persistente de desenvolvimento.

## Execução local

Front-end:

```bash
npm install
npm run dev
```

Backend, com PostgreSQL disponível e `backend/.env` configurado:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed:admin
npm run dev
```

Builds:

```bash
npm run build
cd backend && npm run build
```

## Rotas do front-end

- `/`, `/metodo`, `/como-funciona`, `/conteudos`, `/sobre`
- `/agendar`: agenda pública e reserva autenticada
- `/cadastro` e `/login`
- `/minhas-aulas`: cancelamento e remarcação do próprio aluno
- `/admin/agenda`: criação e gestão de horários, protegida por role
- `/admin/leads`: leads, filtros, funil e métricas de conversão, protegida por role ADMIN
- `/404` e fallback

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/schedule/available`
- `POST /api/bookings`, `GET /api/bookings/me`
- `DELETE /api/bookings/:id`, `PATCH /api/bookings/:id/reschedule`
- `GET /api/admin/schedule`, `POST /api/admin/schedule`, `PATCH /api/admin/schedule/:id`
- `POST /api/leads`
- `POST /api/analytics/events`
- `GET /api/admin/leads`, `GET /api/admin/leads/metrics`, `PATCH /api/admin/leads/:id/status`

Reservas e remarcações usam transações e updates condicionais no PostgreSQL. Um slot aceita uma única reserva, e cancelamento/remarcação pelo aluno exige antecedência mínima de 24 horas.

## Banco de dados

A migration inicial cria:

- `users`
- `auth_sessions`
- `lesson_slots`
- `lesson_bookings`
- `leads`
- `analytics_events`
- `schema_migrations`

Ela também define roles, estados da agenda, chaves estrangeiras, índices, unicidade de e-mail/horário/reserva e limites de duração.

## Validação

A suíte de integração cobre autenticação, autorização, agenda pública, privacidade, reserva concorrente, cancelamento, limite de 24 horas, remarcação atômica/concorrente, leads, atribuição, analytics, conversão manual, métricas e áreas administrativas. A auditoria de retomada está em [`docs/implementation-audit.md`](docs/implementation-audit.md), e as decisões do Ciclo 2 estão em [`docs/cycle-2-leads-analytics.md`](docs/cycle-2-leads-analytics.md).
