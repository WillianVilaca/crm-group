import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InboxOverview } from "@/components/inbox/InboxOverview";
import type { ConversationCounts } from "@/hooks/inbox/useConversationCounts";

const estado = vi.hoisted(() => ({
  role: "admin",
  visibility: "all",
  counts: undefined as ConversationCounts | undefined,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { full_name: "Willian Robert" },
    activeOrg: { orgId: "org-1", role: estado.role, visibility_mode: estado.visibility },
  }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: estado.counts }),
}));

beforeEach(() => {
  estado.role = "admin";
  estado.visibility = "all";
  estado.counts = { all: 7, fila: 2, unassigned: 2, mine: 1, automatico: 4 };
});
afterEach(cleanup);

describe("resumo acionável da Inbox Group", () => {
  it("mostra os contadores reais e abre a visão correspondente", () => {
    const selecionar = vi.fn();
    render(<InboxOverview onSelectTab={selecionar} hasSelection={false} />);
    expect(screen.getByRole("heading", { name: "Olá, Willian!" })).toBeInTheDocument();
    const fila = screen.getByRole("button", { name: /Na fila/ });
    expect(fila).toHaveTextContent("2");
    fireEvent.click(fila);
    expect(selecionar).toHaveBeenCalledWith("unassigned");
  });
  it("não inventa zeros enquanto a contagem está indisponível", () => {
    estado.counts = undefined;
    render(<InboxOverview onSelectTab={() => {}} hasSelection={false} />);
    expect(screen.getAllByText("—")).toHaveLength(4);
  });
  it("não oferece a visão Todas a atendente com acesso restrito", () => {
    estado.role = "agent";
    estado.visibility = "own";
    render(<InboxOverview onSelectTab={() => {}} hasSelection={false} />);
    expect(screen.queryByRole("button", { name: /Todas as conversas/ })).not.toBeInTheDocument();
  });
});
