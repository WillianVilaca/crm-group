"use client";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import { ChatCircle, Clock, Robot, Users } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import type { InboxTab } from "./InboxFilters";

interface Props {
  onSelectTab: (tab: InboxTab) => void;
  hasSelection: boolean;
}

/** Resumo do trabalho real, com o mesmo escopo de acesso das abas da Inbox. */
export function InboxOverview({ onSelectTab, hasSelection }: Props) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const counts = useConversationCounts(activeOrg?.orgId ?? null);
  const firstName = user.full_name?.trim().split(/\s+/)[0];
  const canSeeAll = activeOrg?.role !== "agent" || activeOrg.visibility_mode === "all";
  const metrics = [
    ...(canSeeAll
      ? [
          {
            label: "Todas as conversas",
            value: counts.data?.all,
            tab: "all" as const,
            icon: ChatCircle,
            color: "text-accent bg-accent-soft",
          },
        ]
      : []),
    {
      label: "Na fila",
      value: counts.data?.fila ?? counts.data?.unassigned,
      tab: "unassigned" as const,
      icon: Clock,
      color: "text-warning bg-warning-bg",
    },
    {
      label: "Com você",
      value: counts.data?.mine,
      tab: "mine" as const,
      icon: Users,
      color: "text-success bg-success-bg",
    },
    {
      label: "No automático",
      value: counts.data?.automatico,
      tab: "ai" as const,
      icon: Robot,
      color: "text-info bg-info-bg",
    },
  ];

  return (
    <section
      className={cn(
        "mb-5 shrink-0 gap-4 md:grid 2xl:grid-cols-[230px_minmax(0,1fr)]",
        hasSelection && "hidden",
      )}
      aria-label={t("Resumo do atendimento")}
    >
      <div className="flex flex-col justify-center">
        <p className="mb-1 text-xs font-medium text-text-muted">
          {t("Sua central de atendimento")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {firstName ? `${t("Olá")}, ${firstName}!` : t("Inbox")}
        </h1>
        <p className="mt-1 hidden text-sm text-text-muted 2xl:block">
          {t("Cada conversa, mais perto de uma solução.")}
        </p>
      </div>
      <div className="hidden auto-cols-fr grid-flow-col gap-3 md:grid">
        {metrics.map(({ label, value, tab, icon: Icon, color }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className="inbox-metric flex min-w-0 items-center gap-3 rounded-xl p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden 2xl:p-4"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                color,
              )}
            >
              <Icon size={23} weight="duotone" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-text-muted">{t(label)}</span>
              <span className="mt-1 block text-2xl leading-none font-semibold text-text tabular-nums">
                {typeof value === "number" ? value.toLocaleString("pt-BR") : "—"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
