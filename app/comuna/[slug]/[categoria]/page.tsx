import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  slug: string;
  categoria: string;
};

type Comuna = { id: string; slug: string; nombre: string };
type Categoria = { id: string; slug: string; nombre: string };

type Hit = {
  objectID?: string;
  slug?: string;
  nombre?: string;
  descripcion_corta?: string;
  categoria_nombre?: string;
  comuna_base_nombre?: string;
  foto_principal_url?: string;
};

type SearchResponse = {
  ok: boolean;
  hits?: Hit[];
  nbHits?: number;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

async function getComuna(slug: string): Promise<Comuna | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comunas")
    .select("id,slug,nombre")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: s((data as any).id),
    slug: s((data as any).slug),
    nombre: s((data as any).nombre),
  };
}

async function getCategoria(slug: string): Promise<Categoria | null> {
  if (slug === "otros") return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id,slug,nombre")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: s((data as any).id),
    slug: s((data as any).slug),
    nombre: s((data as any).nombre),
  };
}

async function searchByComunaAndCategoria(
  comunaSlug: string,
  categoriaSlug: string
): Promise<SearchResponse> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams({
    comuna: comunaSlug,
    categoria: categoriaSlug,
  });
  const res = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
    cache: "no-store",
  });

  try {
    return (await res.json()) as SearchResponse;
  } catch {
    return { ok: false, hits: [], nbHits: 0 };
  }
}

export async function generateStaticParams(): Promise<
  Array<{ slug: string; categoria: string }>
> {
  const supabase = createSupabaseServerClient();
  const [comunasRes, categoriasRes] = await Promise.all([
    supabase.from("comunas").select("slug"),
    supabase.from("categorias").select("slug"),
  ]);

  const comunas = Array.isArray(comunasRes.data) ? comunasRes.data : [];
  const categoriasRaw = Array.isArray(categoriasRes.data) ? categoriasRes.data : [];
  const comunaSlugs = comunas.map((c: any) => s(c.slug)).filter(Boolean);
  // Taxonomía v1: no generar rutas para categoría "Otros" (solo fallback interno)
  const categoriaSlugs = categoriasRaw.map((c: any) => s(c.slug)).filter((slug: string) => Boolean(slug) && slug !== "otros");

  const params: Array<{ slug: string; categoria: string }> = [];
  for (const comunaSlug of comunaSlugs) {
    for (const categoriaSlug of categoriaSlugs) {
      params.push({ slug: comunaSlug, categoria: categoriaSlug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, categoria } = await params;

  const [comunaRow, categoriaRow] = await Promise.all([
    getComuna(slug),
    getCategoria(categoria),
  ]);

  if (!comunaRow) {
    return { title: "Comuna no encontrada | Rey del Dato" };
  }

  const comunaNombre = comunaRow.nombre;
  const categoriaNombre = categoriaRow?.nombre || categoria;

  const title = `${categoriaNombre} en ${comunaNombre} | Rey del Dato`;
  const description = `Encuentra ${categoriaNombre} en ${comunaNombre}. Emprendedores y servicios locales.`;

  return { title, description };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, categoria } = await params;

  const [comunaRow, categoriaRow, search] = await Promise.all([
    getComuna(slug),
    getCategoria(categoria),
    searchByComunaAndCategoria(slug, categoria),
  ]);

  if (!comunaRow) notFound();

  const comunaNombre = comunaRow.nombre;
  const categoriaNombre = categoriaRow?.nombre || categoria;

  const hits = Array.isArray(search.hits) ? search.hits : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          {categoriaNombre} en {comunaNombre}
        </h1>
        <p className="text-slate-600 mb-6">
          Encuentra {categoriaNombre} en {comunaNombre}. Emprendedores y servicios locales.
        </p>

        {hits.length === 0 ? (
          <p className="text-slate-500">
            No hay resultados aún para {categoriaNombre} en {comunaNombre}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hits.map((hit) => {
              const negocioSlug = hit.slug || hit.objectID || "";
              return (
                <Link
                  key={negocioSlug}
                  href={negocioSlug ? `/emprendedor/${negocioSlug}` : "#"}
                  className="card-hover-effect bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition flex flex-col"
                >
                  <div className="aspect-video bg-slate-200 overflow-hidden">
                    {hit.foto_principal_url ? (
                      <img
                        src={hit.foto_principal_url}
                        alt={hit.nombre || ""}
                        className="w-full h-full object-cover card-img-zoom"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl">
                        🏪
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="font-semibold text-slate-900 text-lg mb-1 line-clamp-2">
                      {hit.nombre || "Emprendimiento sin nombre"}
                    </h2>
                    {(hit.categoria_nombre || categoriaNombre) && (
                      <p className="text-xs text-slate-500 mb-1">
                        {hit.categoria_nombre || categoriaNombre}
                      </p>
                    )}
                    {hit.comuna_base_nombre && (
                      <p className="text-xs text-slate-500 mb-2">
                        📍 {hit.comuna_base_nombre}
                      </p>
                    )}
                    {hit.descripcion_corta && (
                      <p className="text-sm text-slate-600 line-clamp-3 flex-1">
                        {hit.descripcion_corta}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

