import { redirect } from "next/navigation";
import AbrirComunaClient from "./AbrirComunaClient";
import AbrirComunaPageChrome from "@/components/abrir-comuna/AbrirComunaPageChrome";
import { comunaPublicaAbierta } from "@/lib/comunaPublicaAbierta";
import { loadAperturaComunaV2Resumen } from "@/lib/loadAperturaComunaV2Resumen";
import { loadAbrirComunaEmprendedoresPublicados } from "@/lib/loadAbrirComunaEmprendedoresPublicados";
import { loadComunaInteresCount } from "@/lib/loadComunaInteresCount";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type AperturaRow = {
  porcentaje_apertura?: unknown;
  total_requerido?: unknown;
  total_cumplido?: unknown;
};

export default async function AbrirComunaPage({ params }: PageProps) {
  const { slug } = await params;
  const comunaSlug = String(slug || "").trim().toLowerCase();

  if (!comunaSlug) {
    redirect("/comunas");
  }

  const supabase = createSupabaseServerPublicClient();

  // Solo columnas estables: si pedimos columnas que no existen en un entorno, falla TODO el lookup.
  const { data: comunaRow, error: comunaError } = await supabase
    .from("comunas")
    .select("id, slug, nombre, forzar_abierta, regiones(slug, nombre)")
    .eq("slug", comunaSlug)
    .maybeSingle();

  // "No encontrada" únicamente cuando no hay fila en `comunas` (o error real de lectura sin datos).
  if (comunaError) {
    console.error("[abrir-comuna] error comunas:", comunaError);
  }
  if (!comunaRow?.id) {
    return (
      <AbrirComunaPageChrome comunaBreadcrumbLabel={comunaSlug}>
        <AbrirComunaClient data={null} />
      </AbrirComunaPageChrome>
    );
  }

  const { data: config } = await supabase
    .from("comunas_config")
    .select("activa")
    .eq("comuna_id", comunaRow.id)
    .maybeSingle();

  const { data: aperturaRow } = await loadAperturaComunaV2Resumen(supabase, comunaSlug);

  const vwParaReglaPublica = aperturaRow
    ? {
        porcentaje_apertura: Number(
          (aperturaRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0
        ),
        abierta: (aperturaRow as { abierta?: unknown }).abierta,
      }
    : null;

  const directorioPublicoOperativo =
    config?.activa !== false &&
    comunaPublicaAbierta(
      (comunaRow as { forzar_abierta?: unknown }).forzar_abierta,
      vwParaReglaPublica
    );

  if (directorioPublicoOperativo) {
    redirect(`/${comunaSlug}`);
  }

  const apertura = (aperturaRow ?? null) as AperturaRow | null;
  const porcentaje = Number(apertura?.porcentaje_apertura ?? NaN);
  const porcentajeValido = Number.isFinite(porcentaje)
    ? Math.min(100, Math.max(0, porcentaje))
    : null;

  const tr = Number(apertura?.total_requerido ?? NaN);
  const tc = Number(apertura?.total_cumplido ?? NaN);
  const totalRequeridoApertura =
    Number.isFinite(tr) && tr > 0 ? Math.max(0, Math.floor(tr)) : null;
  const totalCumplidoApertura =
    Number.isFinite(tc) && tc >= 0 ? Math.max(0, Math.floor(tc)) : null;

  const comunaNombreDisplay =
    String(comunaRow.nombre ?? "").trim() || comunaSlug;
  const regionJoin = (comunaRow as { regiones?: { slug?: string; nombre?: string } | null })
    .regiones;
  const regionSlug = String(regionJoin?.slug ?? "").trim();
  const regionNombre = String(regionJoin?.nombre ?? "").trim();
  const { total: publicadosTotal, cardProps: publicadosCards } =
    await loadAbrirComunaEmprendedoresPublicados(comunaRow.id, {
      comunaNombre: comunaNombreDisplay,
      comunaSlug: String(comunaRow.slug ?? comunaSlug),
      regionSlug,
    });

  const comunaInteresTotal = await loadComunaInteresCount(comunaSlug);

  const data = {
    comuna_slug: comunaRow.slug,
    comuna_nombre: comunaRow.nombre,
    region_nombre: regionNombre || null,
    porcentaje_apertura: porcentajeValido,
    emprendedores_publicados_total: publicadosTotal,
    emprendedores_publicados_cards: publicadosCards,
    total_requerido_apertura: totalRequeridoApertura,
    total_cumplido_apertura: totalCumplidoApertura,
    comuna_interes_total: comunaInteresTotal,
    /** Misma regla que el redirect: listado “operativo” solo cuando el directorio público está abierto. */
    directorio_publico_operativo: directorioPublicoOperativo,
  };

  const breadcrumbLabel =
    String(comunaRow.nombre ?? "").trim() || String(comunaRow.slug ?? comunaSlug);

  return (
    <AbrirComunaPageChrome comunaBreadcrumbLabel={breadcrumbLabel}>
      <AbrirComunaClient data={data} />
    </AbrirComunaPageChrome>
  );
}
