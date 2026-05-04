import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteUrl } from "@/lib/getPublicSiteUrl";

type Params = {
  slug: string;
};

type Emprendedor = {
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  descripcion_larga?: string;
  categoria_nombre?: string;
  subcategorias_nombres_arr?: string[];
  comuna_nombre?: string;
  cobertura_tipo?: string;
  cobertura_comunas_arr?: string[];
  foto_principal_url?: string;
  whatsapp?: string;
  instagram?: string;
  sitio_web?: string;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

async function fetchEmprendedor(slug: string): Promise<Emprendedor | null> {
  const baseUrl = getPublicSiteUrl();
  const res = await fetch(
    `${baseUrl}/api/emprendedor/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.ok || !data?.item) return null;

  return data.item as Emprendedor;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await fetchEmprendedor(slug);

  if (!item) {
    return {
      title: "Emprendimiento no encontrado | Rey del Dato",
    };
  }

  const comuna = s(item.comuna_nombre) || "tu comuna";
  const title = `${item.nombre} en ${comuna} | Rey del Dato`;

  return {
    title,
    description: item.descripcion_corta || undefined,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const item = await fetchEmprendedor(slug);

  if (!item) notFound();

  const subcategorias = Array.isArray(item.subcategorias_nombres_arr)
    ? item.subcategorias_nombres_arr
    : [];

  const cobertura =
    item.cobertura_tipo && item.cobertura_comunas_arr?.length
      ? `${item.cobertura_tipo} (${item.cobertura_comunas_arr.join(", ")})`
      : item.cobertura_tipo || "No informada";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {item.foto_principal_url && (
            <div className="w-full aspect-video bg-slate-200">
              <img
                src={item.foto_principal_url}
                alt={item.nombre}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {item.nombre}
            </h1>

            {item.descripcion_corta && (
              <p className="text-slate-700 text-base">
                {item.descripcion_corta}
              </p>
            )}

            {item.descripcion_larga && (
              <p className="text-slate-700 text-base leading-relaxed">
                {item.descripcion_larga}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-slate-700">
              {item.categoria_nombre && (
                <div>
                  <span className="font-semibold">Categoría:</span>{" "}
                  {item.categoria_nombre}
                </div>
              )}
              {subcategorias.length > 0 && (
                <div>
                  <span className="font-semibold">Subcategorías:</span>{" "}
                  {subcategorias.join(", ")}
                </div>
              )}
              {item.comuna_nombre && (
                <div>
                  <span className="font-semibold">Comuna:</span>{" "}
                  {item.comuna_nombre}
                </div>
              )}
              <div>
                <span className="font-semibold">Cobertura:</span>{" "}
                {cobertura}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2 text-sm">
              {item.whatsapp && (
                <div>
                  <span className="font-semibold">WhatsApp:</span>{" "}
                  {item.whatsapp}
                </div>
              )}
              {item.instagram && (
                <div>
                  <span className="font-semibold">Instagram:</span>{" "}
                  {item.instagram}
                </div>
              )}
              {item.sitio_web && (
                <div>
                  <span className="font-semibold">Web:</span>{" "}
                  {item.sitio_web}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

