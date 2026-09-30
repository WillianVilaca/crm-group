"use client";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { MagnifyingGlass } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { CommandPalette } from "@/components/shell/CommandPalette";

export function SearchTrigger() {
  const t = useT();
  const [open, setOpen] = useState(false);

  // `enableOnFormTags`: o atalho precisa funcionar com o cursor dentro do
  // composer do inbox, que é onde o operador passa o dia.
  useHotkeys("mod+k", () => setOpen(true), { preventDefault: true, enableOnFormTags: true });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full justify-start gap-2 rounded-lg border-border bg-background/60 text-muted-foreground shadow-none"
        onClick={() => setOpen(true)}
      >
        <MagnifyingGlass size={14} aria-hidden />
        <span className="hidden truncate md:inline">{t("Buscar contatos, conversas, tarefas…")}</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
      </Button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
