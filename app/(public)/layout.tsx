import { marcaEhADoProduto } from "@/lib/branding";
import { marcaDaSaida, type MarcaDeSaida } from "@/lib/branding/saida";
import { createClient } from "@/lib/supabase/server";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

/**
 * Casca compartilhada das telas públicas: login, cadastro, recuperação e MFA.
 * A marca é resolvida aqui para que todas essas telas mantenham a mesma fachada.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const marca = await marcaDaSaida(null);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = (user?.user_metadata?.locale as string | undefined) ?? null;

  return (
    <IdiomaProvider locale={locale}>
      <main className="relative min-h-screen overflow-hidden bg-[#edf8fd] px-3 py-3 text-[#10283b] dark:bg-[#061321] dark:text-[#edf8fd] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-100"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 12%, rgba(39,193,237,0.2), transparent 28%), radial-gradient(circle at 92% 88%, rgba(6,111,174,0.14), transparent 30%)",
          }}
        />
        <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[28px] border border-[#b7dced]/70 bg-white/70 shadow-[0_28px_90px_-38px_rgba(4,64,101,0.6)] dark:border-white/10 dark:bg-[#091a2a]/80 dark:shadow-[0_28px_90px_-38px_rgba(0,0,0,0.75)] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden bg-[#09233a] p-7 text-white sm:p-10 lg:min-h-0 lg:p-14">
            <div
              aria-hidden="true"
              className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#27c1ed]/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-40 right-[-8%] h-[30rem] w-[30rem] rounded-full bg-[#066fae]/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
              }}
            />

            <div className="relative z-10 flex items-start justify-between gap-6">
              <MarcaDaFachada marca={marca} />
              <span className="hidden rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70 sm:inline-flex">
                Operação comercial
              </span>
            </div>

            <div className="relative z-10 mt-16 max-w-xl lg:mt-0">
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7ddcf5]">
                Centro de comando
              </p>
              <h2 className="max-w-lg text-4xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Seu comercial em movimento.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-blue-100/65 sm:text-base">
                Leads, atendimento e vendas reunidos em uma operação clara, ágil e pronta para crescer.
              </p>

              <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-white/15 pt-5">
                <div>
                  <p className="font-mono text-xs text-[#7ddcf5]">01</p>
                  <p className="mt-2 text-xs text-blue-100/60">Captação</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-[#7ddcf5]">02</p>
                  <p className="mt-2 text-xs text-blue-100/60">Rodízio</p>
                </div>
                <div>
                  <p className="font-mono text-xs text-[#7ddcf5]">03</p>
                  <p className="mt-2 text-xs text-blue-100/60">Conversão</p>
                </div>
              </div>
            </div>

            <p className="relative z-10 mt-12 text-xs text-blue-100/45">
              GroupCRM <span className="mx-2 text-white/25">·</span> atendimento que vira venda
            </p>
          </section>

          <section className="flex items-center bg-white/70 p-6 dark:bg-[#0b1724]/80 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">{children}</div>
          </section>
        </div>
      </main>
    </IdiomaProvider>
  );
}

function MarcaDaFachada({ marca }: { marca: MarcaDeSaida }) {
  const ehMarcaPadrao = marcaEhADoProduto({ name: marca.nome, logoUrl: null });

  return (
    <div className="flex items-center gap-4">
      {marca.logoUrl ? (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.7)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="logo-da-fachada"
            src={marca.logoUrl}
            alt={marca.nome}
            className="h-full w-full object-contain"
          />
        </div>
      ) : ehMarcaPadrao ? (
        <div
          role="img"
          aria-label={marca.nome}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#02080e] shadow-[0_12px_30px_-16px_rgba(39,193,237,0.8)]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-[-8%] bg-contain bg-center bg-no-repeat mix-blend-screen"
            style={{ backgroundImage: "url('/branding/group-3989-blue.jpg')" }}
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0b6fae] text-2xl font-bold text-white shadow-[0_12px_30px_-16px_rgba(39,193,237,0.8)]">
          {[...marca.nome][0]?.toUpperCase() ?? "G"}
        </div>
      )}
      <div>
        <p className="text-lg font-bold tracking-[-0.03em] text-white">{marca.nome}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-100/55">
          CRM de crescimento
        </p>
      </div>
    </div>
  );
}
