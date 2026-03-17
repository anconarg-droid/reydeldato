"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  categoria_nombre?: string;
  subcategorias_nombres?: string[];
  comuna_base_nombre?: string;
  foto_principal_url?: string | null;
  nivel_cobertura?: string;
  en_tu_comuna?: boolean;
  atiende_tu_comuna?: boolean;
};

type Subcategoria = {
  slug: string;
  nombre: string;
};

type ApiResponse = {
  ok?: boolean;
  total?: number;
  subcategorias?: Subcategoria[];
  grupos?: {
    en_tu_comuna?: Item[];
    atienden_tu_comuna?: Item[];
    regional?: Item[];
    nacional?: Item[];
  };
  error?: string;
};

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function slugToLabel(v: string) {
  return s(v)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function pickArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function pickFoto(item: Item): string {
  return s(item?.foto_principal_url) || "/placeholder-emprendedor.jpg";
}

function etiquetaGeo(item: Item) {
  if (item?.en_tu_comuna) {
    return {
      texto: "⭐ De tu comuna",
      subtexto: item?.comuna_base_nombre
        ? `Base en ${item.comuna_base_nombre}`
        : "",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  }

  if (item?.atiende_tu_comuna) {
    return {
      texto: "📍 Atiende tu comuna",
      subtexto: item?.comuna_base_nombre
        ? `Base en ${item.comuna_base_nombre}`
        : "",
      color: "text-sky-700",
      bg: "bg-sky-50",
      border: "border-sky-200",
    };
  }

  const nivel = s(item?.nivel_cobertura).toLowerCase();

  if (
    nivel === "regional" ||
    nivel === "rm" ||
    nivel === "metropolitana" ||
    nivel === "varias_comunas"
  ) {
    return {
      texto: "🌎 Cobertura regional",
      subtexto: item?.comuna_base_nombre
        ? `Base en ${item.comuna_base_nombre}`
        : "",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }

  return {
    texto: "🇨🇱 Cobertura nacional",
    subtexto: item?.comuna_base_nombre
      ? `Base en ${item.comuna_base_nombre}`
      : "",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  };
}

export default function CategoriaClient({
  slug,
  comuna,
  subcategoria,
}: {
  slug: string;
  comuna: string;
  subcategoria: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [inputComuna, setInputComuna] = useState(comuna);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (comuna) params.set("comuna", comuna);
        if (subcategoria) params.set("subcategoria", subcategoria);

        const res = await fetch(`/api/categoria/${slug}?${params.toString()}`, {
          cache: "no-store",
        });

        const json: ApiResponse = await res.json();

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || "No se pudo cargar la categoría");
        }

        setData(json);
      } catch (e: any) {
        setError(e?.message || "Error inesperado");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug, comuna, subcategoria]);

  const grupos = useMemo(() => {
    const g = data?.grupos || {};

    return {
      en_tu_comuna: pickArray(g.en_tu_comuna),
      atienden_tu_comuna: pickArray(g.atienden_tu_comuna),
      regional: pickArray(g.regional),
      nacional: pickArray(g.nacional),
    };
  }, [data]);

  const total =
    grupos.en_tu_comuna.length +
    grupos.atienden_tu_comuna.length +
    grupos.regional.length +
    grupos.nacional.length;

  const categoriaLabel = slugToLabel(slug);
  const comunaLabel = slugToLabel(comuna);
  const subcategoriaLabel = slugToLabel(subcategoria);

  function aplicarFiltros() {
    const params = new URLSearchParams();

    if (inputComuna.trim()) params.set("comuna", inputComuna.trim());
    if (subcategoria) params.set("subcategoria", subcategoria);

    const query = params.toString();
    router.push(`/categoria/${slug}${query ? `?${query}` : ""}`);
  }

  function seleccionarSubcategoria(subSlug: string) {
    const params = new URLSearchParams();

    if (comuna) params.set("comuna", comuna);

    if (subSlug && subSlug !== "todas") {
      params.set("subcategoria", subSlug);
    }

    const query = params.toString();
    router.push(`/categoria/${slug}${query ? `?${query}` : ""}`);
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6">Cargando categoría...</div>;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 mb-2">
          {categoriaLabel}
        </h1>

        <p className="text-gray-600">
          Explora emprendimientos de esta categoría y filtra por comuna o
          subcategoría.
        </p>
      </div>

      {/* FILTRO COMUNA */}
      <div className="mb-8 flex flex-col md:flex-row gap-3">
        <input
          value={inputComuna}
          onChange={(e) => setInputComuna(e.target.value)}
          placeholder="¿En qué comuna buscas?"
          className="h-14 flex-1 rounded-2xl border border-gray-300 bg-white px-5 text-base outline-none focus:border-gray-900"
        />

        <button
          onClick={aplicarFiltros}
          className="h-14 rounded-2xl bg-gray-900 px-8 text-base font-bold text-white"
        >
          Filtrar
        </button>
      </div>

      {/* SUBCATEGORÍAS */}
      {Array.isArray(data?.subcategorias) && data!.subcategorias!.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Subcategorías
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => seleccionarSubcategoria("todas")}
              className={`rounded-full px-4 py-2 text-sm font-semibold border ${
                !subcategoria
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Todas
            </button>

            {data!.subcategorias!.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => seleccionarSubcategoria(sub.slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold border ${
                  subcategoria === sub.slug
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {sub.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESUMEN */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          {total} resultado{total === 1 ? "" : "s"}
          {comuna ? ` en ${comunaLabel}` : ""}
          {subcategoria ? ` · ${subcategoriaLabel}` : ""}
        </p>
      </div>

      {/* SIN RESULTADOS */}
      {total === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No encontramos resultados para esta combinación
          </h2>
          <p className="text-gray-600">
            Prueba otra comuna o quita el filtro de subcategoría.
          </p>
        </div>
      )}

      {/* DE TU COMUNA */}
      {grupos.en_tu_comuna.length > 0 && (
        <Section
          titulo="⭐ Emprendimientos de tu comuna"
          subtitulo={`Tienen base en ${comunaLabel}`}
          items={grupos.en_tu_comuna}
        />
      )}

      {/* ATIENDEN TU COMUNA */}
      {grupos.atienden_tu_comuna.length > 0 && (
        <Section
          titulo="📍 También atienden tu comuna"
          subtitulo={`Su base está en otra comuna, pero atienden ${comunaLabel}`}
          items={grupos.atienden_tu_comuna}
        />
      )}

      {/* REGIONAL */}
      {grupos.regional.length > 0 && (
        <Section
          titulo={comuna ? "🌎 Cobertura regional" : "Resultados de la categoría"}
          subtitulo={
            comuna
              ? "Servicios con cobertura en tu región"
              : "Todos los emprendimientos encontrados en esta categoría"
          }
          items={grupos.regional}
        />
      )}

      {/* NACIONAL */}
      {grupos.nacional.length > 0 && (
        <Section
          titulo="🇨🇱 Cobertura nacional"
          subtitulo="Servicios disponibles en todo Chile o de forma online"
          items={grupos.nacional}
        />
      )}
    </div>
  );
}

function Section({
  titulo,
  subtitulo,
  items,
}: {
  titulo: string;
  subtitulo: string;
  items: Item[];
}) {
  return (
    <section className="mb-14">
      <div className="mb-5">
        <h2 className="text-4xl font-black text-gray-900 leading-tight">
          {titulo}
        </h2>

        <p className="text-base text-gray-500 mt-2">{subtitulo}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {items.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function Card({ item }: { item: Item }) {
  const geo = etiquetaGeo(item);

  const subcats = pickArray(item?.subcategorias_nombres)
    .map((x) => s(x))
    .filter(Boolean);

  return (
    <div className="overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm hover:shadow-md transition">
      {/* FOTO */}
      <div className="h-56 bg-gray-100">
        <img
          src={pickFoto(item)}
          alt={item.nombre}
          className="h-full w-full object-cover"
        />
      </div>

      {/* CONTENIDO */}
      <div className="p-5">
        {/* BLOQUE GEOGRÁFICO */}
        <div
          className={`rounded-2xl border px-4 py-3 mb-5 ${geo.bg} ${geo.border}`}
        >
          <div className={`text-base font-extrabold leading-tight ${geo.color}`}>
            {geo.texto}
          </div>

          {geo.subtexto ? (
            <div className="text-sm text-gray-700 mt-1 font-medium">
              {geo.subtexto}
            </div>
          ) : null}
        </div>

        {/* NOMBRE */}
        <h3 className="text-[30px] leading-[1.05] font-black text-gray-900 mb-3">
          {item.nombre}
        </h3>

        {/* CATEGORÍA */}
        <p className="text-sm text-gray-500 mb-3">
          {s(item.categoria_nombre)}
          {subcats.length > 0 ? ` · ${subcats.slice(0, 2).join(" · ")}` : ""}
        </p>

        {/* DESCRIPCIÓN */}
        <p className="text-base text-gray-700 leading-6 min-h-[72px] mb-6">
          {s(item.descripcion_corta) || "Sin descripción disponible."}
        </p>

        {/* BOTÓN */}
        <Link
          href={`/emprendedor/${item.slug}`}
          className="block w-full rounded-2xl bg-black text-white text-center py-4 text-base font-bold hover:opacity-90 transition"
        >
          Ver detalles
        </Link>
      </div>
    </div>
  );
}