import { createSupabaseServerClient } from "@/lib/supabase/server";

type EmprendedorRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  comuna_base_nombre: string | null;
  comuna_base_slug: string | null;
  foto_principal_url: string | null;
};

type Props = {
  query: string;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export default async function SearchResults({ query }: Props) {
  const supabase = createSupabaseServerClient();

  const q = query.trim();

  if (!q) {
    return null;
  }

  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("vw_emprendedores_algolia_final")
    .select("id, slug, nombre, descripcion_corta, comuna_base_nombre, comuna_base_slug, foto_principal_url")
    .or(
      [
        `nombre.ilike.${like}`,
        `descripcion_corta.ilike.${like}`,
        `search_text.ilike.${like}`,
      ].join(",")
    )
    .limit(30);

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error al buscar: {s(error.message)}
      </div>
    );
  }

  const rows: EmprendedorRow[] = Array.isArray(data) ? (data as any) : [];

  if (!rows.length) {
    return <p>No se encontraron emprendimientos para “{q}”.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((row) => {
        const slug = s(row.slug || row.id);

        return (
          <article
            key={slug}
            className="card-hover-effect group border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col"
          >
            <div className="aspect-video bg-slate-200 overflow-hidden">
              {row.foto_principal_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.foto_principal_url}
                  alt={row.nombre || ""}
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
                {row.nombre || "Emprendimiento sin nombre"}
              </h2>
              {row.comuna_base_nombre && (
                <p className="text-xs text-slate-500 mb-1">
                  📍 {row.comuna_base_nombre}
                </p>
              )}
              {row.descripcion_corta && (
                <p className="text-sm text-slate-600 line-clamp-3 flex-1">
                  {row.descripcion_corta}
                </p>
              )}

              <div className="mt-4">
                <a
                  href={`/emprendedor/${encodeURIComponent(slug)}`}
                  className="inline-flex items-center justify-center w-full rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold px-3 py-2 text-slate-800"
                >
                  Ver detalles
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

