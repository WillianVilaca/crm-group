import type { RetratoDaInstalacao } from "@/lib/instalacao/retrato";
import type { Idioma } from "@/lib/i18n/idiomas";
import { traduzir } from "@/lib/i18n/dicionario";
import { CheckCircle, Warning } from "@/lib/ui/icons";

/**
 * A primeira coisa que a pessoa lê no wizard: o que ela JÁ tem.
 *
 * Quem chega aqui acabou de instalar o sistema num servidor — escolheu a
 * inteligência artificial, colou a chave, subiu o WhatsApp — e era recebido por
 * um formulário em branco, como se tivesse acabado de chegar. Começar pelo que
 * já está pronto muda a pergunta de "quanto trabalho me espera?" para "o que
 * falta?".
 *
 * Cada linha é MEDIDA, nunca presumida. É o oposto do aviso que o painel de
 * provedores dá hoje ("tudo usa a chave que veio na instalação"), disparado sem
 * verificar se existe chave — a frase que tranquiliza enquanto o funcionário
 * está mudo.
 */
export function JaEstaPronto({
  retrato,
  idioma,
}: {
  retrato: RetratoDaInstalacao;
  idioma: Idioma;
}) {
  const t = (texto: string) => traduzir(texto, idioma);
  const itens: { pronto: boolean; texto: string }[] = [
    {
      pronto: true,
      texto: t("Servidor no ar e banco de dados instalado"),
    },
    {
      // Três estados, não dois: cadastrada-e-confirmada, cadastrada-e-sendo-
      // conferida, e nenhuma. A do meio existe porque a validação roda em
      // segundo plano — e dizer "falta a chave" a quem acabou de colá-la é a
      // frase que manda a pessoa cadastrar de novo o que já está lá.
      pronto: retrato.inteligencia.origemDaChave !== "nenhuma",
      texto:
        retrato.inteligencia.origemDaChave !== "nenhuma"
          ? `${t("Inteligência contratada:")} ${retrato.inteligencia.rotulo}`
          : retrato.inteligencia.chaveEmVerificacao
            ? t("Chave cadastrada — conferindo com a empresa de IA")
            : t("Falta a chave da inteligência artificial"),
    },
    {
      pronto: retrato.whatsapp.transporteApontado,
      texto: retrato.whatsapp.transporteApontado
        ? t("WhatsApp pronto para conectar seu número")
        : t("O WhatsApp desta instalação ainda não subiu"),
    },
    {
      pronto: Boolean(retrato.funil),
      texto: retrato.funil
        ? `${t("Funil de vendas criado:")} ${retrato.funil.nome}`
        : t("Nenhum funil de vendas ainda"),
    },
  ];

  const faltando = itens.filter((i) => !i.pronto).length;
  const prontos = itens.length - faltando;

  return (
    <section
      aria-labelledby="ja-pronto"
      className="relative overflow-hidden rounded-2xl border border-border/90 bg-surface/90 p-5 shadow-md"
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">
            Raio-x da instalação
          </p>
          <h3 id="ja-pronto" className="mt-2 text-sm font-semibold text-text">
            {t("Você já instalou o sistema. Isto aqui já está de pé:")}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
          {prontos}/{itens.length} prontos
        </span>
      </div>
      <ul className="mt-5 space-y-2">
        {itens.map((it) => (
          <li
            key={it.texto}
            className={
              "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm " +
              (it.pronto
                ? "border-success/20 bg-success-bg/45 text-text"
                : "border-warning/20 bg-warning-bg/35 text-text-muted")
            }
          >
            {it.pronto ? (
              <CheckCircle
                aria-hidden
                size={17}
                weight="fill"
                className="mt-0.5 shrink-0 text-success"
              />
            ) : (
              <Warning
                aria-hidden
                size={17}
                weight="fill"
                className="mt-0.5 shrink-0 text-warning"
              />
            )}
            <span>{it.texto}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        {faltando === 0
          ? t("Agora é montar quem vai atender por você.")
          : t("O que falta a gente resolve nos próximos passos.")}
      </p>
    </section>
  );
}
