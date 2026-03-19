import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BuscarClient from "@/app/buscar/BuscarClient";

type PageProps = {
  params: Promise<{ comuna: string }>;
};

function formatComunaNombre(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { comuna } = await params;

  return {
    title: `${formatComunaNombre(comuna)} | Rey del Dato`,
  };
}

export default async function ComunaPage({ params }: PageProps) {
  const { comuna } = await params;
  const supabase = await createSupabaseServerClient();

  // 1) Validar comuna
  const { data: comunaRow, error: comunaError } = await supabase
    .from("comunas")
    .select("id, slug, nombre")
    .eq("slug", comuna)
    .maybeSingle();

  if (comunaError) throw comunaError;
  if (!comunaRow) notFound();

  // 2) Revisar si está activa manualmente
  const { data: activaRow, error: activaError } = await supabase
    .from("comunas_activas")
    .select("activa")
    .eq("comuna_slug", comuna)
    .maybeSingle();

  if (activaError) throw activaError;

  const activa = activaRow?.activa === true;

  // 3) Si no está activa, redirigir a apertura
  if (!activa) {
    redirect(`/abrir-comuna/${comuna}`);
  }

  // 4) Si está activa, renderizar buscador
  return (
    <BuscarClient
      comunaInicial={comunaRow.slug}
      comunaNombreInicial={comunaRow.nombre}
    />
  );
}