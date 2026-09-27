import Link from "next/link";

interface CaptureSuccessProps {
  brandName: string;
  logoUrl: string | null;
}

export function CaptureSuccess({ brandName, logoUrl }: CaptureSuccessProps) {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-between">
        <header className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName}
              className="h-9 w-auto max-w-[10rem] object-contain"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
              {brandName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold tracking-tight">{brandName}</span>
        </header>

        <section className="max-w-2xl py-20">
          <p className="text-xs font-semibold tracking-[0.24em] text-accent uppercase">
            Solicitação recebida
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-7xl">
            Está tudo certo por aqui.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Seus dados chegaram para a equipe da {brandName}. Em breve alguém vai entrar em contato
            para orientar o próximo passo.
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            Voltar
          </Link>
        </section>

        <p className="text-xs text-muted-foreground">Sem compromisso. A decisão é sempre sua.</p>
      </div>
    </main>
  );
}
