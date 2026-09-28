import { cn } from "@/lib/utils";

type Props = {
  readonly className?: string;
  readonly decorative?: boolean;
};

/**
 * Recorte horizontal da marca Group 3989 para áreas pequenas da interface.
 *
 * A arte original é quadrada e foi criada para peças de marca. O recorte
 * mantém o arco e a palavra "Group" legíveis no cabeçalho sem transformar a
 * logo em uma miniatura ilegível. `mix-blend-screen` remove o fundo preto da
 * foto e preserva o azul da marca nos dois temas.
 */
export function GroupLogo({ className, decorative = false }: Props) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Group 3989"}
      aria-hidden={decorative ? true : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/group-3989-blue.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[50%_30%] mix-blend-screen"
      />
    </span>
  );
}
