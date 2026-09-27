import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { marcaDaSaida } from "@/lib/branding/saida";
import { prepararHtmlDeCaptura } from "@/lib/webhooks/captura";

import { CustomCapture } from "./_custom";
import { sourceForToken } from "./_source";
import { CaptureForm } from "./_client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const source = await sourceForToken(token);
  if (!source?.is_active) return { title: "Página indisponível" };
  const marca = await marcaDaSaida(source.organization_id);
  return {
    title: `Cotação | ${marca.nome}`,
    description: "Receba uma orientação para proteger seu veículo.",
  };
}

export default async function CapturePage({ params }: PageProps) {
  const { token } = await params;
  const source = await sourceForToken(token);
  if (!source?.is_active) notFound();

  const marca = await marcaDaSaida(source.organization_id);
  if (source.capture_mode === "html" && source.capture_html) {
    return (
      <CustomCapture
        html={prepararHtmlDeCaptura(
          source.capture_html,
          `/api/v1/webhooks/in/${token}`,
          marca.nome,
        )}
        brandName={marca.nome}
      />
    );
  }
  return (
    <CaptureForm
      endpoint={`/api/v1/webhooks/in/${token}`}
      brandName={marca.nome}
      logoUrl={marca.logoUrl}
    />
  );
}
