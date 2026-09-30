---
impacto: capacidade_nova
secao: adicionado
titulo: Fotos dos contatos e importação segura do histórico no GroupCRM
---

Conexões ganhou **Fotos e histórico**: atualizar fotos, escolher 30/90/365 dias
e importar mensagens disponíveis, pausando entre lotes. Datas são preservadas;
conversas antigas entram fechadas, sem gerar demandas, eventos, IA ou automações.

As fotos também aquecem em pequenos lotes após abrir a Inbox, sem atrasar a
listagem. São guardadas em Storage privado, com limite de tamanho e origem.
Privacidade de foto e falha de transporte são resultados diferentes.

Novas sessões por QR nascem com armazenamento e sincronização habilitados.
Sessões já pareadas não são reiniciadas ou alteradas automaticamente. O histórico
depende do que o WhatsApp disponibilizou ao serviço; não é um backup completo.

A migration 0382 protege contatos anonimizados contra reimportação, restringe o
RPC ao servidor e publica atualizações de contatos para a Inbox sob RLS.
