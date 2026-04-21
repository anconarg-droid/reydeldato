"use client";

import { useEffect, useMemo, useState } from "react";
import { etiquetaModalidadAtencion } from "@/lib/modalidadesAtencion";
import {
  formatDireccionLocalLinea,
  sortLocalesFichaPrincipalPrimero,
} from "@/lib/emprendedorLocalesFichaPublica";
import {
  buildMapsLinks,
  emprendedorTieneModalidadLocalFisico,
} from "@/lib/maps";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";

type LocalFicha = {
  nombre_local: string | null;
  direccion: string;
  referencia?: string;
  comuna_nombre: string;
  comuna_slug: string;
  es_principal: boolean;
  lat?: number;
  lng?: number;
};

function MapasNavegacionLocal({
  loc,
  mostrar,
}: {
  loc: LocalFicha;
  mostrar: boolean;
}) {
  if (!mostrar) return null;
  const maps = buildMapsLinks(loc.direccion, loc.comuna_nombre, loc.lat, loc.lng);
  if (!maps) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <a
        href={maps.waze}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      >
        Abrir en Waze
      </a>
      <a
        href={maps.google}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        Ver en Maps
      </a>
    </div>
  );
}

type Emprendedor = {
  id: string;
  slug: string;
  nombre: string;
  /** Solo relleno legacy si la API aún la enviara; la UI pública prioriza `locales`. */
  direccion?: string;
  /** Frase corta opcional; se muestra debajo del nombre. */
  frase_negocio?: string;
  descripcion_corta: string;
  descripcion_larga?: string;
  categoria_nombre: string;
  subcategorias_nombres: string[];
  comuna_base_nombre: string;
  cobertura: string;
  comunas_cobertura_nombres: string[];
  foto_principal_url?: string;
  galeria_urls?: string[];
  whatsapp?: string;
  instagram?: string;
  web?: string;
  email?: string;
  modalidades_atencion?: string[];
  en_tu_comuna?: boolean;
  atiende_tu_comuna?: boolean;
  nivel_cobertura?: string;
  /** Locales físicos (desde emprendedor_locales). 1 = mostrar normal; 2–3 = bloque "Locales físicos". */
  locales?: LocalFicha[];
};

type Similar = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string;
  comuna_base_nombre: string;
  foto_principal_url?: string;
};

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function pickArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function pickFoto(url?: string) {
  return s(url) || "/placeholder-emprendedor.jpg";
}

