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
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="max-w-3xl">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-accent uppercase">
          Segundo passo · canal de atendimento
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-text sm:text-4xl">
          {traduzir("Dê um telefone a ele", idioma)}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-text-muted">
          {traduzir(
            "É por este número que ele vai atender seus clientes. Se você conecta pelo celular, tenha ele por perto.",
            idioma,
          )}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          {traduzir(
            "Novos canais começam em modo de teste. Após concluir a configuração, abra Conexões para autorizar seus números de teste ou liberar o público.",
            idioma,
          )}
        </p>
      </header>
      <div className="rounded-xl border border-accent/20 bg-accent-soft/35 px-4 py-3 text-sm text-text-muted">
        <strong className="font-semibold text-text">
          Escolha o cenário que combina com o seu número.
        </strong>{" "}
        O GroupCRM não cria uma sessão sem você escolher como esse WhatsApp será conectado.
      </div>
      <ConnectWhatsappClient
        wahaConfigured={wahaConfigured}
        sessionName={nomeCurtoDaSessao(activeOrg.orgId)}
        oficialPodeReceber={oficialPodeReceber}
      />
    </div>
  );
}
