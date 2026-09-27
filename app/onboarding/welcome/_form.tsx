"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/hooks/i18n/useT";

import { acceptWelcome } from "@/app/actions/onboarding/acceptWelcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Cidade, não identificador de fuso. A lista mostrava "America/Bahia" e
 * "America/Fortaleza" e esperava que a pessoa soubesse em qual delas mora — o
 * identificador é do sistema, o que ela reconhece é a cidade.
 */
const FUSOS: { id: string; cidade: string }[] = [
  { id: "America/Sao_Paulo", cidade: "São Paulo, Rio, Brasília, Sul e Sudeste" },
  { id: "America/Recife", cidade: "Recife, Salvador, Fortaleza e Nordeste" },
  { id: "America/Belem", cidade: "Belém e Pará" },
  { id: "America/Manaus", cidade: "Manaus e Amazonas" },
  { id: "America/Cuiaba", cidade: "Cuiabá e Mato Grosso" },
  { id: "America/Rio_Branco", cidade: "Rio Branco e Acre" },
  { id: "America/Argentina/Buenos_Aires", cidade: "Buenos Aires" },
  { id: "Europe/Lisbon", cidade: "Lisboa" },
  { id: "Europe/Madrid", cidade: "Madri" },
  { id: "America/New_York", cidade: "Nova York" },
  { id: "America/Los_Angeles", cidade: "Los Angeles" },
  { id: "UTC", cidade: "Outro (horário universal)" },
];

export function WelcomeForm({ defaultOrgName }: { defaultOrgName: string }) {
  const t = useT();
  const [displayName, setDisplayName] = useState(defaultOrgName);
  const [oQueFaz, setOQueFaz] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="overflow-hidden rounded-2xl border border-border/90 bg-surface/90 shadow-lg"
      action={(formData) => {
        if (!accepted) {
          toast.error(t("Aceite os termos para continuar."));
          return;
        }
        startTransition(async () => {
          const res = await acceptWelcome(formData);
          if (res && !res.ok) {
            toast.error(`Falha: ${res.error}`);
          }
        });
      }}
    >
      <div className="border-b border-border/80 bg-surface-elevated/45 px-6 py-5 sm:px-7">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">
          Perfil da operação
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-text">
          Conte o essencial para começar.
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          Você poderá ajustar essas informações depois, nas configurações do GroupCRM.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-7 sm:py-7">
        <div className="space-y-2">
          <Label htmlFor="display_name">{t("Como se chama o seu negócio?")}</Label>
          <Input
            id="display_name"
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={120}
            required
            className="h-11 rounded-lg bg-bg/50"
          />
          <p className="text-xs leading-relaxed text-text-muted">
            {t(
              "É o nome que aparece para o seu time e nos relatórios. Pode ser clínica, loja, escritório — o que for seu.",
            )}
          </p>
        </div>

        {/*
        A pergunta que faltava no produto inteiro. Sem ela, o funcionário nasce
        se apresentando como atendente de uma "loja online" — era o que os três
        modelos de prompt diziam — e o quadro de clientes nasce com as colunas
        de e-commerce que o gatilho semeia. Os dois defeitos têm a mesma origem:
        uma instalação que nunca pergunta em que ramo entrou.
      */}
        <div className="space-y-2">
          <Label htmlFor="o_que_faz">{t("O que vocês fazem?")}</Label>
          <Input
            id="o_que_faz"
            name="o_que_faz"
            value={oQueFaz}
            onChange={(e) => setOQueFaz(e.target.value)}
            maxLength={280}
            placeholder={t("Ex.: clínica odontológica, ou venda de roupa fitness pelo WhatsApp")}
            className="h-11 rounded-lg bg-bg/50"
          />
          <p className="text-xs leading-relaxed text-text-muted">
            {t(
              "Uma linha basta. É com isso que seu funcionário aprende com quem ele está falando — e que a gente monta o quadro de clientes do seu jeito.",
            )}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">{t("Onde você atende")}</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="h-11 rounded-lg bg-bg/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUSOS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {t(f.cidade)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="timezone" value={timezone} />
          <p className="text-xs leading-relaxed text-text-muted">
            {t("Decide o horário em que seu funcionário pode falar com clientes.")}
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-bg/35 p-3 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
            required
          />
          <span className="leading-relaxed text-text-muted">
            {t("Li e aceito os")}{" "}
            <a
              className="font-medium text-text underline underline-offset-2"
              href="/legal/terms"
              target="_blank"
              rel="noreferrer"
            >
              {t("Termos de Uso")}
            </a>{" "}
            {t("e a")}{" "}
            <a
              className="font-medium text-text underline underline-offset-2"
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
            >
              {t("Política de Privacidade")}
            </a>
            .
          </span>
        </label>

        <div className="flex flex-col gap-3 border-t border-border/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-subtle">Leva menos de um minuto.</p>
          <Button
            type="submit"
            disabled={pending || !accepted}
            className="w-full rounded-lg sm:w-auto"
          >
            {pending ? t("Salvando...") : t("Continuar")}
          </Button>
        </div>
      </div>
    </form>
  );
}
