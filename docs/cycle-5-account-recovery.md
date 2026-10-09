# Ciclo 5 — recuperação de senha e conta

## Decisão de integração com leads

O usuário continua sendo a fonte de autenticação e o vínculo com leads permanece baseado em `leads.converted_user_id`, nunca no e-mail. Ao editar a conta, telefone e e-mail são sincronizados no lead já associado. Se outro lead já usar o novo e-mail, a conta ainda pode ser atualizada, mas o e-mail do lead associado é preservado para não mesclar ou duplicar registros implicitamente; o telefone continua sincronizado.

O serviço que localiza o lead de um usuário também prioriza `converted_user_id` antes de procurar por e-mail. Isso mantém agendamentos, métricas e histórico associados ao mesmo ID mesmo depois de uma mudança de e-mail.

## Sessões

- Redefinição por e-mail encerra todas as sessões do usuário.
- Alteração autenticada exige a senha atual, encerra as outras sessões e preserva a sessão usada na operação.
- Tokens de recuperação duram 30 minutos, são armazenados somente como HMAC SHA-256, têm uso único e um novo pedido invalida tokens ativos anteriores.
