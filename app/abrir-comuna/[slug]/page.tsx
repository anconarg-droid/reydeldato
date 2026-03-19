import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AbrirComunaClient from "./AbrirComunaClient";

export const dynamic = "force-dynamic";

function prettySlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function AbrirComunaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slugNorm = slug.toLowerCase().trim().replace(/\s+/g, "-");
  if (!slugNorm) notFound();

  const supabase = createSupabaseServerClient();

  // Validar comuna existe
  const { data: comunaRow } = await supabase
    .from("comunas")
    .select("slug, nombre, region_nombre")
    .eq("slug", slugNorm)
    .maybeSingle();

  if (!comunaRow) notFound();

  const comunaNombre = prettySlug(slugNorm);

  // Leer desde vw_comunas_por_abrir los campos pedidos
  const { data: vwRow } = await supabase
    .from("vw_comunas_por_abrir")
    .select("*")
    .eq("comuna_slug", slugNorm)
    .maybeSingle();

  if (!vwRow) notFound();

  const avancePorcentaje =
    Number(
      (vwRow as any)?.porcentaje_apertura ??
        (vwRow as any)?.avance_porcentaje ??
        0
    ) || 0;

  const estado =
    String(
      (vwRow as any)?.estado_apertura_simple ??
        (vwRow as any)?.estado_apertura ??
        (vwRow as any)?.estado ??
        "sin_movimiento"
    );

  const categorias =
    Array.isArray((vwRow as any)?.categorias) ? (vwRow as any).categorias : [];

  const data = {
    comuna_slug: String((vwRow as any)?.comuna_slug ?? slugNorm),
    comuna_nombre: String((vwRow as any)?.comuna_nombre ?? comunaRow.nombre ?? comunaNombre),
    region_nombre: (vwRow as any)?.region_nombre ?? null,

    avance_porcentaje: avancePorcentaje,
    total_emprendedores: Number((vwRow as any)?.total_emprendedores ?? 0) || 0,
    categorias_totales: Number((vwRow as any)?.categorias_totales ?? categorias.length ?? 0) || 0,
    categorias_cubiertas: Number((vwRow as any)?.categorias_cubiertas ?? 0) || 0,
    categorias_faltantes: Number((vwRow as any)?.categorias_faltantes ?? 0) || 0,

    estado,
    categorias,

    // Campos pedidos (para usar en cliente si ya están implementados ahí)
    porcentaje_apertura: (vwRow as any)?.porcentaje_apertura ?? avancePorcentaje,
    se_puede_abrir: (vwRow as any)?.se_puede_abrir ?? null,
    estado_apertura: (vwRow as any)?.estado_apertura ?? null,
    estado_apertura_simple: (vwRow as any)?.estado_apertura_simple ?? null,
    mensaje_apertura: (vwRow as any)?.mensaje_apertura ?? null,
    rubros_faltantes: (vwRow as any)?.rubros_faltantes ?? null,
    rubros_detalle: (vwRow as any)?.rubros_detalle ?? null,
  };

  return <AbrirComunaClient data={data} />;
}