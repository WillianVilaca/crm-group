import { emailConfigurado } from "@/lib/email/roteador";
import { InviteTeamForm } from "./_form";
import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

export default async function InviteTeamPage() {
  const user = await requireAuth();
  const idioma = user.idioma;
  const emailReady = await emailConfigurado();
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-accent/25 bg-surface/80 p-7 shadow-xl sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />
        <p className="text-[10px] font-semibold tracking-[0.24em] text-accent uppercase">
          Sexto passo · equipe
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text sm:text-4xl">
          {traduzir("Quem trabalha com ele", idioma)}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
          {traduzir(
            "Seu funcionário não trabalha sozinho: quando ele passar uma conversa adiante, é uma dessas pessoas que atende.",
            idioma,
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-text-muted">
          <span className="rounded-full border border-border bg-bg/60 px-3 py-1.5">
            Convites por e-mail
          </span>
          <span className="rounded-full border border-border bg-bg/60 px-3 py-1.5">
            Papéis e permissões
          </span>
          <span className="rounded-full border border-border bg-bg/60 px-3 py-1.5">
            Acesso revogável
          </span>
        </div>
      </header>
      {!emailReady ? (
        <div className="rounded-2xl border border-warning/40 bg-warning-bg/55 p-5 text-sm text-warning-fg shadow-xs">
          <p className="font-medium">
            {traduzir("Esta instalação ainda não envia e-mail.", idioma)}
          </p>
          {/*
            A frase anterior dizia que os convites ficariam "registrados
            localmente" — e isso é falso: não existe tabela de convites, o
            convite É o link assinado. Quem confiasse na frase iria procurar
            depois uma lista de pendentes que nunca existiu. E o nome da
            variável de ambiente não ajuda quem só quer chamar um colega.
          */}
          <p className="mt-1">
            {traduzir(
              "Você recebe um link para cada pessoa e manda por onde quiser — WhatsApp, e-mail, o que preferir. O link é o convite: quem abrir entra na sua empresa.",
              idioma,
            )}
          </p>
        </div>
      ) : null}
      <InviteTeamForm />
    </div>
  );
}
