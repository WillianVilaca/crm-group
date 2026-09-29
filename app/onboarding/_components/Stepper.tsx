"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/hooks/i18n/useT";

import { cn } from "@/lib/utils";

export interface PassoVisivel {
  segmento: string;
  rotulo: string;
  cumprido: boolean;
}

/**
 * O indicador de progresso.
 *
 * Duas coisas mudaram, e as duas eram defeito:
 *
 * 1. A lista era FIXA aqui dentro. Ela mostrava "Loja" mesmo quando a
 *    integração estava desligada — o padrão de toda instalação pelo kit — e a
 *    pessoa via um passo que nunca lhe seria oferecido. Agora os passos chegam
 *    de `lib/onboarding/passos.ts`, a mesma fonte que decide a ordem e monta o
 *    resumo final.
 *
 * 2. "Concluído" era `índice < atual`: bastava estar num passo adiante para os
 *    anteriores ficarem verdes, inclusive os que a pessoa pulou e os que nunca
 *    apareceram. Agora quem responde é o estado gravado.
 *
 * O passo ATUAL continua saindo da rota — o header `x-pathname` que alimentava
 * isso antes nunca era escrito por ninguém, e o indicador ficava travado no
 * primeiro passo o wizard inteiro.
 */
export function Stepper({ passos }: { passos: PassoVisivel[] }) {
  const t = useT();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const idx = passos.findIndex((p) => pathname.includes(`/${p.segmento}`));
  const passoAtual = idx >= 0 ? idx + 1 : 1;
  const progresso = idx > 0 && passos.length > 1 ? `${(idx / (passos.length - 1)) * 100}%` : "0%";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[0.2em] text-text-subtle uppercase">
        <span>Seu setup</span>
        <span className="font-mono tracking-normal text-text-muted">
          Etapa {passoAtual} de {passos.length}
        </span>
      </div>
      {idx > 0 && (
        <p className="text-[11px] text-text-subtle">
          {t("Clique em uma etapa concluída para revisar suas escolhas.")}
        </p>
      )}
      <ol
        aria-label="onboarding steps"
        className="relative flex w-full [scrollbar-width:none] items-start gap-2 overflow-x-auto px-1 pt-2 pb-1 [&::-webkit-scrollbar]:hidden"
      >
        <span
          aria-hidden
          className="absolute top-[22px] right-6 left-6 h-px rounded-full bg-border"
        />
        <span
          aria-hidden
          className="absolute top-[22px] left-6 h-px rounded-full bg-accent transition-[width] duration-slow ease-out"
          style={{ width: `calc(${progresso} - 12px)` }}
        />
        {passos.map((p, i) => {
          const isActive = i === idx;
          const podeRevisar = i < idx && p.cumprido;
          const visual = (
            <>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border bg-bg text-[11px] font-semibold shadow-xs transition-[background-color,border-color,color,transform] duration-base",
                  isActive &&
                    "h-8 w-8 -translate-y-px border-accent bg-accent text-accent-foreground shadow-md shadow-accent/20",
                  !isActive &&
                    p.cumprido &&
                    "border-accent/60 bg-accent-soft text-accent group-hover:-translate-y-px group-hover:border-accent group-hover:shadow-md group-hover:shadow-accent/15",
                  !isActive && !p.cumprido && "border-border-strong text-text-subtle",
                )}
              >
                {!isActive && p.cumprido ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "mt-2 max-w-[108px] truncate text-center text-[11px] leading-tight sm:max-w-[130px] sm:text-xs",
                  isActive
                    ? "font-semibold text-text"
                    : "text-text-muted group-hover:font-medium group-hover:text-accent",
                )}
              >
                {t(p.rotulo)}
              </span>
            </>
          );
          return (
            <li
              key={p.segmento}
              aria-current={isActive ? "step" : undefined}
              className="relative z-10 flex min-w-[86px] flex-1 flex-col items-center text-xs sm:min-w-0"
            >
              {podeRevisar ? (
                <button
                  type="button"
                  title={`${t("Revisar")} ${t(p.rotulo)}`}
                  aria-label={`${t("Revisar etapa")} ${t(p.rotulo)}`}
                  onClick={() => router.push(`/onboarding/${p.segmento}`)}
                  className="group flex w-full cursor-pointer flex-col items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {visual}
                </button>
              ) : (
                visual
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
