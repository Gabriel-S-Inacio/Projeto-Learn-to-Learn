# Ciclo 4 — Auditoria de privacidade

## Superfície pública

- `GET /api/health` retorna somente o estado do serviço.
- `GET /api/schedule/available` retorna somente horários experimentais disponíveis, sem reserva ou aluno.
- `POST /api/leads` aceita os dados necessários ao contato e retorna apenas estado e indicador de criação, sem o identificador interno do lead.
- `POST /api/analytics/events` aceita uma lista fechada de eventos e metadados. Chaves de senha, token, cookie, autorização, segredo, e-mail e telefone são rejeitadas.
- Cadastro e login exigem validação Turnstile no backend e possuem limites independentes por IP.

## Autorização e exposição de dados

- Rotas de reservas exigem sessão e papel `STUDENT`.
- Toda a árvore `/api/admin` exige sessão e papel `ADMIN`.
- Dados de contato de leads, alunos convertidos e reservas são retornados somente nas rotas administrativas.
- As respostas de usuário usam projeção explícita e nunca incluem `password_hash`.
- Tokens de sessão são armazenados como hash e enviados em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.

## Logs e auditoria

- O tratador de erro registra somente um código seguro; não registra mensagem, corpo, headers, cookies ou stack da requisição.
- A auditoria de notificações guarda IDs internos, canal, evento, estado, provedor e código de falha. Não guarda e-mail, telefone, conteúdo ou token do provedor.
- Falhas de provedores de notificação são reduzidas a códigos controlados e não expõem respostas externas.
- O cancelamento administrativo registra autor, instante e motivo no booking.

## Configuração e segredos

- `.env` e variantes locais permanecem ignorados pelo Git; apenas os arquivos `.env.example` são versionados.
- Docker recebe segredos pelo ambiente e não sobrescreve valores já fornecidos.
- CORS aceita somente `FRONTEND_ORIGIN` e mantém credenciais habilitadas para a sessão da aplicação.
- Credenciais reais de e-mail e WhatsApp não foram adicionadas ao repositório.

## Limites conhecidos do MVP

- O rate limit é local ao processo. Uma implantação com várias réplicas deve migrar os contadores para um armazenamento compartilhado.
- E-mail real depende de `RESEND_API_KEY` e `EMAIL_FROM`; sem ambos, a entrega é registrada como `SKIPPED`.
- WhatsApp está explicitamente desabilitado até a configuração de um provedor real. Não há simulação de envio.
