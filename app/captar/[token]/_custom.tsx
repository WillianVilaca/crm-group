"use client";

interface CustomCaptureProps {
  html: string;
  brandName: string;
}

/**
 * A página entregue pela empresa fica isolada do documento do GroupCRM.
 *
 * `allow-forms` permite que o formulário POSTe no webhook; scripts, acesso ao
 * DOM pai, cookies e navegação superior continuam bloqueados pelo sandbox.
 */
export function CustomCapture({ html, brandName }: CustomCaptureProps) {
  return (
    <main className="min-h-screen bg-background p-0 text-foreground">
      <iframe
        title={`Página de captação de ${brandName}`}
        srcDoc={html}
        sandbox="allow-forms"
        className="min-h-screen w-full border-0"
      />
    </main>
  );
}
