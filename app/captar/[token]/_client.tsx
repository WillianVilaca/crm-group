"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { CAMPOS_DE_SEGURO } from "@/lib/seguros/campos";

interface CaptureFormProps {
  endpoint: string;
  brandName: string;
  logoUrl: string | null;
}

type FormState = Record<string, string>;

const INITIAL_DATA: FormState = {
  nome: "",
  telefone: "",
  email: "",
  consentimento_marketing: "",
};

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

const controlClassName =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20";

export function CaptureForm({ endpoint, brandName, logoUrl }: CaptureFormProps) {
  const [data, setData] = useState<FormState>(INITIAL_DATA);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    setData((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          consentimento_marketing: data.consentimento_marketing === "true",
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "Não foi possível enviar seus dados agora.");
      }

      setStatus("success");
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error ? caught.message : "Não foi possível enviar seus dados agora.",
      );
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative isolate mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="pointer-events-none absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 -bottom-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />

        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
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

          <div className="max-w-xl py-16 lg:py-24">
            <p className="mb-5 text-xs font-semibold tracking-[0.24em] text-accent uppercase">
              Proteção que acompanha sua rotina
            </p>
            <h1 className="max-w-lg font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">
              Seu veículo protegido. Sua cabeça tranquila.
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
              Conte um pouco sobre o seu veículo. Nossa equipe analisa seu perfil e entra em contato
              com uma orientação clara para o próximo passo.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-border pt-6 text-sm">
              <div>
                <p className="font-semibold text-foreground">01</p>
                <p className="mt-1 text-muted-foreground">Você preenche</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">02</p>
                <p className="mt-1 text-muted-foreground">A equipe analisa</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">03</p>
                <p className="mt-1 text-muted-foreground">Você decide</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Seus dados são usados somente para retornar sobre esta solicitação.
          </p>
        </section>

        <section className="flex items-center px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_80px_-32px_rgba(20,35,25,0.45)] sm:p-8">
            {status === "success" ? (
              <div className="flex min-h-[34rem] flex-col justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-xl text-accent">
                  ✓
                </span>
                <h2 className="mt-6 font-serif text-4xl tracking-[-0.035em]">
                  Recebemos seus dados.
                </h2>
                <p className="mt-4 max-w-sm leading-7 text-muted-foreground">
                  Obrigado pelo interesse. A equipe da {brandName} vai analisar as informações e
                  falar com você em breve.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
                    Cotação inicial
                  </p>
                  <h2 className="mt-2 font-serif text-4xl tracking-[-0.035em]">Vamos começar?</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Leva menos de dois minutos. Os campos do veículo são opcionais.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="capture-name">Seu nome</FieldLabel>
                      <input
                        id="capture-name"
                        name="nome"
                        autoComplete="name"
                        required
                        value={data.nome}
                        onChange={(event) => update("nome", event.target.value)}
                        className={controlClassName}
                        placeholder="Como podemos chamar você?"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="capture-phone">WhatsApp</FieldLabel>
                      <input
                        id="capture-phone"
                        name="telefone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={data.telefone}
                        onChange={(event) => update("telefone", event.target.value)}
                        className={controlClassName}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="capture-email">E-mail</FieldLabel>
                      <input
                        id="capture-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(event) => update("email", event.target.value)}
                        className={controlClassName}
                        placeholder="voce@email.com"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <p className="mb-4 text-sm font-semibold text-foreground">Sobre o veículo</p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {CAMPOS_DE_SEGURO.filter(
                        (campo) => campo.key !== "observacoes" && campo.key !== "tipo_protecao",
                      ).map((campo) => (
                        <div key={campo.key}>
                          <FieldLabel htmlFor={`capture-${campo.key}`}>{campo.label}</FieldLabel>
                          {campo.type === "select" ? (
                            <select
                              id={`capture-${campo.key}`}
                              value={data[campo.key] ?? ""}
                              onChange={(event) => update(campo.key, event.target.value)}
                              className={controlClassName}
                            >
                              <option value="">Selecione</option>
                              {campo.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={`capture-${campo.key}`}
                              type={campo.type === "number" ? "number" : "text"}
                              inputMode={campo.type === "number" ? "numeric" : undefined}
                              value={data[campo.key] ?? ""}
                              onChange={(event) => update(campo.key, event.target.value)}
                              className={controlClassName}
                              placeholder={campo.label}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="capture-protection">
                      Que tipo de proteção você procura?
                    </FieldLabel>
                    <select
                      id="capture-protection"
                      value={data.tipo_protecao ?? ""}
                      onChange={(event) => update("tipo_protecao", event.target.value)}
                      className={controlClassName}
                    >
                      <option value="">Ainda não sei</option>
                      {CAMPOS_DE_SEGURO.find(
                        (campo) => campo.key === "tipo_protecao",
                      )?.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel htmlFor="capture-notes">Alguma observação?</FieldLabel>
                    <textarea
                      id="capture-notes"
                      rows={3}
                      value={data.observacoes ?? ""}
                      onChange={(event) => update("observacoes", event.target.value)}
                      className={`${controlClassName} h-auto resize-none py-3`}
                      placeholder="Ex.: uso o veículo para trabalho, tenho seguro atual..."
                    />
                  </div>

                  <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                      checked={data.consentimento_marketing === "true"}
                      onChange={(event) =>
                        update("consentimento_marketing", event.target.checked ? "true" : "false")
                      }
                    />
                    <span>
                      Autorizo o contato sobre esta solicitação e informações relacionadas à
                      proteção do meu veículo.
                    </span>
                  </label>

                  {status === "error" ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
                  >
                    {status === "sending" ? "Enviando..." : "Quero receber contato"}
                  </button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Sem compromisso. A decisão é sempre sua.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
