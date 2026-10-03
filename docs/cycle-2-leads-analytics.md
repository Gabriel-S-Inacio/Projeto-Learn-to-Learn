# Ciclo 2 — Leads, funil de conversão e analytics

## Decisões de domínio

### Lead canônico e deduplicação

- Um e-mail normalizado identifica um único lead (`UNIQUE lower(email)`).
- Reenvios do formulário atualizam nome e telefone, mas preservam `source` e a primeira UTM conhecida de cada dimensão.
- Cadastro associa o lead existente a `converted_user_id`; quando não existe, cria um lead `REGISTER`.
- A associação de usuário não significa conversão comercial. O cadastro promove apenas `NEW → INTERESTED`.
- Usuários legados sem lead recebem um registro `SCHEDULE` quando realizam a primeira ação transacional relevante.

### Máquina de estados

Transições aceitas:

```text
NEW             → INTERESTED | SCHEDULED | LOST
INTERESTED      → SCHEDULED | LOST
SCHEDULED       → TRIAL_COMPLETED | LOST
TRIAL_COMPLETED → CONVERTED | LOST
CONVERTED       → estado final
LOST            → estado final
```

- Reserva persistida promove `NEW` ou `INTERESTED` para `SCHEDULED` na mesma transação.
- Conclusão da aula promove sequencialmente até `TRIAL_COMPLETED` e registra `trial_completed`.
- Somente ADMIN pode executar transições manuais.
- `CONVERTED` é exclusivamente manual e registra `lead_converted`.
- Transições inválidas retornam `409 INVALID_LEAD_TRANSITION`.

## Atribuição

- `source` representa o canal funcional: `FORM`, `REGISTER`, `SCHEDULE` ou `MANUAL`.
- UTM representa atribuição de campanha e é opcional.
- O front preserva `utm_source`, `utm_medium` e `utm_campaign` em `localStorage`, usando first-touch.
- O identificador técnico da sessão fica em `sessionStorage` e não contém PII.
- Eventos anônimos da mesma sessão são associados ao lead quando o formulário ou cadastro é concluído.

## Analytics

Eventos aceitos:

```text
page_view
cta_clicked
schedule_viewed
registration_started
registration_completed
booking_started
booking_completed
trial_completed
lead_converted
```

- O endpoint público aceita apenas eventos comportamentais iniciados pelo front.
- Eventos de conclusão são produzidos no servidor após a persistência do fato transacional.
- Page views consideram navegação SPA e suprimem somente a duplicação imediata do React StrictMode.
- Metadata possui chaves específicas por evento, valores escalares, limite de tamanho e rejeição de campos sensíveis.
- Senhas, tokens, cookies, e-mail e telefone não são armazenados em metadata.

## Métricas

Os cards usam o período selecionado:

- Novos Leads: leads com `created_at` no período.
- Agendamentos: reservas persistidas com `created_at` no período.
- Aulas Experimentais Concluídas: slots `COMPLETED` com `updated_at` no período.
- Conversões: leads com `converted_at` no período.

O funil usa uma coorte de leads criados no período:

- Lead: total da coorte.
- Scheduled: lead da coorte com `scheduled_at`.
- Trial Completed: lead da coorte com `trial_completed_at`.
- Converted: lead da coorte com `converted_at`.
- Taxa: `Converted / Leads × 100` para a mesma coorte.

Assim, eventos comportamentais não substituem fatos transacionais nas métricas principais.

## Segurança e privacidade

- `POST /api/leads` é público, mas ignora status comercial e aceita somente `source = FORM`.
- Listagem, métricas e mudança de status exigem sessão ADMIN.
- STUDENT não acessa PII nem altera status.
- Payloads são validados com Zod; JSON permanece limitado a 32 KB.
- Analytics público usa allowlist de eventos e metadata.
- A interface pública nunca expõe a lista de leads.

## Interface e referência visual

- Formulário de interesse na Home: `REFERENCE GAP`; construído com os tokens, campos, cards e botões existentes.
- `/admin/leads`: `REFERENCE GAP — AUTHENTICATED STATE`; reutiliza o shell administrativo e não tenta representar um CRM completo.
- Home e páginas existentes: `KEEP`, sem redesenho estrutural.
- Painel validado em 1440, 1280, 1024, 768, 430, 390, 375 e 320 px.
