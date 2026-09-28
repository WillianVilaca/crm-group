import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { Stepper } from "./_components/Stepper";
import { OutrasOrganizacoes } from "./_components/OutrasOrganizacoes";
import { SkipToEnd } from "./_components/SkipToEnd";
import { GroupLogo } from "@/components/branding/GroupLogo";
import { branding, marcaEhADoProduto } from "@/lib/branding";
import { passosVisiveis } from "@/lib/onboarding/passos";
import { env } from "@/lib/env";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // Acompanhamento observa a organização incompleta no shell com saída explícita.
  if (user.support) redirect("/app/inbox");
  // Sem organização o onboarding não tem o que mostrar — mas mandar para
  // `/login` fechava o círculo: quem entrasse de novo voltaria para cá. A saída
  // é a tela que CRIA a organização que falta.
  if (!activeOrg) redirect("/get-started");

  const { state, onboardedAt } = await loadOnboardingState(activeOrg.orgId);
  if (onboardedAt) redirect("/app/inbox");

  // Os passos que ESTA instalação oferece, com o que já foi resolvido. O
  // indicador não decide mais nada sozinho — ele desenha o que recebe.
  const passos = passosVisiveis({ lojaLigada: env.NUVEMSHOP_ENABLED }).map((p) => ({
    segmento: p.segmento,
    rotulo: p.rotulo,
    cumprido: p.cumprido(state),
  }));

  const isDev = process.env.NODE_ENV !== "production";
  const marca = branding();

  return (
    <IdiomaProvider locale={user.idioma}>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_12%_0%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_42%),radial-gradient(circle_at_92%_2%,color-mix(in_srgb,var(--color-accent)_10%,transparent),transparent_34%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--color-text)_1px,transparent_1px),linear-gradient(90deg,var(--color-text)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_48%)] [background-size:56px_56px] opacity-[0.035]"
        />
        <header className="relative border-b border-border/80 bg-bg/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-10 lg:py-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0">
                {marcaEhADoProduto(marca) ? (
                  <div className="flex items-center gap-2.5" data-testid="group-brand-logo">
                    <GroupLogo className="h-10 w-[4.75rem]" decorative />
                    <span className="text-sm font-bold tracking-[-0.03em] text-text">GroupCRM</span>
                  </div>
                ) : marca.logoUrl ? (
                  // A logo configurada pelo administrador deve aparecer no onboarding
                  // desde o primeiro passo, não só depois que o time entra no app.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={marca.logoUrl}
                    alt={marca.name}
                    className="max-h-10 w-auto max-w-[180px] object-contain"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                    {marca.initial}
                  </div>
                )}
              </div>
              <div className="hidden h-9 w-px bg-border sm:block" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.24em] text-accent uppercase">
                  Configuração inicial · GroupCRM
                </p>
                <h1 className="truncate text-sm font-semibold tracking-tight text-text sm:text-base">
                  {activeOrg.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/*
                A SAÍDA, para quem tem outra organização. Ver o cabeçalho de
                `OutrasOrganizacoes`: sem ela, trocar de organização pelo seletor
                do topo levava a um wizard sem porta de volta — o layout de `/app`
                sai da árvore e leva o `TenantSwitcher` junto.
              */}
              <OutrasOrganizacoes
                outras={user.organizations
                  .filter((o) => o.organization_id !== activeOrg.orgId)
                  .map((o) => ({ id: o.organization_id, nome: o.organization_name }))}
              />
              {isDev ? <SkipToEnd /> : null}
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl px-5 pb-5 lg:px-10">
            <Stepper passos={passos} />
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-6xl flex-1 px-5 py-8 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </IdiomaProvider>
  );
}
