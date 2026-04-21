import Link from "next/link";
import {
  CATEGORIAS_CATALOGO,
  prettyLabelSubcategoria,
} from "@/lib/categoriasCatalogo";
import {
  loadConteosCategoriasIndex,
  type ConteoCategoriaIndex,
} from "@/lib/loadCategoriasIndexCounts";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ comuna?: string }>;
};

function hrefCategoria(
  categoriaSlug: string,
  comunaSlugCanonico: string | null
): string {
  return comunaSlugCanonico
    ? `/categoria/${categoriaSlug}?comuna=${encodeURIComponent(comunaSlugCanonico)}`
    : `/categoria/${categoriaSlug}`;
}

function hrefSubcategoria(
  categoriaSlug: string,
  subSlug: string,
  comunaSlugCanonico: string | null
): string {
  const sp = new URLSearchParams();
  if (comunaSlugCanonico) sp.set("comuna", comunaSlugCanonico);
  sp.set("subcategoria", subSlug);
  return `/categoria/${categoriaSlug}?${sp.toString()}`;
}

function ordenarCategoriasIndex(
  items: typeof CATEGORIAS_CATALOGO,
  porSlug: Map<string, ConteoCategoriaIndex>,
  conComunaResuelta: boolean
): typeof CATEGORIAS_CATALOGO {
  const conConteo = items
    .map((c) => ({ c, cnt: porSlug.get(c.slug) }))
    .filter((x): x is { c: (typeof CATEGORIAS_CATALOGO)[0]; cnt: ConteoCategoriaIndex } =>
      Boolean(x.cnt && x.cnt.total > 0)
    );

  conConteo.sort((a, b) => {
    if (conComunaResuelta) {
      const aBase = a.cnt.enBase > 0 ? 0 : 1;
      const bBase = b.cnt.enBase > 0 ? 0 : 1;
      if (aBase !== bBase) return aBase - bBase;
    }
    const dt = b.cnt.total - a.cnt.total;
    if (dt !== 0) return dt;
    return a.c.nombre.localeCompare(b.c.nombre, "es");
  });

  return conConteo.map((x) => x.c);
}

export default async function CategoriasPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const comunaParamRaw = (sp.comuna ?? "").trim();
  const comunaSlugCanonico = comunaParamRaw ? slugify(comunaParamRaw) : null;

  const { porSlug, comunaNombre, comunaResuelta, subSlugsConPublicadosPorCategoriaSlug } =
    await loadConteosCategoriasIndex({
      comunaSlug: comunaSlugCanonico,
    });

  const lista = ordenarCategoriasIndex(
    CATEGORIAS_CATALOGO,
    porSlug,
    Boolean(comunaSlugCanonico && comunaResuelta)
  );

  const comunaParaEnlaces = comunaSlugCanonico && comunaResuelta ? comunaSlugCanonico : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            ← Volver al inicio
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Todas las categorías
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            {comunaSlugCanonico && comunaResuelta && comunaNombre ? (
              <>
                Explora servicios en <strong>{comunaNombre}</strong> por categoría.
              </>
            ) : (
              <>
                Explora Rey del Dato por rubro. Entra a una categoría para ver sus
                subcategorías y luego filtrar por comuna.
              </>
            )}
          </p>
        </header>

        {lista.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay categorías con emprendimientos publicados
            {comunaSlugCanonico && comunaResuelta ? " en esta comuna." : "."}
          </p>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((categoria) => {
              const cnt = porSlug.get(categoria.slug)!;
              const subsConDatos = subSlugsConPublicadosPorCategoriaSlug.get(categoria.slug);
              const subcategoriasVisibles = subsConDatos
                ? categoria.subcategorias.filter((sub) => subsConDatos.has(sub))
                : [];
              return (
                <div
                  key={categoria.slug}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <Link
                    href={hrefCategoria(categoria.slug, comunaParaEnlaces)}
                    className="block"
                  >
                    <div className="text-3xl">{categoria.emoji}</div>

                    <h2 className="mt-3 text-xl font-bold leading-snug">
                      {categoria.nombre}{" "}
                      <span className="font-semibold text-slate-500">({cnt.total})</span>
                    </h2>

                    <p className="mt-2 min-h-[60px] text-sm text-slate-600">
                      {categoria.descripcion}
                    </p>

                    <div className="mt-5 text-sm font-medium text-sky-700">
                      Ver servicios →
                    </div>
                  </Link>

                  {subcategoriasVisibles.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {subcategoriasVisibles.map((sub) => (
                        <Link
                          key={sub}
                          href={hrefSubcategoria(categoria.slug, sub, comunaParaEnlaces)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {prettyLabelSubcategoria(sub)}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
