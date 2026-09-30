"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import { useT } from "@/hooks/i18n/useT";
import type { HistoryStatus } from "@/lib/channels/history-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowsClockwise, CheckCircle, CircleNotch, ClockCounterClockwise, ImageIcon, Warning } from "@/lib/ui/icons";

type Operation = "history" | "photos";
type HistoryPage = { imported: number; skipped: number; scanned: number; done: boolean; cursor: string | null };
type PhotoPage = { updated: number; no_picture: number; failed: number; scanned: number; done: boolean; after_id: string | null };
const EMPTY = { scanned: 0, imported: 0, skipped: 0, updated: 0, no_picture: 0, failed: 0 };

export function ContactHistoryDialog({ channelId, label, onClose }: { channelId: string; label: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["channel-history-status", channelId],
    queryFn: async () => (await apiClient.get<ApiSuccess<HistoryStatus>>(`/api/v1/channel-sessions/${channelId}/history`)).data });
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState(EMPTY);
  const pause = useRef(false);
  const busy = useRef(false);
  const cursor = useRef<string | null>(null);
  useEffect(() => () => { pause.current = true; }, []);

  async function run(kind: Operation, resume = false) {
    if (busy.current) return;
    busy.current = true; pause.current = false;
    setRunning(true); setPausing(false); setFinished(false); setError(null); setOperation(kind);
    if (!resume) { cursor.current = null; setCounts(EMPTY); }
    try {
      while (!pause.current) {
        let done: boolean;
        if (kind === "history") {
          const { data } = await apiClient.post<ApiSuccess<HistoryPage>>(`/api/v1/channel-sessions/${channelId}/history`,
            { days, ...(cursor.current ? { cursor: cursor.current } : {}) }, { timeoutMs: 120_000 });
          cursor.current = data.cursor; done = data.done;
          setCounts((c) => ({ ...c, imported: c.imported + data.imported, skipped: c.skipped + data.skipped, scanned: c.scanned + data.scanned }));
        } else {
          const { data } = await apiClient.post<ApiSuccess<PhotoPage>>(`/api/v1/channel-sessions/${channelId}/contact-photos`,
            cursor.current ? { after_id: cursor.current } : {}, { timeoutMs: 120_000 });
          cursor.current = data.after_id; done = data.done;
          setCounts((c) => ({ ...c, updated: c.updated + data.updated, no_picture: c.no_picture + data.no_picture, failed: c.failed + data.failed, scanned: c.scanned + data.scanned }));
        }
        if (done) { setFinished(true); break; }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Não foi possível concluir. Tente novamente."));
    } finally {
      busy.current = false; setRunning(false); setPausing(false);
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      void qc.invalidateQueries({ queryKey: ["messages"] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    }
  }

  function requestClose() {
    if (busy.current) { pause.current = true; setPausing(true); }
    else onClose();
  }

  return <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
    <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto rounded-2xl p-6 sm:p-7">
      <DialogHeader>
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClockCounterClockwise size={23} aria-hidden /></span>
        <DialogTitle>{t("Suas conversas, com mais contexto")}</DialogTitle>
        <DialogDescription>{label} · {t("Fotos e histórico do WhatsApp")}</DialogDescription>
      </DialogHeader>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon size={18} aria-hidden />{t("Fotos dos contatos")}</div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Busca as fotos disponíveis dos contatos deste número. Se a pessoa não compartilhar a foto, suas iniciais continuam aparecendo.")}</p>
        <Button variant="outline" size="sm" disabled={running} onClick={() => void run("photos")}><ArrowsClockwise size={15} aria-hidden />{t("Atualizar fotos")}</Button>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ClockCounterClockwise size={18} aria-hidden />{t("Histórico de mensagens")}</div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("Importa o histórico disponível, com as datas originais e sem duplicar mensagens. Conversas antigas não acionam IA nem automações e ficam em Todas ou Fechadas.")}</p>
        {status.isPending ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><CircleNotch size={15} className="animate-spin" aria-hidden />{t("Consultando o histórico disponível…")}</p>
          : status.isError ? <div role="alert" className="space-y-2 text-sm"><p>{t("Não foi possível consultar a disponibilidade do histórico.")}</p><Button size="sm" variant="outline" onClick={() => void status.refetch()}>{t("Tentar novamente")}</Button></div>
          : !status.data?.available ? <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm leading-relaxed">
            <p className="mb-1 flex items-center gap-2 font-medium"><Warning size={17} aria-hidden />{t(status.data?.reason === "storage_disabled" ? "Esta sessão ainda não armazena o histórico" : "Histórico indisponível nesta conexão")}</p>
            <p className="text-muted-foreground">{t(status.data?.reason === "storage_disabled"
              ? "A conexão atual continua funcionando. Quem administra o servidor precisa preparar o armazenamento antes de um novo pareamento. Nenhuma sessão será reiniciada por esta tela."
              : "Conecte o número e tente novamente. Algumas conexões não disponibilizam mensagens anteriores.")}</p>
          </div> : <>
            <label className="block space-y-1.5 text-sm"><span>{t("Período para importar")}</span>
              <select className="h-10 w-full rounded-lg border bg-background px-3" value={days} disabled={running || Boolean(operation === "history" && !finished)} onChange={(e) => setDays(Number(e.target.value) as 30 | 90 | 365)}>
                <option value={30}>{t("Últimos 30 dias")}</option><option value={90}>{t("Últimos 90 dias")}</option><option value={365}>{t("Último ano")}</option>
              </select>
            </label>
            <Button size="sm" disabled={running} onClick={() => void run("history")}>{t("Importar histórico")}</Button>
          </>}
        <p className="text-xs leading-relaxed text-muted-foreground">{t("Não é um backup completo: só entram as mensagens disponibilizadas pelo WhatsApp. Grupos e arquivos antigos não são importados nesta etapa.")}</p>
      </section>
      {operation && <div aria-live="polite" className="space-y-3 rounded-xl border bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">{running ? <CircleNotch size={18} className="animate-spin text-primary" aria-hidden /> : finished ? <CheckCircle size={18} className="text-emerald-500" aria-hidden /> : null}
          {t(running ? pausing ? "Pausando após o lote atual…" : operation === "history" ? "Importando mensagens…" : "Buscando fotos…" : finished ? "Consulta concluída" : "Operação pausada")}
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">{t(operation === "history" ? "Importadas" : "Fotos atualizadas")}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{operation === "history" ? counts.imported : counts.updated}</dd></div>
          <div><dt className="text-muted-foreground">{t(operation === "history" ? "Já existentes ou ignoradas" : "Sem foto disponível")}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{operation === "history" ? counts.skipped : counts.no_picture}</dd></div>
        </dl>
        {operation === "photos" && counts.failed > 0 && <p className="text-sm text-amber-600 dark:text-amber-400">{counts.failed} {t("contatos não puderam ser consultados. Tente atualizar as fotos novamente.")}</p>}
        {operation === "history" && finished && counts.scanned === 0 && <p className="text-sm text-muted-foreground">{t("Nenhuma mensagem foi disponibilizada para este período. Mensagens apagadas ou não sincronizadas não podem ser recuperadas por aqui.")}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {running ? <><p className="text-xs text-muted-foreground">{t("Mantenha esta janela aberta. Você pode pausar entre os lotes.")}</p><Button variant="outline" size="sm" disabled={pausing} onClick={() => { pause.current = true; setPausing(true); }}>{t("Pausar")}</Button></>
          : !finished ? <Button size="sm" onClick={() => void run(operation, true)}>{t(error ? "Tentar novamente" : "Continuar")}</Button>
          : <Button variant="outline" size="sm" asChild><Link href="/app/inbox">{t("Ver conversas na Inbox")}</Link></Button>}
      </div>}
    </DialogContent>
  </Dialog>;
}
