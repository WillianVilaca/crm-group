import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();
let pathname = "/onboarding/funil";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/i18n/useT", () => ({
  useT: () => (texto: string) => texto,
}));

import { Stepper, type PassoVisivel } from "@/app/onboarding/_components/Stepper";

const passos: PassoVisivel[] = [
  { segmento: "welcome", rotulo: "Seu negócio", cumprido: true },
  { segmento: "connect-whatsapp", rotulo: "O telefone dele", cumprido: true },
  { segmento: "funil", rotulo: "Onde ele organiza", cumprido: false },
  { segmento: "testar", rotulo: "Ver ele atender", cumprido: false },
];

describe("timeline do onboarding", () => {
  beforeEach(() => {
    pathname = "/onboarding/funil";
    push.mockClear();
  });

  afterEach(cleanup);

  it("permite revisar uma etapa concluída sem liberar etapas futuras", () => {
    render(<Stepper passos={passos} />);

    const revisarNegocio = screen.getByRole("button", { name: "Revisar etapa Seu negócio" });
    expect(revisarNegocio).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revisar etapa Ver ele atender" })).toBeNull();

    fireEvent.click(revisarNegocio);

    expect(push).toHaveBeenCalledWith("/onboarding/welcome");
  });
});
