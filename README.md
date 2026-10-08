# Learn to Learn English

MVP de uma plataforma de inglês que cobre a jornada do visitante ao aluno: captação de lead, cadastro, aula experimental, conversão comercial, aulas regulares e histórico. O projeto possui frontend público e autenticado, API REST, painel administrativo, persistência PostgreSQL, notificações e controles de segurança e privacidade.

## Stack

- React 19 e React Router
- Vite
- Express
- TypeScript no backend
- PostgreSQL
- Drizzle ORM
- Docker e Docker Compose
- Zod, bcrypt, Vitest e Supertest

## Funcionalidades implementadas

- Cadastro e login com papéis `STUDENT` e `ADMIN`.
- Proteção de cadastro e login com Cloudflare Turnstile e validação no backend.
- Agenda pública de aulas experimentais.
- Reserva, cancelamento e remarcação pelo aluno, com proteção transacional de horários.
- Área “Minhas Aulas”, próximas aulas e histórico de aulas concluídas.
- Aulas `TRIAL` e `REGULAR`; aulas regulares são atribuídas pelo ADMIN somente a alunos convertidos.
- Agenda administrativa para criar horários, concluir aulas e visualizar alunos associados.
- Captação e deduplicação de leads, atribuição UTM e funil comercial.
- Analytics com eventos permitidos e metadados restritos.
- Conversão manual de leads pelo ADMIN.
- Cancelamento administrativo obrigatório com motivo, autor e data registrados.
- Confirmações de agendamento e avisos de cancelamento administrativo por e-mail.
- Abstração de WhatsApp, atualmente desabilitada enquanto não houver provedor configurado.
- Auditoria de privacidade para endpoints, roles, logs, cookies, CORS, secrets, analytics e PII.

## Estrutura do projeto

```text
/
├── src/                    # Frontend React/Vite
├── backend/
│   ├── src/                # API Express/TypeScript
│   ├── migrations/         # Migrations SQL incrementais
│   └── tests/              # Testes de integração do backend
├── docs/                   # Auditorias e decisões de implementação
├── docker-compose.yml      # PostgreSQL, backend e profile de testes
└── .env                    # Único arquivo local de ambiente, não versionado
```

## Configuração de ambiente

O projeto utiliza um único `.env`, localizado na raiz. O backend carrega esse arquivo explicitamente mesmo quando é iniciado dentro de `/backend`. Não crie `backend/.env`.

Crie o arquivo local a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis utilizadas, sem valores reais:

- `DATABASE_URL`: conexão PostgreSQL usada pelo backend, migrations e seed.
- `AUTH_SECRET`: segredo usado para proteger os tokens de sessão; deve ter pelo menos 32 caracteres.
- `FRONTEND_ORIGIN`: origem autorizada pelo CORS.
- `ADMIN_NAME`: nome da conta administrativa criada pelo seed.
- `ADMIN_EMAIL`: e-mail da conta administrativa.
- `ADMIN_PASSWORD`: senha da conta administrativa.
- `TURNSTILE_SITE_KEY`: nome conceitual da site key do Turnstile. No frontend Vite, o nome efetivamente usado pelo projeto é `VITE_TURNSTILE_SITE_KEY`.
- `TURNSTILE_SECRET_KEY`: secret key validada exclusivamente pelo backend.
- `RESEND_API_KEY`: credencial do provider de e-mail Resend.
- `EMAIL_FROM`: remetente autorizado no Resend.

Também existem configurações auxiliares documentadas em `.env.example`, como `VITE_API_URL`, `PORT`, `SESSION_COOKIE_SECURE` e `WHATSAPP_PROVIDER`.

Nunca versione `.env`, senhas, tokens ou credenciais reais. Variáveis já fornecidas pelo ambiente ou pelo Docker não são sobrescritas pelo carregamento local.

## Setup local

Requisitos: Node.js, npm e Docker Desktop/Docker Engine com Compose.

Instale as dependências do frontend e do backend:

```bash
npm ci

cd backend
npm ci
cd ..
```

### Opção 1 — backend e PostgreSQL via Docker

O Compose sobe o PostgreSQL, aplica migrations, executa o seed inicial do ADMIN quando suas variáveis estão configuradas e inicia a API:

```bash
docker compose up -d
```

Em outro terminal, inicie o frontend:

```bash
npm run dev
```

### Opção 2 — PostgreSQL no Docker e backend local

Suba somente o banco para não disputar a porta 3001 com o backend local:

```bash
docker compose up -d postgres

cd backend
npm run db:migrate
npm run db:seed:admin
npm run dev
```

