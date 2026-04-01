import { redirect } from "next/navigation";
import AbrirComunaClient from "./AbrirComunaClient";
import { supabase } from "@/lib/supabase";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type AperturaRow = {
  comuna_id: number;
  comuna_slug: string;
  comuna_nombre: string;
  total_requerido: number;
  total_cumplido: number;
  total_faltante: number;
  porcentaje_apertura: number;
};

type FaltanteRow = {
  comuna_id: number;
  comuna_slug: string;
  comuna_nombre: string;
  subcategoria_slug: string;
  subcategoria_nombre: string;
  maximo_contable: number;
  total_contado: number;
  faltantes: number;
};

type DetalleRow = {
  comuna_id: number;
  comuna_slug: string;
  comuna_nombre: string;
  subcategoria_id: number;
  subcategoria_slug: string;
  subcategoria_nombre: string;
  total_registrados: number;
  maximo_contable: number;
  total_contado: number;
};

export default async function AbrirComunaPage({ params }: PageProps) {
  const { slug } = await params;
  const comunaSlug = String(slug || "").trim().toLowerCase();

  if (!comunaSlug) {
    redirect("/comunas");
  }

  const { data: comunaRow, error: comunaError } = await supabase
    .from("comunas")
    .select("id, slug, nombre")
    .eq("slug", comunaSlug)
    .maybeSingle();

  if (comunaError || !comunaRow) {
    return <AbrirComunaClient data={null} />;
  }

  // Override manual: si está marcada como activa, redirige a la comuna normal
  const { data: activaRow } = await supabase
    .from("comunas_activas")
    .select("estado_apertura")
    .eq("comuna_slug", comunaSlug)
    .maybeSingle();

  if (activaRow?.estado_apertura === "activa") {
    redirect(`/${comunaSlug}`);
  }

  const { data: aperturaRow, error: aperturaError } = await supabase
    .from("vw_apertura_comuna_v2")
    .select(`
      comuna_id,
      comuna_slug,
      comuna_nombre,
      total_requerido,
      total_cumplido,
      total_faltante,
      porcentaje_apertura
    `)
    .eq("comuna_slug", comunaSlug)
    .maybeSingle();

  if (aperturaError) {
    console.error("[abrir-comuna] error vw_apertura_comuna_v2:", aperturaError);
  }

  const { data: faltantesRows, error: faltantesError } = await supabase
    .from("vw_faltantes_comuna_v2")
    .select(`
      comuna_id,
      comuna_slug,
      comuna_nombre,
      subcategoria_slug,
      subcategoria_nombre,
      maximo_contable,
      total_contado,
      faltantes
    `)
    .eq("comuna_slug", comunaSlug)
    .order("faltantes", { ascending: false });

  if (faltantesError) {
    console.error("[abrir-comuna] error vw_faltantes_comuna_v2:", faltantesError);
  }

  const { data: detalleRows, error: detalleError } = await supabase
    .from("vw_conteo_comuna_rubro_contado_v2")
    .select(`
      comuna_id,
      comuna_slug,
      comuna_nombre,
      subcategoria_id,
      subcategoria_slug,
      subcategoria_nombre,
      total_registrados,
      maximo_contable,
      total_contado
    `)
    .eq("comuna_slug", comunaSlug)
    .order("subcategoria_slug", { ascending: true });

  if (detalleError) {
    console.error(
      "[abrir-comuna] error vw_conteo_comuna_rubro_contado_v2:",
      detalleError
    );
  }

  const apertura = (aperturaRow ?? null) as AperturaRow | null;
  const faltantes = ((faltantesRows ?? []) as FaltanteRow[]).map((r) => ({
    rubro: r.subcategoria_slug,
    nombre: r.subcategoria_nombre,
    faltan: Number(r.faltantes ?? 0),
    peso: Number(r.maximo_contable ?? 0),
    actual: Number(r.total_contado ?? 0),
    requerido: Number(r.maximo_contable ?? 0),
  }));

  const rubrosDetalle = ((detalleRows ?? []) as DetalleRow[]).map((r) => ({
    rubro: r.subcategoria_slug,
    nombre: r.subcategoria_nombre,
    faltan: Math.max(
      0,
      Number(r.maximo_contable ?? 0) - Number(r.total_contado ?? 0)
    ),
    peso: Number(r.maximo_contable ?? 0),
    actual: Number(r.total_contado ?? 0),
    requerido: Number(r.maximo_contable ?? 0),
  }));

  const porcentaje = Number(apertura?.porcentaje_apertura ?? 0);
  const sePuedeAbrir = porcentaje >= 100;

  // Si ya llegó a 100% por reglas, redirige a resultados
  if (sePuedeAbrir) {
    redirect(`/${comunaSlug}`);
  }

  const data = {
    comuna_slug: comunaRow.slug,
    comuna_nombre: comunaRow.nombre,
    porcentaje_apertura: porcentaje,
    estado_apertura:
      porcentaje <= 0
        ? "sin_movimiento"
        : porcentaje >= 100
          ? "lista_para_abrir"
          : "en_proceso",
    estado_apertura_simple:
      porcentaje <= 0
        ? "sin_movimiento"
        : porcentaje >= 100
          ? "lista_para_abrir"
          : "en_proceso",
    se_puede_abrir: sePuedeAbrir,
    total_requerido: Number(apertura?.total_requerido ?? 0),
    total_cumplido: Number(apertura?.total_cumplido ?? 0),
    total_faltante: Number(apertura?.total_faltante ?? 0),
    rubros_faltantes: faltantes,
    rubros_detalle: rubrosDetalle,
  };

  return <AbrirComunaClient data={data} />;
}