function etiquetaGeo(item: Emprendedor) {
  if (item?.en_tu_comuna) {
    return {
      texto: "⭐ Emprendimiento de tu comuna",
      subtexto: item?.comuna_base_nombre
        ? `Base en ${item.comuna_base_nombre}`
        : "",
      color: "text-amber-800",
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
      color: "text-sky-800",
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
      color: "text-emerald-800",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }

  return {
    texto: "🇨🇱 Cobertura nacional",
    subtexto: item?.comuna_base_nombre
      ? `Base en ${item.comuna_base_nombre}`
      : "",
    color: "text-violet-800",
    bg: "bg-violet-50",
    border: "border-violet-200",
  };
}

export default function EmprendedorClient({ slug }: { slug: string }) {
  const [item, setItem] = useState<Emprendedor | null>(null);
  const [similares, setSimilares] = useState<Similar[]>([]);

  useEffect(() => {
    async function cargar() {
      const res = await fetch(`/api/emprendedor/${slug}`);
      const data = await res.json();

      setItem(data.item);

      if (data?.item?.id && data?.item?.slug) {
        await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emprendimiento_id: data.item.id,
            slug: data.item.slug,
            event: "view_ficha",
            origen: "ficha",
          }),
        });
      }
    }

    cargar();
  }, [slug]);

  useEffect(() => {
    async function cargarSimilares() {
      try {
        const res = await fetch(`/api/emprendedor/${slug}/similares`);
        const data = await res.json();

        if (data?.ok && Array.isArray(data.items)) {
          setSimilares(data.items);
        } else {
          setSimilares([]);
        }
      } catch {
        setSimilares([]);
      }
    }

    cargarSimilares();
  }, [slug]);

  const localesOrdenados = useMemo(
    () =>
      sortLocalesFichaPrincipalPrimero(
        item && Array.isArray(item.locales) ? item.locales : []
      ),
    [item]
  );

  const puedeMostrarMapasLocales = useMemo(
    () => emprendedorTieneModalidadLocalFisico(item?.modalidades_atencion),
    [item?.modalidades_atencion]
  );

  if (!item) {
    return <div className="p-8">Cargando emprendimiento...</div>;
  }

  async function track(event: string, origen = "ficha") {
    const i = item;
    if (!i) return;
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emprendimiento_id: i.id,
          slug: i.slug,
          event,
          origen,
        }),
      });
    } catch (e) {
      console.error("TRACK ERROR", e);
    }
  }

  const clickWhatsapp = async () => {
    await track("click_whatsapp", "ficha");
    if (item.whatsapp) {
      window.open(`https://wa.me/${item.whatsapp}`, "_blank");
    }
  };

  const clickInstagram = async () => {
    await track("click_instagram", "ficha");
    if (item.instagram) {
      const ig = item.instagram.startsWith("http")
        ? item.instagram
        : `https://instagram.com/${item.instagram}`;
      window.open(ig, "_blank");
    }
  };

  const clickWeb = async () => {
    await track("click_web", "ficha");
    if (item.web) {
      const web = item.web.startsWith("http")
        ? item.web
        : `https://${item.web}`;
      window.open(web, "_blank");
    }
  };

  const compartir = async () => {
    const url = `${window.location.origin}/emprendedor/${item.slug}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.nombre,
          text: `Mira este emprendimiento en Rey del Dato`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copiado para compartir");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copiado para compartir");
      } catch {}
    }
  };

  const geo = etiquetaGeo(item);
  const subcats = pickArray(item.subcategorias_nombres)
    .map((x) => s(x))
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* BLOQUE SUPERIOR */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8 mb-10">
        {/* FOTO PRINCIPAL */}
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="h-[420px] bg-gray-100">
            <img
              src={pickFoto(item.foto_principal_url)}
              alt={item.nombre}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* INFO PRINCIPAL */}
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          {/* ETIQUETA GEO GRANDE */}
          <div
            className={`rounded-2xl border px-4 py-4 mb-6 ${geo.bg} ${geo.border}`}
          >
            <div className={`text-lg font-black leading-tight ${geo.color}`}>
              {geo.texto}
            </div>

            {geo.subtexto ? (
              <div className="text-base text-gray-700 mt-2 font-semibold">
                {geo.subtexto}
              </div>
            ) : null}
          </div>

          {/* NOMBRE */}
          <h1 className="text-4xl md:text-5xl font-black leading-[1.02] text-gray-900 mb-2">
            {item.nombre}
          </h1>

          {item.frase_negocio ? (
            <p className="text-xl text-gray-600 font-semibold mb-4">
              {item.frase_negocio}
            </p>
          ) : null}

          {/* CATEGORÍA */}
          <p className="text-base text-gray-500 mb-3">
            {s(item.categoria_nombre)}
            {subcats.length > 0 ? ` · ${subcats.slice(0, 3).join(" · ")}` : ""}
          </p>

          {/* DESCRIPCIÓN CORTA */}
          <p className="text-lg text-gray-700 leading-7 mb-6">
            {item.descripcion_corta}
          </p>

          {/* CONTACTO */}
          <div className="flex flex-wrap gap-3 mb-5">
            {item.whatsapp && (
              <button
                onClick={clickWhatsapp}
                className="rounded-2xl bg-green-500 px-5 py-3 text-base font-bold text-white"
              >
                WhatsApp
              </button>
            )}

            {item.instagram && (
              <button
                onClick={clickInstagram}
                className="rounded-2xl bg-pink-500 px-5 py-3 text-base font-bold text-white"
              >
                Instagram
              </button>
            )}

            {item.web && (
              <button
                onClick={clickWeb}
                className="rounded-2xl bg-black px-5 py-3 text-base font-bold text-white"
              >
                Sitio web
              </button>
            )}

            <button
              onClick={compartir}
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-base font-bold text-gray-900"
            >
              Compartir
            </button>
          </div>

          {/* DATOS CORTOS */}
          <div className="space-y-3">
            {item.comuna_base_nombre && (
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Comuna base
                </div>
                <div className="text-base font-semibold text-gray-900 mt-1">
                  {item.comuna_base_nombre}
                </div>
              </div>
            )}

            {localesOrdenados.length >= 2 && (
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Locales
                </div>
                <ul className="space-y-3">
                  {localesOrdenados.map((loc, idx) => (
                    <li
                      key={`${loc.comuna_slug}-${idx}`}
                      className="text-base text-gray-900 border-b border-gray-200 last:border-0 pb-2 last:pb-0"
                    >
                      <span className="font-semibold">
                        {loc.nombre_local ? `${loc.nombre_local} — ` : ""}
                        {loc.comuna_nombre}
                        {loc.es_principal ? " (principal)" : ""}
                      </span>
                      {formatDireccionLocalLinea(loc) ? (
                        <span className="block text-gray-700 mt-0.5">
                          {formatDireccionLocalLinea(loc)}
                        </span>
                      ) : null}
                      <MapasNavegacionLocal
                        loc={loc}
                        mostrar={puedeMostrarMapasLocales}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {localesOrdenados.length === 1 && (
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Local
                </div>
                <div className="text-base font-semibold text-gray-900 mt-1">
                  {localesOrdenados[0].nombre_local
                    ? `${localesOrdenados[0].nombre_local} — `
                    : ""}
                  {localesOrdenados[0].comuna_nombre}
                </div>
                {formatDireccionLocalLinea(localesOrdenados[0]) ? (
                  <div className="text-sm text-gray-700 mt-1">
                    {formatDireccionLocalLinea(localesOrdenados[0])}
                  </div>
                ) : null}
                <MapasNavegacionLocal
                  loc={localesOrdenados[0]}
                  mostrar={puedeMostrarMapasLocales}
                />
              </div>
            )}

            {item.modalidades_atencion &&
              item.modalidades_atencion.length > 0 && (
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Tipo de atención
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.modalidades_atencion.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800 border border-gray-200"
                      >
                        {etiquetaModalidadAtencion(m)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="mb-10 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-black text-gray-900 mb-4">
          Sobre este emprendimiento
        </h2>
        <p className="text-lg leading-8 text-gray-700">
          {item.descripcion_larga || item.descripcion_corta}
        </p>
      </div>

      {/* COBERTURA */}
      {item.comunas_cobertura_nombres &&
        item.comunas_cobertura_nombres.length > 0 && (
          <div className="mb-10 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Cobertura
            </h2>
            <p className="text-lg leading-8 text-gray-700">
              {item.comunas_cobertura_nombres.join(", ")}
            </p>
          </div>
        )}

      {/* GALERÍA */}
      {item.galeria_urls && item.galeria_urls.length > 0 && (
        <div className="mb-10 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black text-gray-900 mb-5">Galería</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {item.galeria_urls.map((img, i) => (
              <img
                key={i}
                src={img}
                className="rounded-2xl object-cover h-56 w-full"
                alt={`${item.nombre} ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* SIMILARES */}
      {similares.length > 0 && (
        <div className="mb-10">
          <h2 className="text-4xl font-black text-gray-900 mb-5">
            Otros emprendimientos que atienden tu comuna
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {similares.map((sim) => {
              const nombreSimilar = displayTitleCaseWords(String(sim.nombre ?? "").trim());
              return (
              <div
                key={sim.id}
                className="overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="h-56 bg-gray-100">
                  <img
                    src={pickFoto(sim.foto_principal_url)}
                    className="w-full h-full object-cover"
                    alt={nombreSimilar || sim.nombre}
                  />
                </div>

                <div className="p-5">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 mb-5">
                    <div className="text-base font-extrabold text-sky-700">
                      📍 Atiende tu comuna
                    </div>
                    <div className="text-sm text-gray-700 mt-1 font-medium">
                      Base en {sim.comuna_base_nombre}
                    </div>
                  </div>

                  <h3 className="text-[30px] leading-[1.05] font-black text-gray-900 mb-3">
                    {nombreSimilar || sim.nombre}
                  </h3>

                  <p className="text-base text-gray-700 leading-6 min-h-[72px] mb-6">
                    {sim.descripcion_corta}
                  </p>

                  <a
                    href={`/emprendedor/${sim.slug}`}
                    className="block w-full rounded-2xl bg-black text-white text-center py-4 text-base font-bold hover:opacity-90 transition"
                  >
                    Ver detalles
                  </a>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}