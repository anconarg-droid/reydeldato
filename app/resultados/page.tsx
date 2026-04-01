import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import { searchEmprendedoresGlobalText } from "@/lib/resultadosGlobalSupabase";
import { slugify } from "@/lib/slugify";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import ResultadosClient from "./ResultadosClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ comuna?: string; q?: string; subcategoria?: string; subcategoria_id?: string }>;
};

export default async function ResultadosPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const comunaRaw = (params.comuna ?? "").trim();
  const qRaw = (params.q ?? "").trim();
  const subcategoriaRaw = (params.subcategoria ?? "").trim();
  const subcategoriaIdRaw = (params.subcategoria_id ?? "").trim();
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
      if (qRaw) sp.set("q", qRaw);
      if (subcategoriaRaw) sp.set("subcategoria", slugify(subcategoriaRaw));
      if (subcategoriaIdRaw) sp.set("subcategoria_id", subcategoriaIdRaw);
      const qs = sp.toString();
      redirect(`/${encodeURIComponent(comuna)}${qs ? `?${qs}` : ""}`);
    }
  }
  /** Texto de búsqueda sin acentos y en minúsculas (misma lógica que el resto del motor). */
  const q = qRaw ? normalizeText(qRaw) : "";
  const subcategoria = subcategoriaRaw ? slugify(subcategoriaRaw) : "";
  const subcategoriaId = subcategoriaIdRaw ? subcategoriaIdRaw : "";

  const globalDb =
    q && !comuna ? await searchEmprendedoresGlobalText(q) : null;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
        >
          ← Inicio
        </Link>
        <ResultadosClient
          initialQDisplay={qRaw}
          initialComuna={comuna || null}
          initialComunaNombre={comunaNombre}
          initialQ={q || null}
          initialSubcategoriaSlug={subcategoria || null}
          initialSubcategoriaId={subcategoriaId || null}
          globalDb={globalDb}
        />
      </div>
    </main>
  );
}
