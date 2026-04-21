"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { sendSimilarFichaCardViewClick } from "@/components/search/TrackedCardLink";
import {
  type SimilarFichaBucket,
  type SimilarFichaItem,
} from "@/lib/getSimilaresFicha";
import { normalizeText } from "@/lib/search/normalizeText";
import {
  getPlaceholderSinFotoSub,
  getPlaceholderSinFotoTitulo,
} from "@/lib/productRules";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const MEDIA_H = 140;

function urlPareceFotoReal(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  const low = u.toLowerCase();
  if (low.includes("placeholder-emprendedor")) return false;
  return true;
}

/** Badges sobre la imagen, alineados a búsqueda / referencia visual. */
function badgeEnImagen(
  bucket: SimilarFichaBucket
): { text: string; style: CSSProperties } | null {
  switch (bucket) {
    case "misma_comuna":
      return {
        text: "En tu comuna",
        style: {
          background: "#ecfdf5",
          color: "#047857",
          border: "1px solid #a7f3d0",
        },
      };
    case "atiende_comuna":
      return {
        text: "Atiende tu comuna",
        style: {
          background: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
        },
      };
    case "misma_region":
      return {
        text: "Misma región",
        style: {
          background: "#fffbeb",
          color: "#a16207",
          border: "1px solid #fde68a",
        },
      };
    case "nacional":
      return {
        text: "Todo Chile",
        style: {
          background: "#f1f5f9",
          color: "#475569",
          border: "1px solid #e2e8f0",
        },
      };
    case "misma_categoria":
      return {
        text: "Mismo rubro",
        style: {
          background: "#faf5ff",
          color: "#6b21a8",
          border: "1px solid #e9d5ff",
        },
      };
    default:
      return null;
  }
}

type Props = {
  item: SimilarFichaItem;
  /** Comuna de contexto (ej. búsqueda) para línea “Atiende …” bajo la ubicación. */
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
  const rubro = s(item.subcategoria_nombre) || s(item.categoria_nombre) || "Servicios";
  const comunaLinea = s(item.comuna_nombre);
  const ctx = s(comunaContextoNombre);
  const mismoNombreCtxYBase =
    Boolean(ctx && comunaLinea) &&
    normalizeText(ctx) === normalizeText(comunaLinea);

  let pinPrincipal = "";
  let pinSecundario = "";
  if (ctx) {
    if (item.bucket === "misma_comuna") {
      pinPrincipal = `En ${ctx}`;
    } else if (item.bucket === "atiende_comuna") {
      pinPrincipal = `Atiende ${ctx}`;
      if (comunaLinea && !mismoNombreCtxYBase) {
        pinSecundario = `Base en ${comunaLinea}`;
      }
    } else {
      if (mismoNombreCtxYBase) {
        pinPrincipal = `En ${ctx}`;
      } else {
        pinPrincipal = `Atiende ${ctx}`;
        if (comunaLinea) pinSecundario = `Base en ${comunaLinea}`;
      }
    }
  } else {
    pinPrincipal = comunaLinea;
  }

  const fotoUrl = s(item.foto_principal_url);
  const [imgBroken, setImgBroken] = useState(false);
  const mostrarFoto = urlPareceFotoReal(fotoUrl) && !imgBroken;

  const badgeImg = badgeEnImagen(item.bucket);
  const href = `/emprendedor/${encodeURIComponent(item.slug)}`;
  const track =
    s(fromSlug).length > 0 &&
    typeof position === "number" &&
    position >= 1;

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
    background: "linear-gradient(160deg, #cbd5e1 0%, #e2e8f0 55%, #f1f5f9 100%)",
    overflow: "hidden",
  };

  const sinFotoInner: CSSProperties = {
    position: "relative",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    textAlign: "center",
    gap: 4,
  };

  const badgeBase: CSSProperties = {
    position: "absolute",
    left: 10,
    top: 10,
    zIndex: 2,
    padding: "4px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.02,
    lineHeight: 1.2,
    maxWidth: "calc(100% - 20px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
  };

  return (
    <article
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
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
                  "linear-gradient(to top, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.04) 50%, transparent 72%)",
                pointerEvents: "none",
              }}
              aria-hidden
            />
          </>
        ) : (
          <div style={sinFotoInner}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#475569",
                letterSpacing: "0.08em",
              }}
            >
              {getPlaceholderSinFotoTitulo()}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#94a3b8",
                lineHeight: 1.35,
                maxWidth: "100%",
              }}
            >
              {getPlaceholderSinFotoSub()}
            </span>
          </div>
        )}
        {badgeImg ? (
          <span style={{ ...badgeBase, ...badgeImg.style }}>{badgeImg.text}</span>
        ) : null}
      </div>

      <div
        style={{
          padding: "12px 12px 14px",
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
            fontSize: 16,
            fontWeight: 900,
            color: "#020617",
            lineHeight: 1.22,
            letterSpacing: -0.02,
          }}
        >
          {nombreMostrar}
        </h3>

        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 12,
            fontWeight: 500,
            color: "#64748b",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {rubro}
        </p>

        {pinPrincipal ? (
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 13,
              fontWeight: 600,
              color: "#64748b",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            📍 {pinPrincipal}
          </p>
        ) : null}

        {pinSecundario ? (
          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: 11,
              fontWeight: 500,
              color: "#94a3b8",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {pinSecundario}
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
            paddingTop: 12,
            paddingBottom: 0,
            borderRadius: 12,
            minHeight: 44,
            textDecoration: "none",
            background: "#fff",
            color: "#0f172a",
            fontSize: 14,
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
