import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { WelcomeForm } from "./_form";
import { branding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { lerRetratoDaInstalacao } from "@/lib/instalacao/retrato";
import { JaEstaPronto } from "../_components/JaEstaPronto";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/login");
  const idioma = user.idioma;

  const supabase = await createClient();
  const retrato = await lerRetratoDaInstalacao({ supabase, orgId: activeOrg.orgId });

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.82fr)_minmax(430px,1fr)] xl:items-start">
      <section className="relative isolate overflow-hidden rounded-3xl border border-accent/20 bg-surface/80 p-7 shadow-xl sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" />
          Primeiro passo · perfil da operação
        </div>
        <header className="mt-8 max-w-xl">
          <p className="text-sm font-semibold text-text-muted">
            {traduzir("Boas-vindas ao", idioma)} {branding().name}
          </p>
          <h2 className="mt-3 text-4xl leading-[0.98] font-bold tracking-[-0.04em] text-text sm:text-5xl">
            Vamos preparar o seu atendimento.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-text-muted">
            {traduzir(
              "Vamos montar quem vai atender seus clientes — e onde ele vai trabalhar.",
              idioma,
            )}{" "}
            Em poucos passos, o {branding().name} ganha o contexto da sua operação.
          </p>
        </header>

        <div className="mt-12 grid gap-5 border-t border-border/80 pt-6 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs font-medium text-accent">01</p>
            <p className="mt-2 text-sm font-semibold text-text">Identidade</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Nome, segmento e horário do negócio.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium text-accent">02</p>
            <p className="mt-2 text-sm font-semibold text-text">Canais</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Onde o time conversa com os clientes.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium text-accent">03</p>
            <p className="mt-2 text-sm font-semibold text-text">Operação</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Funil, IA e equipe prontos para trabalhar.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <JaEstaPronto retrato={retrato} idioma={idioma} />

        {/*
          O instalador NUNCA pergunta o nome do negócio: toda organização nasce
          "Minha Empresa", hardcoded. Mandar esse texto como valor inicial fazia a
          pessoa ter de apagá-lo antes de escrever o nome dela — e quem não
          percebia seguia com o placeholder no cabeçalho do sistema para sempre.
        */}
        <WelcomeForm defaultOrgName={retrato.empresa.aindaSemNomeProprio ? "" : activeOrg.name} />
      </div>
    </div>
  );
}
