"use client";

import { useTheme } from "@/lib/theme";
import { useHotkeys } from "react-hotkeys-hook";
import { Sun, Moon, MonitorPlay } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";

export function ThemeToggle() {
  const t = useT();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  useHotkeys("mod+shift+l", cycle, { preventDefault: true }, [resolvedTheme]);

  const Icon = theme === "dark" ? Moon : theme === "system" ? MonitorPlay : Sun;
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={t(`Tema: ${theme}. Cmd+Shift+L para alternar.`)}
      title={t(`Mudar para o tema ${nextTheme}`)}
      className="gap-2 px-2.5 text-text-muted hover:bg-accent-soft hover:text-text"
      // O servidor não sabe a preferência salva no navegador do usuário --
      // renderiza um valor default e o cliente corrige pro valor real assim
      // que hidrata. É o mismatch ESPERADO de todo seletor de tema; React
      // "corrige" sozinho no primeiro render, só reclamava no console.
      suppressHydrationWarning
    >
      <Icon size={16} aria-hidden />
      <span className="hidden text-xs font-medium lg:inline">
        {resolvedTheme === "dark" ? t("Escuro") : t("Claro")}
      </span>
    </Button>
  );
}
