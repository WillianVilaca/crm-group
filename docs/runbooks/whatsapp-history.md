# Fotos e histórico do WhatsApp no GroupCRM

## Uso

Em **Conexões**, abra **Fotos e histórico** no número conectado. A atualização
de fotos respeita a privacidade de cada contato. A Inbox também busca fotos
desatualizadas em lotes pequenos depois de listar as conversas.

Escolha 30, 90 ou 365 dias e inicie a importação. Mantenha o diálogo aberto;
**Pausar** encerra após o lote em andamento. **Continuar** reutiliza o cursor.
Se fechar/reabrir, uma nova leitura pode começar do início: IDs externos evitam
duplicação. Conversas exclusivamente históricas ficam em **Todas/Fechadas**;
conversas atuais preservam responsável, status e contagem de não lidas.

Não importa grupos ou arquivos antigos. Preserva o tipo de anexos como contexto,
sem fingir que o arquivo foi recuperado. Não envia mensagens, recibos de leitura
ou eventos de atendimento a partir das mensagens importadas.

## Instalação

1. Aplicar `supabase/migrations/20260930120000_0382_historico_de_conversas.sql`
   e recarregar o schema PostgREST (`NOTIFY pgrst, 'reload schema'`).
2. Publicar a aplicação da branch `alamo-crm`, sem reiniciar o WAHA.
3. Confirmar fotos e disponibilidade em Conexões. O botão de importação só
   aparece quando a sessão conectada dispõe de histórico local.

O WAHA NOWEB exige `config.noweb.store.enabled=true` antes do pareamento;
`fullSync=true` pede mais histórico, mas não garante o histórico completo.
Novas sessões criadas pelo CRM já enviam essas opções. Sessões antigas mantêm
sua configuração: habilitar depois do QR não recupera automaticamente o passado.

Referências oficiais: [NOWEB](https://waha.devlike.pro/docs/engines/noweb/),
[Chats](https://waha.devlike.pro/docs/how-to/chats/),
[armazenamento](https://waha.devlike.pro/docs/how-to/storages/).

### Persistência no EasyPanel: preservar a sessão existente

**Não montar um volume vazio sobre `/app/.sessions` e implantar.** O volume
esconderia as credenciais atuais, exigindo outro QR. Primeiro obter acesso SSH ao
host e identificar o contêiner ativo do serviço `crm-group_waha` e seu mount real.

Copiar as credenciais para um destino de backup no servidor e verificar a cópia.
Para banco SQLite ativo, não confiar em uma cópia crua: usar backup consistente
ou parar brevemente o serviço, copiar e reiniciar o mesmo contêiner. Somente
depois popular um volume persistente e mapear esse volume em `/app/.sessions`.
Validar `WORKING` e recebimento no CRM após implantar. Não deletar o contêiner
ou backup até validar. Não baixar, publicar ou imprimir credenciais.

Se o armazenamento estava desligado, preparar persistência e combinar um novo
pareamento com o usuário. Este fluxo não chama logout/delete/PUT automaticamente.

## Verificação

`node --env-file=.env.local scripts/check-channel-history.mjs` exercita a migration
duas vezes e importa fixtures em transação **desfeita** ao final. Verifica isolamento
de organizações, datas, deduplicação, ausência de dispatch/demanda, bloqueio de
reimportação após anonimização e privilégios. TLS valida o certificado do banco.

`--apply` só deve ser usado depois de confirmar o projeto de destino; após as
mesmas provas, aplica a migration em nova transação e recarrega o schema.

Testes unitários: `channel-history`, `channel-profile-picture`,
`channel-history-route`, `contact-history-dialog`, `cron-contact-avatars-chatid`,
`cron-contact-avatars-corrida` e `waha-ignora-o-que-nao-atende`.

## Limites de privacidade

Fotos ficam no bucket privado `whatsapp-media`. O importador ignora contatos
anonimizados e preserva apenas tokens HMAC com sal, restritos ao servidor, para
impedir que uma importação posterior reintroduza a pessoa. A retroproteção usa
identificadores ainda existentes; identidades apagadas antes desta migration e
sem nenhum identificador remanescente não podem ser reconstruídas.
