# GroupCRM e WAHA no EasyPanel

## Endereços internos

No projeto `crm-group`, o CRM fala com o WAHA e o WAHA entrega eventos ao CRM
pela rede privada. Os nomes completos evitam colisões com outras instalações:

```dotenv
# Ambiente do serviço app — não do serviço waha
WAHA_API_BASE_URL=http://crm-group_waha:80
WAHA_WEBHOOK_BASE_URL=http://crm-group_app:3000
```

As portas acima foram verificadas nesta instalação. Não substituir portas
automaticamente: outra imagem ou instalação pode usar uma porta diferente.
`app` e `waha` são aliases curtos e podem resolver para outro projeto na mesma
VPS. Em setembro/2026, `app:3000` respondia com outra instalação do Deskcomm;
o GroupCRM estava em `crm-group_app:3000`.

O WAHA recusa underscores no hostname de um callback. O cliente resolve o nome
completo do serviço para seu IPv4 privado antes de registrar o webhook. Não
copiar esse IP para o ambiente: ele pertence à rede e pode mudar quando o serviço
é recriado. A convergência da sessão atualiza o destino usando o DNS configurado.

## Contrato da sessão

- A chave de API em `app` é a credencial de chamada; manter a autenticação do
  WAHA correspondente, sem mostrar os valores em logs ou capturas.
- O webhook usa HMAC e inclui `message.any`, os eventos de confirmação/edição/
  revogação e os de estado da sessão.
- A atualização preserva a configuração e outros callbacks da sessão, mas
  substitui destinos globais antigos do CRM.
- Usando callbacks de sessão gerenciados pelo CRM, não manter também um
  `WHATSAPP_HOOK_URL` global apontando para outra instalação.

## Conferência de recebimento

1. Verificar sessão `WORKING` e callback registrado no destino privado correto.
2. Enviar uma mensagem nova de outro WhatsApp para o número pareado.
3. Conferir, **com filtro pela organização**, um evento de mensagem com assinatura
   válida em `webhook_events_log`, uma mensagem persistida e a conversa na Inbox.
4. Não tratar eventos `state.change`/`session.status` como prova de que uma
   mensagem já foi persistida. Tampouco confundir pareamento com importação do
   histórico anterior do WhatsApp.

## Persistência antes de recriar o WAHA

Antes de um deploy que recrie o contêiner, conferir **Storage / Mounts**. A
configuração inicial encontrada não tinha volume de sessões: recriá-la pode
perder o pareamento. Preservar a sessão em execução até copiar os arquivos de
autenticação para armazenamento persistente e verificar a restauração. Não
montar um volume vazio sobre a pasta existente e assumir que os arquivos foram
copiados automaticamente.

Referências: [serviço App do EasyPanel](https://easypanel.io/docs/services/app),
[sessões do WAHA](https://waha.devlike.pro/docs/how-to/sessions/) e
[configuração do WAHA](https://waha.devlike.pro/docs/how-to/config/).
