import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { marcaDaSaida } from "@/lib/branding/saida";

import { CaptureSuccess } from "../_success";
import { sourceForToken } from "../_source";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const source = await sourceForToken(token);
  if (!source?.is_active) return { title: "Página indisponível" };
  const marca = await marcaDaSaida(source.organization_id);
  return { title: `Recebemos seus dados | ${marca.nome}` };
}

export default async function CaptureSuccessPage({ params }: PageProps) {
  const { token } = await params;
  const source = await sourceForToken(token);
  if (!source?.is_active) notFound();
  const marca = await marcaDaSaida(source.organization_id);
  return <CaptureSuccess brandName={marca.nome} logoUrl={marca.logoUrl} />;
}
