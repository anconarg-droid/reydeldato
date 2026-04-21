"use client";

import { useEffect, useState } from "react";
import {
  buildInstagramUrl,
  buildWebsiteUrl,
  buildWhatsappUrl,
  formatInstagramDisplay,
  formatWebsiteDisplay,
  formatWhatsappDisplay,
} from "@/lib/formatPublicLinks";
import { clampDescripcionCortaFichaDisplay } from "@/lib/emprendedorFichaUi";

type PanelItem = Record<string, unknown>;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export default function PreviewFichaClient({
  emprendedorId,
  initialToken,
}: {
  emprendedorId: string;
  initialToken: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<PanelItem | null>(null);

  useEffect(() => {
    const token = initialToken.trim();
    if (!emprendedorId.trim() || !token) {
      setLoading(false);
      setError("Falta token de acceso en la URL (token o access_token).");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({
          id: emprendedorId.trim(),
          token,
        });
        const res = await fetch(`/api/preview/item?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          item?: PanelItem | null;
          message?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data?.ok || !data.item) {
          setError(
            s(data.message) ||
              s(data.error) ||
              "No se pudo cargar la vista previa.",
          );
          setItem(null);
          return;
        }
        setItem(data.item);
        setError(null);
      } catch {
        if (!cancelled) setError("Error de red al cargar la vista previa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emprendedorId, initialToken]);

  if (loading) {
    return (
      <p className="text-center text-slate-600 font-semibold py-16">
        Cargando vista previa…
      </p>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-lg mx-auto rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h1 className="text-lg font-extrabold">No disponible</h1>
        <p className="mt-2 text-sm font-medium">{error || "Sin datos."}</p>
      </div>
    );
  }

  const nombre = s(item.nombre) || s(item.nombre_emprendimiento) || "Tu negocio";
  const descCorta = clampDescripcionCortaFichaDisplay(
    s(item.descripcionCorta) || s(item.frase_negocio),
  );
  const descLarga = s(item.descripcionLarga).replace(/\s+/g, " ").trim();
  const foto = s(item.fotoPrincipalUrl) || s(item.foto_principal_url);
  const galeria = Array.isArray(item.galeriaUrls)
    ? (item.galeriaUrls as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const rawWa = s(item.whatsapp);
  const waHref = buildWhatsappUrl(rawWa);
  const waLabel = formatWhatsappDisplay(rawWa);
  const ig = s(item.instagram);
  const web = s(item.web) || s(item.sitio_web);
  const igHref = buildInstagramUrl(ig);
  const webHref = buildWebsiteUrl(web);
  const comuna = s(item.comunaBaseNombre) || s(item.comunaBaseSlug);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 text-center">
        Vista previa privada: así puede verse tu ficha cuando esté publicada (no es visible en el
        directorio público todavía).
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          {foto ? (
            <div className="h-36 w-36 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-500 px-2">
              Sin foto principal
            </div>
          )}
          <div className="text-center w-full min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{nombre}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-700 leading-snug">{descCorta || "—"}</p>
            {descLarga ? (
              <p className="mt-4 text-left text-sm text-slate-600 whitespace-pre-wrap">{descLarga}</p>
            ) : null}
          </div>
        </div>

        {comuna ? (
          <p className="mt-6 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
            Comuna base · <span className="text-slate-800 normal-case font-semibold">{comuna}</span>
          </p>
        ) : null}

        {galeria.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Galería</p>
            <div className="flex flex-wrap gap-2">
              {galeria.slice(0, 8).map((u) => (
                <div
                  key={u}
                  className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              WhatsApp · {waLabel}
            </a>
          ) : null}
          {igHref ? (
            <a
              href={igHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-extrabold text-slate-800 hover:bg-slate-50"
            >
              Instagram · {formatInstagramDisplay(ig)}
            </a>
          ) : null}
          {webHref ? (
            <a
              href={webHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl border border-sky-200 bg-sky-50 py-3 text-center text-sm font-extrabold text-sky-900 hover:bg-sky-100"
            >
              Web · {formatWebsiteDisplay(webHref)}
            </a>
          ) : null}
        </div>
      </article>
    </div>
  );
}
