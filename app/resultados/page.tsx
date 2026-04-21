import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import { isResolvedQueryExactGas } from "@/lib/gasQueryExcludeGasfiteria";
import { normalizeText } from "@/lib/search/normalizeText";
import { searchEmprendedoresGlobalText } from "@/lib/resultadosGlobalSupabase";
import { slugify } from "@/lib/slugify";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import ResultadosClient from "./ResultadosClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    comuna?: string;
    q?: string;
    categoria?: string;
    subcategoria?: string;
    subcategoria_id?: string;
    /** Slug de región: búsqueda global acotada territorialmente (p. ej. desde comuna en activación). */
    region?: string;
  }>;
};

export default async function ResultadosPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const comunaRaw = (params.comuna ?? "").trim();
  const qRaw = (params.q ?? "").trim();
  const subcategoriaRaw = (params.subcategoria ?? "").trim();
  const subcategoriaIdRaw = (params.subcategoria_id ?? "").trim();
  const categoriaRaw = (params.categoria ?? "").trim();
  const regionRaw = (params.region ?? "").trim();
  const regionSlug = regionRaw ? slugify(regionRaw) : "";
  /** Slug de comuna canónico (sin acentos, guiones). */
  const comuna = comunaRaw ? slugify(comunaRaw) : "";

  /**
   * Comuna conocida en DB → URL canónica /[slug] (evita depender de /resultados?comuna=).
   * Si el slug no existe, no redirigir: /[slug] manda a /resultados?comuna= y habría bucle.
   */
  let comunaNombre: string | null = null;
  if (comuna) {
    const supabase = createSupabaseServerPublicClient();
    const { data: row } = await supabase
      .from("comunas")
      .select("slug, nombre")
      .eq("slug", comuna)
      .maybeSingle();
    if (row?.slug) {
      comunaNombre = row.nombre ? String(row.nombre) : null;
      const sp = new URLSearchParams();
      const tieneIntentoSub = Boolean(subcategoriaRaw || subcategoriaIdRaw);
      if (subcategoriaRaw) sp.set("subcategoria", slugify(subcategoriaRaw));
      if (subcategoriaIdRaw) sp.set("subcategoria_id", subcategoriaIdRaw);
      if (!tieneIntentoSub) {
        if (categoriaRaw) sp.set("categoria", slugify(categoriaRaw));
        else if (qRaw) sp.set("q", qRaw);
      }
      const qs = sp.toString();
      redirect(`/${encodeURIComponent(comuna)}${qs ? `?${qs}` : ""}`);
    }
  }
  const subcategoria = subcategoriaRaw ? slugify(subcategoriaRaw) : "";
  const subcategoriaId = subcategoriaIdRaw ? subcategoriaIdRaw : "";
  const categoria = categoriaRaw ? slugify(categoriaRaw) : "";
  const navegacionEstructurada =
    Boolean(subcategoria) || Boolean(subcategoriaId) || Boolean(categoria);
  const qRawCliente = navegacionEstructurada ? "" : qRaw;
  /** Texto de búsqueda sin acentos y en minúsculas (misma lógica que el resto del motor). */
  const q = qRawCliente ? normalizeText(qRawCliente) : "";

  let regionFocoNombre: string | null = null;
  if (regionSlug && q && !comuna) {
    const supabase = createSupabaseServerPublicClient();
    const { data: regRow } = await supabase
      .from("regiones")
      .select("nombre")
      .eq("slug", regionSlug)
      .maybeSingle();
    regionFocoNombre = regRow?.nombre ? String(regRow.nombre).trim() : null;
  }

  let synonymNotice: { qOriginal: string; qResolved: string } | null = null;
  if (q && !comuna && !isResolvedQueryExactGas(qRaw)) {
    const supabaseSyn = createSupabaseServerPublicClient();
    const qResolved =
      (await resolveQueryFromBusquedaSinonimos(supabaseSyn, q)) || q;
    if (normalizeText(qResolved) !== q) {
      synonymNotice = {
        qOriginal: (qRaw || "").trim() || q,
        qResolved: qResolved.trim(),
      };
    }
  }

  const globalDb =
    q && !comuna
      ? await searchEmprendedoresGlobalText(q, 24, {
          regionSlug: regionSlug || null,
        })
      : null;

  return (
    <main id="resultados" className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          ← Inicio
        </Link>
        <ResultadosClient
          initialQDisplay={qRawCliente}
          initialComuna={comuna || null}
          initialComunaNombre={comunaNombre}
          initialQ={q || null}
          initialCategoriaSlug={categoria || null}
          initialSubcategoriaSlug={subcategoria || null}
          initialSubcategoriaId={subcategoriaId || null}
          globalDb={globalDb}
          synonymNotice={synonymNotice}
          regionFocoSlug={regionSlug || null}
          regionFocoNombre={regionFocoNombre}
        />
      </div>
    </main>
  );
}
