import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { fontesDoAppDaMeta } from "@/lib/channels/meta/app";
import { metaPodeReceber } from "@/lib/channels/meta/webhook";
import { nomeCurtoDaSessao } from "@/lib/channels/nome-da-sessao";
import { getWahaClient } from "@/lib/waha/client";
import { ConnectWhatsappClient } from "./_client";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

export default async function ConnectWhatsappPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/login");
  const idioma = user.idioma;

  const wahaConfigured = getWahaClient() !== null;

  // Receber pelo canal oficial exige DOIS segredos, não um — a regra e o porquê
  // moram em `lib/channels/meta/webhook.ts`, ao lado de quem os consome. Agora os
  // dois podem vir do BANCO (`platform_meta_app`, migration 0257) e não só do
  // `.env`: `fontesDoAppDaMeta()` devolve a fonte VENCEDORA, sem misturar as duas
  // — App Secret de um lado com verify token do outro é um app que não existe, e
  // esta tela diria que está tudo pronto.
  const oficialPodeReceber = metaPodeReceber(await fontesDoAppDaMeta());
  // We don't try to start the session at SSR — client kicks off the call
  // (and shows graceful banner if WAHA is not reachable).

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-accent/25 bg-surface/80 p-7 shadow-xl sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-accent uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] text-accent-foreground">
              02
            </span>
            Canal de atendimento
          </p>
          <span className="rounded-full border border-border bg-bg/60 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-text-muted uppercase">
            WhatsApp
          </span>
        </div>
        <h2 className="mt-7 max-w-3xl text-3xl leading-[1.02] font-bold tracking-[-0.045em] text-text sm:text-5xl">
          Escolha como o <span className="text-accent">GroupCRM</span> vai atender.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
          {traduzir(
            "É por este número que ele vai atender seus clientes. Se você conecta pelo celular, tenha ele por perto.",
            idioma,
          )}
        </p>
        <div className="mt-7 grid gap-3 border-t border-border/80 pt-5 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs font-medium text-accent">01</p>
            <p className="mt-1 text-sm font-semibold text-text">Escolha o caminho</p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium text-accent">02</p>
            <p className="mt-1 text-sm font-semibold text-text">Conecte o número</p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium text-accent">03</p>
            <p className="mt-1 text-sm font-semibold text-text">Comece em teste</p>
          </div>
        </div>
      </header>

      <div className="flex gap-3 rounded-2xl border border-accent/25 bg-accent-soft/35 px-5 py-4 text-sm text-text-muted shadow-xs">
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_5px_var(--color-accent-soft)]"
        />
        <p>
          <strong className="font-semibold text-text">
            Escolha o cenário que combina com o seu número.
          </strong>{" "}
          O GroupCRM não cria uma sessão sem você escolher como esse WhatsApp será conectado.
        </p>
      </div>
      <ConnectWhatsappClient
        wahaConfigured={wahaConfigured}
        sessionName={nomeCurtoDaSessao(activeOrg.orgId)}
        oficialPodeReceber={oficialPodeReceber}
      />
    </div>
  );
}
