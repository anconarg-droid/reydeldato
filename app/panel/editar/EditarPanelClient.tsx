"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EditarFocus } from "./types";

type NegocioItem = {
  nombre: string;
  descripcionCorta: string;
  descripcionLarga: string;
  fotoPrincipalUrl: string;
  galeriaUrls: string[];
  instagram: string;
  web: string;
  email: string;
  categoriaSlug: string;
  subcategoriasSlugs: string[];
};

const BLOQUE_IDS: Record<EditarFocus, string> = {
  fotos: "bloque-fotos",
  descripcion: "bloque-descripcion",
  redes: "bloque-redes",
  categoria: "bloque-categoria",
};

function buildMejorarHref(id: string, slug: string): string {
  if (id.trim()) return `/mejorar-ficha?id=${encodeURIComponent(id.trim())}`;
  if (slug.trim()) return `/mejorar-ficha?slug=${encodeURIComponent(slug.trim())}`;
  return "/mejorar-ficha";
}

export default function EditarPanelClient({
  id,
  slug,
  focus,
}: {
  id: string;
  slug: string;
  focus: EditarFocus | null;
}) {
  const [item, setItem] = useState<NegocioItem | null>(null);
  const [loading, setLoading] = useState(!!id.trim());
  const [error, setError] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<EditarFocus | null>(null);
  const didScrollRef = useRef(false);

  const mejorarHref = buildMejorarHref(id, slug);
  const hasContext = Boolean(id.trim() || slug.trim());

  useEffect(() => {
    const cleanId = id.trim();
    if (!cleanId) {
      setLoading(false);
      setItem(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/panel/negocio?id=${encodeURIComponent(cleanId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res.item) {
          const it = res.item as Record<string, unknown>;
          setItem({
            nombre: String(it.nombre ?? ""),
            descripcionCorta: String(it.descripcionCorta ?? ""),
            descripcionLarga: String(it.descripcionLarga ?? ""),
            fotoPrincipalUrl: String(it.fotoPrincipalUrl ?? ""),
            galeriaUrls: Array.isArray(it.galeriaUrls)
              ? (it.galeriaUrls as string[]).filter(Boolean)
              : [],
            instagram: String(it.instagram ?? ""),
            web: String(it.web ?? ""),
            email: String(it.email ?? ""),
            categoriaSlug: String(it.categoriaSlug ?? ""),
            subcategoriasSlugs: Array.isArray(it.subcategoriasSlugs)
              ? (it.subcategoriasSlugs as string[]).filter(Boolean)
              : [],
          });
        } else {
          setItem(null);
          setError(
            typeof res?.message === "string"
              ? res.message
              : "No se pudo cargar tu ficha."
          );
        }
      })
      .catch(() => {
        setItem(null);
        setError("Error de red al cargar tu ficha.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!focus || didScrollRef.current) return;
    if (loading) return;

    const elId = BLOQUE_IDS[focus];
    const t = window.setTimeout(() => {
      const el = document.getElementById(elId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        didScrollRef.current = true;
        setPulseKey(focus);
        window.setTimeout(() => setPulseKey(null), 4500);
      }
    }, 100);

    return () => window.clearTimeout(t);
  }, [focus, loading]);

  const fotosExtra = item
    ? item.galeriaUrls.filter((u) => u && u.trim()).length
    : 0;
  const tieneFotoPrincipal = Boolean(item?.fotoPrincipalUrl?.trim());

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Mejorar tu ficha
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cambios rápidos por sección. La edición completa sigue en{" "}
            <Link href={mejorarHref} className="text-indigo-600 font-semibold underline">
              mejorar ficha
            </Link>
            .
          </p>
        </div>
        <Link
          href={hasContext ? `/panel?${id.trim() ? `id=${encodeURIComponent(id.trim())}` : `slug=${encodeURIComponent(slug.trim())}`}` : "/panel"}
          className="text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          ← Volver al panel
        </Link>
      </div>

      {!hasContext ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Falta identificar tu negocio. Abre esta página desde el panel o añade{" "}
          <code className="bg-amber-100/80 px-1 rounded">?id=…</code> o{" "}
          <code className="bg-amber-100/80 px-1 rounded">?slug=…</code> en la URL.
        </div>
      ) : slug.trim() && !id.trim() ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No encontramos una ficha con el slug indicado. Revisa la URL o usa{" "}
          <code className="bg-amber-100/80 px-1 rounded">?id=</code> con tu ID.
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-600">Cargando datos de tu ficha…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : item ? (
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{item.nombre || "Tu negocio"}</span>
        </p>
      ) : null}

      <div className="space-y-4">
        <Bloque
          id={BLOQUE_IDS.fotos}
          titulo="Fotos"
          resaltado={pulseKey === "fotos"}
          href={mejorarHref}
        >
          <p className="text-sm text-gray-700">
            {tieneFotoPrincipal
              ? "Tienes foto principal."
              : "Aún no hay foto principal."}{" "}
            {fotosExtra > 0
              ? `Galería: ${fotosExtra} foto(s) extra.`
              : "Sin fotos extra en galería."}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Sube una buena foto principal y varias de tu trabajo para generar confianza.
          </p>
        </Bloque>

        <Bloque
          id={BLOQUE_IDS.descripcion}
          titulo="Descripción"
          resaltado={pulseKey === "descripcion"}
          href={mejorarHref}
        >
          <p className="text-sm text-gray-700 line-clamp-3">
            {item?.descripcionCorta ? (
              <>
                <span className="font-medium text-gray-800">Frase: </span>
                {item.descripcionCorta}
              </>
            ) : (
              <span className="text-amber-800">Falta una frase corta que resuma tu negocio.</span>
            )}
          </p>
          {item?.descripcionLarga ? (
            <p className="text-sm text-gray-600 mt-2 line-clamp-4">
              <span className="font-medium text-gray-800">Descripción: </span>
              {item.descripcionLarga}
            </p>
          ) : (
            <p className="text-sm text-amber-800 mt-2">
              Puedes ampliar con una descripción más completa.
            </p>
          )}
        </Bloque>

        <Bloque
          id={BLOQUE_IDS.redes}
          titulo="Redes"
          resaltado={pulseKey === "redes"}
          href={mejorarHref}
        >
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              Instagram:{" "}
              {item?.instagram ? (
                <span className="font-medium">{item.instagram}</span>
              ) : (
                <span className="text-amber-800">no indicado</span>
              )}
            </li>
            <li>
              Web:{" "}
              {item?.web ? (
                <span className="font-medium break-all">{item.web}</span>
              ) : (
                <span className="text-amber-800">no indicado</span>
              )}
            </li>
            <li>
              Email:{" "}
              {item?.email ? (
                <span className="font-medium break-all">{item.email}</span>
              ) : (
                <span className="text-amber-800">no indicado</span>
              )}
            </li>
          </ul>
        </Bloque>

        <Bloque
          id={BLOQUE_IDS.categoria}
          titulo="Categoría"
          resaltado={pulseKey === "categoria"}
          href={mejorarHref}
        >
          <p className="text-sm text-gray-700">
            Categoría:{" "}
            {item?.categoriaSlug ? (
              <span className="font-medium">{item.categoriaSlug}</span>
            ) : (
              <span className="text-amber-800">sin categoría</span>
            )}
          </p>
          {item && item.subcategoriasSlugs.length > 0 ? (
            <p className="text-sm text-gray-600 mt-1">
              Subcategorías: {item.subcategoriasSlugs.join(", ")}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Las subcategorías ayudan a que te encuentren mejor.
            </p>
          )}
        </Bloque>
      </div>
    </div>
  );
}

function Bloque({
  id,
  titulo,
  resaltado,
  href,
  children,
}: {
  id: string;
  titulo: string;
  resaltado: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rounded-xl border bg-white p-4 shadow-sm scroll-mt-24 transition-[box-shadow,ring] duration-300 ${
        resaltado
          ? "ring-2 ring-amber-400 ring-offset-2 shadow-md border-amber-200"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-base font-extrabold text-gray-900">{titulo}</h2>
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline"
        >
          Editar
        </Link>
      </div>
      {children}
    </section>
  );
}
