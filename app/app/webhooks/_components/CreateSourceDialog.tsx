"use client";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateWebhookSource,
  usePipelines,
  usePipelineStages,
  type WebhookSourceRow,
} from "@/hooks/webhooks/useWebhookSources";
import { useT } from "@/hooks/i18n/useT";
import type { ModoDeCaptura } from "@/lib/webhooks/captura";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (source: WebhookSourceRow) => void;
}

export function CreateSourceDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();
  const [name, setName] = React.useState("");
  const [pipelineId, setPipelineId] = React.useState<string>("");
  const [stageId, setStageId] = React.useState<string>("");
  const [redirectTo, setRedirectTo] = React.useState("");
  const [captureMode, setCaptureMode] = React.useState<ModoDeCaptura>("crm");
  const [captureHtml, setCaptureHtml] = React.useState("");
  const [fileName, setFileName] = React.useState("");

  const { data: pipelinesRes, isLoading: pipelinesLoading } = usePipelines();
  const { data: boardRes, isLoading: stagesLoading } = usePipelineStages(pipelineId || null);
  const create = useCreateWebhookSource();

  const pipelines = pipelinesRes?.data ?? [];
  const stages = boardRes?.data?.stages ?? [];

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPipelineId("");
      setStageId("");
      setRedirectTo("");
      setCaptureMode("crm");
      setCaptureHtml("");
      setFileName("");
    }
  }, [open]);

  React.useEffect(() => {
    setStageId("");
  }, [pipelineId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineId || !stageId) {
      toast.error(t("Escolha o funil e o estágio de entrada."));
      return;
    }
    try {
      const res = await create.mutateAsync({
        name,
        default_pipeline_id: pipelineId,
        default_stage_id: stageId,
        redirect_to: redirectTo.trim() || undefined,
        capture_mode: captureMode,
        capture_html: captureMode === "html" ? captureHtml : undefined,
      });
      toast.success(t("Fonte criada. Agora é só conectar seu site."));
      onOpenChange(false);
      onCreated(res.data);
    } catch {
      /* erro já mostrado pelo showApiError */
    }
  };

  const readHtmlFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCaptureHtml(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Nova fonte de captação")}</DialogTitle>
          <DialogDescription>
            {t(
              "Dê um nome, escolha a página de captação e diga em qual funil o contato deve entrar.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="src-name">{t("Nome")}</Label>
            <Input
              id="src-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Landing page de Black Friday")}
              minLength={1}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Página de captação")}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={captureMode === "crm"}
                onClick={() => setCaptureMode("crm")}
                className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                  captureMode === "crm"
                    ? "border-accent bg-accent/10 text-text"
                    : "border-border text-muted-foreground hover:border-border-strong"
                }`}
              >
                <span className="block font-medium">{t("Página do GroupCRM")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("Use a landing pronta e personalizada pela marca.")}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={captureMode === "html"}
                onClick={() => setCaptureMode("html")}
                className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                  captureMode === "html"
                    ? "border-accent bg-accent/10 text-text"
                    : "border-border text-muted-foreground hover:border-border-strong"
                }`}
              >
                <span className="block font-medium">{t("HTML próprio")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("Cole ou envie a página que sua equipe já usa.")}
                </span>
              </button>
            </div>
          </div>
          {captureMode === "html" ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-2">
                <Label htmlFor="src-html-file">{t("Enviar arquivo .html")}</Label>
                <Input
                  id="src-html-file"
                  type="file"
                  accept=".html,text/html"
                  onChange={(event) => readHtmlFile(event.target.files?.[0])}
                />
                {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="src-html">{t("Ou cole o HTML")}</Label>
                <Textarea
                  id="src-html"
                  value={captureHtml}
                  onChange={(event) => setCaptureHtml(event.target.value)}
                  placeholder={'<form method="POST">...'}
                  rows={7}
                  required
                  className="font-mono text-xs"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {t(
                    "O primeiro formulário será ligado ao CRM. Use name=nome, name=telefone e name=email. Scripts e eventos inline são bloqueados por segurança.",
                  )}
                </p>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{t("Funil de entrada")}</Label>
            <Select value={pipelineId} onValueChange={setPipelineId} disabled={pipelinesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={t("Escolha o funil")} />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Estágio de entrada")}</Label>
            <Select
              value={stageId}
              onValueChange={setStageId}
              disabled={!pipelineId || stagesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={pipelineId ? t("Escolha o estágio") : t("Escolha o funil primeiro")}
                />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="src-redirect">{t("URL de obrigado (opcional)")}</Label>
            <Input
              id="src-redirect"
              type="url"
              value={redirectTo}
              onChange={(e) => setRedirectTo(e.target.value)}
              placeholder="https://tusitio.com/gracias"
            />
            <p className="text-xs text-muted-foreground">
              {t("Para onde enviar a pessoa depois que ela preencher seu formulário.")}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("Cancelar")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("Criar fonte")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
