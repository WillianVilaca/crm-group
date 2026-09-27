-- 0381: duas formas de página de captação por fonte.
--
-- `crm` usa a landing nativa do GroupCRM. `html` guarda o template enviado
-- pela empresa; a aplicação o entrega dentro de iframe sandboxed e nunca permite
-- script/evento inline no conteúdo salvo.

alter table public.webhook_sources
  add column if not exists capture_mode text not null default 'crm';

alter table public.webhook_sources
  add column if not exists capture_html text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webhook_sources'::regclass
      and conname = 'webhook_sources_capture_mode_check'
  ) then
    alter table public.webhook_sources
      add constraint webhook_sources_capture_mode_check
      check (capture_mode in ('crm', 'html'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webhook_sources'::regclass
      and conname = 'webhook_sources_capture_html_check'
  ) then
    alter table public.webhook_sources
      add constraint webhook_sources_capture_html_check
      check (capture_html is null or octet_length(capture_html) <= 200000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webhook_sources'::regclass
      and conname = 'webhook_sources_capture_form_check'
  ) then
    alter table public.webhook_sources
      add constraint webhook_sources_capture_form_check
      check (capture_mode = 'crm' or (capture_mode = 'html' and capture_html is not null and length(trim(capture_html)) > 0));
  end if;
end $$;

comment on column public.webhook_sources.capture_mode is
  'Página pública desta fonte: crm = landing nativa; html = template enviado pela organização.';
comment on column public.webhook_sources.capture_html is
  'HTML sem scripts/eventos inline, renderizado em iframe sandboxed quando capture_mode = html.';
