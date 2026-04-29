import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import { slugify } from "@/lib/slugify";
import { comunaPublicaAbierta } from "@/lib/comunaPublicaAbierta";
import { normalizeText } from "@/lib/search/normalizeText";
import {
  createSupabaseServerPublicClient,
} from "@/lib/supabase/server";
import ResultadosClient from "@/app/resultados/ResultadosClient";
import { busquedaComunaResultsShellClassName } from "@/lib/busquedaComunaLayoutStyles";
import { segmentoUrlPareceRecursoEstaticoOReservado } from "@/lib/comunaDynamicPathReserved";

type PageProps = {
  params: Promise<{ comuna: string }>;
  searchParams?:
    | Promise<{
        q?: string;
        categoria?: string;
        subcategoria?: string;
        subcategoria_id?: string;
      }>
    | {
        q?: string;
        categoria?: string;
        subcategoria?: string;
        subcategoria_id?: string;
      };
};

export default async function ComunaPage({ params, searchParams }: PageProps) {
  const { comuna } = await params;
  if (segmentoUrlPareceRecursoEstaticoOReservado(comuna)) {
    notFound();
  }
  const canonical = slugify(comuna);

  const sb = createSupabaseServerPublicClient();

  // Misma idea que /abrir-comuna/[slug]: no pedir columnas planas `region_slug`/`region` si no
  // existen en el entorno (falla el SELECT y `comunaRow` queda null → redirect a /resultados?comuna=
  // mientras /resultados sí encuentra la fila → bucle GET /[slug] ↔ /resultados?comuna=).
  const { data: comunaRow } = await sb
    .from("comunas")
    .select("id, slug, nombre, forzar_abierta, motivo_apertura_override, regiones(slug, nombre)")
    .eq("slug", canonical)
    .maybeSingle();

  if (!comunaRow?.id) {
    redirect(`/resultados?comuna=${encodeURIComponent(canonical)}`);
  }

  const { data: vwRow } = await sb
    .from(VW_APERTURA_COMUNA_V2)
    .select("porcentaje_apertura, abierta")
    .eq("comuna_slug", canonical)
    .maybeSingle();

  const vw = vwRow
    ? {
        porcentaje_apertura: Number(
          (vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0,
        ),
        abierta: (vwRow as { abierta?: unknown }).abierta,
      }
    : null;

  const comuna_publica_abierta = comunaPublicaAbierta(
    (comunaRow as { forzar_abierta?: unknown }).forzar_abierta,
    vw
  );

  const { data: config } = await sb
    .from("comunas_config")
    .select("activa")
    .eq("comuna_id", comunaRow.id)
    .maybeSingle();

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const subcategoriaRaw = (sp.subcategoria ?? "").trim();
  const subcategoria = subcategoriaRaw ? slugify(subcategoriaRaw) : "";
  const subcategoriaIdRaw = (sp.subcategoria_id ?? "").trim();
  const subcategoriaId = subcategoriaIdRaw ? subcategoriaIdRaw : "";
  const categoriaRaw = (sp.categoria ?? "").trim();
  const categoria = categoriaRaw ? slugify(categoriaRaw) : "";
  const navegacionEstructurada = Boolean(subcategoria || subcategoriaId || categoria);
  const qRaw = navegacionEstructurada ? "" : (sp.q ?? "").trim();
  const q = qRaw ? normalizeText(qRaw) : "";

  const configInactiva = config?.activa === false;
  const directorioDisponible = !configInactiva && comuna_publica_abierta;
  const tieneBusquedaOExtra =
    Boolean(qRaw) ||
    Boolean(subcategoriaRaw) ||
    Boolean(subcategoriaIdRaw) ||
    Boolean(categoriaRaw);

  /**
   * Aunque la comuna no esté activa, mostramos la experiencia de búsqueda + cards (populares o filtradas),
   * y el banner de “activación” dentro de `ResultadosClient`. Evitamos redirigir a /abrir-comuna para
   * que el usuario pueda explorar resultados y buscar igual.
   */

  let comunaNombre: string | null = comunaRow?.nombre ? String(comunaRow.nombre) : null;
  if (!comunaNombre) {
    const pub = createSupabaseServerPublicClient();
    const { data } = await pub
      .from("comunas")
      .select("nombre")
      .eq("slug", canonical)
      .maybeSingle();
    comunaNombre = data?.nombre ? String(data.nombre) : null;
  }

  const regionJoin = (
    comunaRow as { regiones?: { slug?: string | null; nombre?: string | null } | null }
  )?.regiones;
  const regionFocoSlug =
    regionJoin?.slug != null && String(regionJoin.slug).trim()
      ? String(regionJoin.slug).trim()
      : null;
  const regionFocoNombre =
    regionJoin?.nombre != null && String(regionJoin.nombre).trim()
      ? String(regionJoin.nombre).trim()
      : null;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className={`${busquedaComunaResultsShellClassName} py-6`}>
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          ← Inicio
        </Link>
        <ResultadosClient
          initialQDisplay={qRaw}
          initialComuna={canonical}
          initialComunaNombre={comunaNombre}
          initialQ={q || null}
          initialCategoriaSlug={categoria || null}
          initialSubcategoriaSlug={subcategoria || null}
          initialSubcategoriaId={subcategoriaId || null}
          globalDb={null}
          directorioComunaAbierto={directorioDisponible}
          regionFocoSlug={regionFocoSlug}
          regionFocoNombre={regionFocoNombre}
          invitacionBuscaEnPaginaComuna
        />
      </div>
    </main>
  );
}
