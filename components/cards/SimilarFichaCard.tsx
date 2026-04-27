"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { sendSimilarFichaCardViewClick } from "@/components/search/TrackedCardLink";
import type { SimilarFichaItem } from "@/lib/getSimilaresFicha";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Compacto: ~h-32 en Tailwind */
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
  const comunaBase = s(item.comuna_nombre);
  const ctx = s(comunaContextoNombre);
  /** Una sola línea tipo “comuna” para sugerencias compactas */
  const comunaUnaLinea = comunaBase || ctx;

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
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 14,
        background: "#fff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div style={mediaWrap}>
        {mostrarFoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.03) 45%, transparent 70%)",
                pointerEvents: "none",
              }}
              aria-hidden
            />
          </>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 10px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#64748b",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Sin imágenes
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "10px 10px 12px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <h3
          className="line-clamp-2 break-words"
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            color: "#020617",
            lineHeight: 1.25,
            letterSpacing: -0.02,
          }}
        >
          {nombreMostrar}
        </h3>

        {comunaUnaLinea ? (
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {comunaUnaLinea}
          </p>
        ) : null}

        <a
          href={href}
          onClick={handleVerFicha}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 10,
            paddingBottom: 0,
            borderRadius: 10,
            minHeight: 40,
            textDecoration: "none",
            background: "#fff",
            color: "#0f172a",
            fontSize: 13,
            fontWeight: 800,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          Ver ficha
        </a>
      </div>
    </article>
  );
}