Em outro terminal, na raiz:

```bash
npm run dev
```

Não execute simultaneamente o serviço `backend` do Compose e `npm run dev` dentro de `/backend`, pois ambos usam a porta 3001 por padrão.

## URLs locais

- Frontend: <http://localhost:5173>
- Backend/API: <http://localhost:3001/api>
- Healthcheck: <http://localhost:3001/api/health>
- Login: <http://localhost:5173/login>
- Admin Agenda: <http://localhost:5173/admin/agenda>
- Admin Leads: <http://localhost:5173/admin/leads>

## Banco de dados

As migrations são incrementais e migrations antigas não devem ser editadas:

- `0000_initial.sql`: usuários, sessões, slots, bookings, roles, estados, índices e restrições iniciais.
- `0001_leads_analytics.sql`: leads, estados do funil, atribuição UTM e eventos de analytics.
- `0002_lesson_types.sql`: tipos de aula `TRIAL` e `REGULAR`, mantendo compatibilidade com aulas existentes.
- `0003_hardening_notifications.sql`: auditoria de cancelamento administrativo e entregas de notificações.

Para aplicar migrations manualmente:

```bash
cd backend
npm run db:migrate
```

O backend executado pelo Docker aplica migrations automaticamente antes de iniciar.

## Usuário ADMIN

Não existe cadastro público de ADMIN. Configure `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` da raiz e execute:

```bash
cd backend
npm run db:seed:admin
```

O seed é idempotente. Ele cria a conta quando ausente, sincroniza nome e senha quando o e-mail já pertence a um ADMIN e recusa promover silenciosamente uma conta `STUDENT`.

Com o backend no Docker, o seed também pode ser executado explicitamente com:

```bash
docker compose exec backend npm run db:seed:admin
```

## Testes e validação

Última validação do MVP:

- Testes de integração do backend: **30/30 PASS**.
- Build do backend: **PASS**.
- Build do frontend: **PASS**.
- `npm audit --omit=dev` no backend: **0 vulnerabilidades**.
- Route smoke e `git diff --check`: **PASS**.

Builds e auditoria local:

```bash
cd backend
npm run build
npm audit --omit=dev

cd ..
npm run build
git diff --check
```

A suíte completa deve usar o banco temporário isolado do profile de testes:

```bash
docker compose --profile test up --build --abort-on-container-exit --exit-code-from backend-test backend-test
```

Esse profile usa `postgres-test` com `tmpfs` e não altera o volume persistente de desenvolvimento.

Evite executar `npm test` com `DATABASE_URL` apontando para o banco de desenvolvimento, pois a suíte reinicializa suas tabelas entre os cenários.

## Notificações

O `NotificationService` coordena os canais sem fazer parte da transação que persiste a reserva ou o cancelamento:

- Resend é o provider real de e-mail.
- Reservas persistidas geram confirmação com data, horário, duração e tipo da aula.
- Cancelamentos administrativos geram aviso com o motivo registrado.
- Falhas de entrega não desfazem a operação principal e são auditadas sem armazenar PII no log de entrega.
- O `WhatsAppProvider` existe como abstração, mas permanece `disabled` sem credenciais e sem simulação enganosa de envio.

## Segurança e privacidade

- Senhas protegidas com bcrypt; `password_hash` nunca é retornado pela API.
- Sessões opacas armazenadas como hash e enviadas em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Turnstile validado no backend em cadastro e login.
- Rate limit por IP independente para cadastro e login.
- CORS limitado a `FRONTEND_ORIGIN`.
- Endpoints administrativos protegidos por autenticação e role `ADMIN`.
- Logs não registram senhas, tokens, cookies, headers de autorização ou PII da requisição.
- Analytics usa eventos e metadados permitidos; e-mail, telefone, senha, token, cookie, authorization e secret são rejeitados.
- Respostas públicas são minimizadas e dados de leads ficam restritos à área administrativa.

## Limitações conhecidas

- O envio real de e-mail depende de `RESEND_API_KEY` e `EMAIL_FROM` válidos.
- WhatsApp depende da implementação e configuração de um provedor real.
- O rate limit atual é in-memory e deve usar armazenamento compartilhado em uma implantação com múltiplas réplicas.

## Documentação complementar

- [Auditoria inicial de implementação](docs/implementation-audit.md)
- [Ciclo 2 — leads, funil e analytics](docs/cycle-2-leads-analytics.md)
- [Ciclo 4 — auditoria de privacidade](docs/cycle-4-privacy-audit.md)
