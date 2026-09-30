-- Historical inserts are context, not live inbound events. Re-applicable.
drop trigger if exists trg_messages_emit_event on public.messages;
create trigger trg_messages_emit_event after insert on public.messages for each row
  when (coalesce(new.metadata->>'historical_import', 'false') <> 'true'
    or coalesce(current_setting('groupcrm.history_import',true),'') <> 'on')
  execute function public.fn_emit_message_event();
drop trigger if exists trg_demanda_abre_no_inbound on public.messages;
create trigger trg_demanda_abre_no_inbound after insert on public.messages for each row
  when (coalesce(new.metadata->>'historical_import', 'false') <> 'true'
    or coalesce(current_setting('groupcrm.history_import',true),'') <> 'on')
  execute function public.fn_demanda_abre_no_inbound();

-- Pseudonymous, server-only suppression: an old WhatsApp history must not
-- resurrect an anonymized person. No phone, name, chat text or raw identity.
create table if not exists public.contact_history_suppressions (
  contact_id uuid primary key references public.contacts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  salt bytea not null,
  tokens bytea[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists contact_history_suppressions_org on public.contact_history_suppressions(organization_id);
alter table public.contact_history_suppressions enable row level security;
revoke all on public.contact_history_suppressions from public, anon, authenticated;
grant all on public.contact_history_suppressions to service_role;

create or replace function public.fn_history_remember_redaction(p_org uuid, p_contact uuid, p_phone text, p_lid text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_salt bytea; v_tokens bytea[];
begin
  if not exists(select 1 from contacts where organization_id=p_org and id=p_contact) then
    raise exception 'history_contact_not_in_organization' using errcode='42501';
  end if;
  insert into contact_history_suppressions(contact_id,organization_id,salt)
    values(p_contact,p_org,gen_random_bytes(32)) on conflict(contact_id) do nothing;
  select salt into v_salt from contact_history_suppressions where organization_id=p_org and contact_id=p_contact for update;
  with identities as (
    select 'phone:'||v as identity from unnest(fn_telefone_variantes(p_phone)) v
    union select 'lid:'||p_lid where nullif(p_lid,'') is not null
    union select case when parts[2]='lid' then 'lid:'||parts[1] else 'phone:'||parts[1] end
      from messages m cross join lateral regexp_match(m.external_id,'^(?:true|false)_([0-9]+)@(c\.us|s\.whatsapp\.net|lid)_') parts
      where m.organization_id=p_org and m.contact_id=p_contact
  ) select coalesce(array_agg(distinct hmac(convert_to(identity,'UTF8'),v_salt,'sha256')),'{}'::bytea[]) into v_tokens from identities;
  update contact_history_suppressions set tokens=(select array_agg(distinct t) from unnest(tokens||v_tokens) t)
    where organization_id=p_org and contact_id=p_contact and cardinality(v_tokens)>0;
end;$$;
revoke all on function public.fn_history_remember_redaction(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.fn_history_remember_redaction(uuid,uuid,text,text) to service_role;

create or replace function public.fn_history_suppress_redacted_contact()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform fn_history_remember_redaction(old.organization_id,old.id,old.phone_number,old.wa_lid);
  return new;
end;$$;
revoke all on function public.fn_history_suppress_redacted_contact() from public,anon,authenticated;
drop trigger if exists trg_history_suppress_redacted_contact on public.contacts;
create trigger trg_history_suppress_redacted_contact before update on public.contacts for each row
  when (new.is_anonymized and not old.is_anonymized)
  execute function public.fn_history_suppress_redacted_contact();

-- Existing anonymizations: reconstruct suppression only from retained ids.
do $$ declare c record; begin
  for c in select id,organization_id,phone_number,wa_lid from public.contacts where is_anonymized
  loop perform public.fn_history_remember_redaction(c.organization_id,c.id,c.phone_number,c.wa_lid); end loop;
end;$$;

create index if not exists messages_history_external_key on public.messages
  (organization_id,channel_session_id,(regexp_replace(external_id,'^(true|false)_[^_]+_','')))
  where external_id is not null;

create or replace function public.fn_import_channel_history(p_org uuid,p_channel uuid,p_messages jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare
  r jsonb; v_contact uuid; v_conversation uuid; v_message uuid; v_existing uuid;
  v_phone text; v_lid text; v_key text; v_at timestamptz; v_status text;
  v_imported int:=0; v_skipped int:=0; v_anon bool;
begin
  if not exists(select 1 from channel_sessions where organization_id=p_org and id=p_channel and archived_at is null) then
    raise exception 'history_channel_not_in_organization' using errcode='42501';
  end if;
  if jsonb_typeof(p_messages) is distinct from 'array' or jsonb_array_length(p_messages)>100 then
    raise exception 'history_invalid_batch' using errcode='22023';
  end if;
  -- Serializes retries/imports for this organization. Live ingestion continues.
  perform pg_advisory_xact_lock(hashtextextended('channel-history:'||p_org::text,0));
  set constraints messages_org_external_id_unique immediate;
  perform set_config('groupcrm.history_import','on',true);
  for r in select value from jsonb_array_elements(p_messages) order by value->>'chat_id',value->>'sent_at' loop
    if r->>'chat_id' !~ '^[0-9]{5,20}@(c\.us|lid)$'
       or coalesce(r->>'direction','') not in ('inbound','outbound')
       or coalesce(r->>'identity_kind','') not in ('phone','lid')
       or nullif(r->>'external_id','') is null or nullif(r->>'external_key','') is null
       or coalesce(r->>'type','') not in ('text','image','audio','video','document','sticker','location','contact') then
      raise exception 'history_invalid_message' using errcode='22023';
    end if;
    v_key:=r->>'external_key';
    v_at:=(r->>'sent_at')::timestamptz;
    if v_at is null or v_at>now() or v_at<'2000-01-01'::timestamptz then raise exception 'history_invalid_timestamp' using errcode='22023'; end if;
    -- Match both the webhook's serialized id and the sender's bare id.
    if exists(select 1 from messages where organization_id=p_org and channel_session_id=p_channel
      and external_id is not null and regexp_replace(external_id,'^(true|false)_[^_]+_','')=v_key) then
      v_skipped:=v_skipped+1; continue;
    end if;
    v_phone:=nullif(r->>'phone_number',''); v_lid:=nullif(r->>'lid','');
    select id into v_existing from contacts where organization_id=p_org and is_merged_into is null
      and ((v_lid is not null and wa_lid=v_lid) or regexp_replace(phone_number,'\D','','g')=any(fn_telefone_variantes(v_phone)))
      order by id limit 1;
    if v_existing is not null then
      perform fn_service_lock(p_org,v_existing);
      select is_anonymized into v_anon from contacts where organization_id=p_org and id=v_existing for update;
      if v_anon is distinct from false then v_skipped:=v_skipped+1; continue; end if;
    end if;
    if exists(select 1 from contact_history_suppressions s where s.organization_id=p_org and (
      (v_lid is not null and hmac(convert_to('lid:'||v_lid,'UTF8'),s.salt,'sha256')=any(s.tokens))
      or exists(select 1 from unnest(fn_telefone_variantes(v_phone)) p
        where hmac(convert_to('phone:'||p,'UTF8'),s.salt,'sha256')=any(s.tokens)))) then
      v_skipped:=v_skipped+1; continue;
    end if;
    v_contact:=fn_upsert_wa_contact(p_org,r->>'identity_kind',v_phone,v_lid,r->>'chat_id',r->>'display_name');
    if v_contact is null then raise exception 'history_contact_not_resolved'; end if;
    perform fn_service_lock(p_org,v_contact);
    select is_anonymized into v_anon from contacts where organization_id=p_org and id=v_contact for update;
    if v_anon is distinct from false then v_skipped:=v_skipped+1; continue; end if;
    -- Historical-only chats stay CLOSED: no routing, demand or unread queue.
    insert into conversations(organization_id,contact_id,channel_session_id,channel,status,is_group,metadata,created_at)
      values(p_org,v_contact,p_channel,'whatsapp','closed',false,'{"historical_import":true}',v_at)
      on conflict(organization_id,contact_id,channel_session_id) where is_group=false do nothing;
    select id into v_conversation from conversations where organization_id=p_org and contact_id=v_contact
      and channel_session_id=p_channel and is_group=false for update;
    if v_conversation is null then raise exception 'history_conversation_not_resolved'; end if;
    v_status:=case when r->>'direction'='inbound' then 'delivered' else 'sent' end;
    begin
      insert into messages(organization_id,conversation_id,contact_id,channel_session_id,external_id,type,direction,status,
        body,ack,sent_via,sent_at,created_at,read_at,metadata)
      values(p_org,v_conversation,v_contact,p_channel,r->>'external_id',r->>'type',r->>'direction',v_status,
        r->>'body',(r->>'ack')::int,'external_device',v_at,v_at,v_at,
        jsonb_build_object('historical_import',true,'attachments_imported',false)) returning id into v_message;
    exception when unique_violation then v_skipped:=v_skipped+1; continue;
    end;
    update conversations set
      last_message_preview=case when last_message_at is null or v_at>last_message_at then left(coalesce(r->>'body','['||(r->>'type')||']'),280) else last_message_preview end,
      last_message_at=greatest(last_message_at,v_at), updated_at=now()
      where organization_id=p_org and id=v_conversation;
    v_imported:=v_imported+1;
  end loop;
  perform set_config('groupcrm.history_import','',true);
  return jsonb_build_object('imported',v_imported,'skipped',v_skipped);
end;$$;
revoke all on function public.fn_import_channel_history(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.fn_import_channel_history(uuid,uuid,jsonb) to service_role;
-- Fotos atualizadas fora da resposta HTTP precisam acordar a Inbox aberta.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='contacts'
  ) then
    alter publication supabase_realtime add table public.contacts;
  end if;
end $$;
