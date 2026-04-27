"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { sendSimilarFichaCardViewClick } from "@/components/search/TrackedCardLink";
import type { SimilarFichaItem } from "@/lib/getSimilaresFicha";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";
import { normalizeText } from "@/lib/search/normalizeText";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Compacto: ~h-32 */
const MEDIA_H = 128;

function urlPareceFotoReal(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  const low = u.toLowerCase();
  if (low.includes("placeholder-emprendedor")) return false;
  return true;
}

type Props = {
  item: SimilarFichaItem;
  comunaContextoNombre: string;
  fromSlug?: string;
  position?: number;
};

export default function SimilarFichaCard({
  item,
  comunaContextoNombre,
  fromSlug,
  position,
}: Props) {
  const nombreEmp = s(item.nombre_emprendimiento);
  const nombreMostrar = nombreEmp
    ? displayTitleCaseWords(nombreEmp)
    : s(item.slug);

  const comunaConsultada = s(comunaContextoNombre);
  const comunaBase = s(item.comuna_nombre);
  const mismoCtxYBase =
    Boolean(comunaConsultada && comunaBase) &&
    normalizeText(comunaConsultada) === normalizeText(comunaBase);

  const subRubro = s(item.subcategoria_nombre);
  const catRubro = s(item.categoria_nombre);
  const lineaRubro1 = subRubro
    ? displayTitleCaseWords(subRubro)
    : catRubro
      ? displayTitleCaseWords(catRubro)
      : "";
  const lineaRubro2 =
    subRubro && catRubro && normalizeText(subRubro) !== normalizeText(catRubro)
      ? displayTitleCaseWords(catRubro)
      : "";

  const descCorta = s(item.descripcion_corta);

  const fotoUrl = s(item.foto_principal_url);
  const [imgBroken, setImgBroken] = useState(false);
  const mostrarFoto = urlPareceFotoReal(fotoUrl) && !imgBroken;

  const href = `/emprendedor/${encodeURIComponent(item.slug)}`;
  const track =
    s(fromSlug).length > 0 && typeof position === "number" && position >= 1;

  function handleVerFicha() {
    if (!track) return;
    sendSimilarFichaCardViewClick({
      fromSlug: s(fromSlug),
      toSlug: s(item.slug),
      bucket: item.bucket,
      position,
    });
  }

  const mediaWrap: CSSProperties = {
    position: "relative",
    width: "100%",
    height: MEDIA_H,
    flexShrink: 0,
    background: "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 55%, #cbd5e1 100%)",
    overflow: "hidden",
  };

  return (
    <article
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm"
    >
      <div style={mediaWrap}>
        {mostrarFoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoUrl}
              alt=""
              className="block h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-slate-900/[0.03] to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-2.5 text-center">
            <span className="text-[11px] font-extrabold tracking-wide text-slate-600">
              Sin imágenes
            </span>
            <span className="text-[10px] font-semibold leading-snug text-slate-500">
              Puedes pedir referencias por WhatsApp
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 border-t border-slate-100 px-2.5 pb-3 pt-2">
        <h3 className="m-0 line-clamp-2 break-words text-[14px] font-black leading-snug tracking-tight text-slate-950">
          {nombreMostrar}
        </h3>

        {lineaRubro1 ? (
          <p className="m-0 text-[12px] font-semibold leading-snug text-slate-600">{lineaRubro1}</p>
        ) : null}
        {lineaRubro2 ? (
          <p className="m-0 -mt-0.5 text-[12px] font-medium leading-snug text-slate-500">{lineaRubro2}</p>
        ) : null}

        {descCorta ? (
          <p className="m-0 line-clamp-2 text-[12px] font-medium leading-snug text-slate-600">
            {descCorta}
          </p>
        ) : null}

        <div className="mt-1 space-y-0.5 text-[12px] font-semibold leading-snug text-slate-600">
          {comunaConsultada ? (
            mismoCtxYBase ? (
              <p className="m-0">En {comunaConsultada}</p>
            ) : comunaBase ? (
              <>
                <p className="m-0">Atiende {comunaConsultada}</p>
                <p className="m-0 text-[11px] font-medium text-slate-500">Base en {comunaBase}</p>
              </>
            ) : (
              <p className="m-0">Atiende {comunaConsultada}</p>
            )
          ) : comunaBase ? (
            <p className="m-0">{comunaBase}</p>
          ) : null}
        </div>

        <a
          href={href}
          onClick={handleVerFicha}
          className="mt-auto flex min-h-[40px] items-center justify-center rounded-[10px] border border-slate-200 bg-white pt-2.5 text-[13px] font-extrabold text-slate-900 shadow-sm"
        >
          Ver ficha
        </a>
      </div>
    </article>
  );
}
