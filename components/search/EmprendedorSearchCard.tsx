"use client";

import type { CSSProperties } from "react";
import TrackedCardLink, {
  type CardViewListingSource,
} from "@/components/search/TrackedCardLink";

export type EmprendedorSearchCardProps = {
  slug: string;
  nombre: string;
  fotoPrincipalUrl: string;
  whatsappPrincipal: string;
  /** Motor monetización: presentación, no ranking. */
  esFichaCompleta: boolean;
  estadoFicha?: "ficha_completa" | "ficha_basica";
  /**
   * Bloque territorial en búsqueda por comuna.
   * `null` en búsqueda global: no se muestra pill territorial.
   */
  bloqueTerritorial: "de_tu_comuna" | "atienden_tu_comuna" | null;
  frase: string;
  descripcionLibre: string;
  subcategoriasNombres?: string[];
  subcategoriasSlugs?: string[];
  categoriaNombre?: string;
  /** Comuna base del emprendimiento (nombre legible). */
  comunaBaseNombre: string;
  /** Reservado para layouts que sigan mostrando cobertura extendida; la tarjeta prioriza solo comuna base. */
  atiendeLine: string;
  /** Recién publicado (~30 días); si no llega del API, no se muestra badge. */
  esNuevo?: boolean;
  /**
   * Cuando exista señal real (ej. horarios / SLA). Sin datos en API no se envía.
   */
  disponibleHoy?: boolean;
  analyticsSource?: CardViewListingSource;
};

function buildWhatsappHref(numero: string) {
  const clean = (numero || "").replace(/[^\d]/g, "");
  return clean ? `https://wa.me/${clean}` : "";
}

function prettySubNameFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function rubrosTokens(p: EmprendedorSearchCardProps): string[] {
  const fromNombres = Array.isArray(p.subcategoriasNombres)
    ? p.subcategoriasNombres
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    : [];
  if (fromNombres.length) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of fromNombres) {
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
      if (out.length >= 4) break;
    }
    return out;
  }
  const fromSlugs = Array.isArray(p.subcategoriasSlugs)
    ? p.subcategoriasSlugs
    : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of fromSlugs) {
    const label = prettySubNameFromSlug(String(s || "").trim());
    if (!label) continue;
    const k = label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(label);
    if (out.length >= 4) break;
  }
  if (out.length) return out;
  const cat = String(p.categoriaNombre || "").trim();
  return cat ? [cat] : [];
}

/** Una línea: frase si existe; si no, inicio de descripción útil (sin texto genérico de relleno). */
function taglineOneLine(p: EmprendedorSearchCardProps): string | null {
  const f = String(p.frase || "").trim();
  if (f.length > 0) return f;
  const raw = String(p.descripcionLibre || "")
    .trim()
    .replace(/\s+/g, " ");
  if (raw.length < 16) return null;
  return raw;
}

const PLACEHOLDER = "/placeholder-emprendedor.jpg";

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: 0.01,
  maxWidth: "100%",
};

export default function EmprendedorSearchCard(p: EmprendedorSearchCardProps) {
  const whatsappHref = buildWhatsappHref(p.whatsappPrincipal);
  const fichaHref = `/emprendedor/${p.slug}`;
  const isComplete =
    p.esFichaCompleta || p.estadoFicha === "ficha_completa";
  const territorialLabel =
    p.bloqueTerritorial === "de_tu_comuna"
      ? "De tu comuna"
      : p.bloqueTerritorial === "atienden_tu_comuna"
        ? "Atiende tu comuna"
        : null;
  const baseLabel = String(p.comunaBaseNombre || "").trim() || "—";
  const rubros = rubrosTokens(p);
  const rubrosText = rubros.join(" · ");
  const tagline = taglineOneLine(p);
  const esNuevo = p.esNuevo === true;
  const disponible = p.disponibleHoy === true;
  const analyticsSource = p.analyticsSource ?? "search";

  const cardStyle: CSSProperties = {
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    transform: "translateY(0)",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  };

  const mediaStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 148,
    flexShrink: 0,
    background: "linear-gradient(145deg, #e2e8f0 0%, #f1f5f9 55%, #e8eef5 100%)",
  };

  const imgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  const bodyStyle: CSSProperties = {
    padding: "14px 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
    minHeight: 0,
  };

  const chipsRowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginBottom: 2,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.25,
    letterSpacing: -0.02,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  };

  const taglineStyle: CSSProperties = {
    margin: 0,
    fontSize: 13,
    fontWeight: 500,
    color: "#475569",
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const locStyle: CSSProperties = {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  };

  const rubrosStyle: CSSProperties = {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const ctaRowStyle: CSSProperties = {
    display: "flex",
    gap: 8,
    marginTop: "auto",
    paddingTop: 4,
  };

  const btnWa: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    minHeight: 48,
    textDecoration: "none",
    background: "#16a34a",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
  };

  const btnProfile: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    minHeight: 48,
    textDecoration: "none",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 750,
    border: "1px solid rgba(15, 23, 42, 0.12)",
  };

  return (
    <article
      style={cardStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 10px 28px rgba(15, 23, 42, 0.11)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 14px rgba(15, 23, 42, 0.07)";
      }}
    >
      <div style={mediaStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.fotoPrincipalUrl || PLACEHOLDER}
          alt=""
          style={imgStyle}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
      </div>

      <div style={bodyStyle}>
        {(territorialLabel ||
          isComplete ||
          esNuevo ||
          disponible) && (
          <div style={chipsRowStyle} aria-label="Indicadores">
            {territorialLabel ? (
              <span
                style={{
                  ...chipBase,
                  background:
                    p.bloqueTerritorial === "de_tu_comuna"
                      ? "#ecfdf5"
                      : "#eff6ff",
                  color:
                    p.bloqueTerritorial === "de_tu_comuna"
                      ? "#047857"
                      : "#1d4ed8",
                  border: `1px solid ${
                    p.bloqueTerritorial === "de_tu_comuna"
                      ? "#a7f3d0"
                      : "#bfdbfe"
                  }`,
                }}
              >
                {territorialLabel}
              </span>
            ) : null}
            {isComplete ? (
              <span
                style={{
                  ...chipBase,
                  background: "#f0fdf4",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                }}
              >
                Perfil completo
              </span>
            ) : null}
            {esNuevo ? (
              <span
                style={{
                  ...chipBase,
                  background: "#f5f3ff",
                  color: "#5b21b6",
                  border: "1px solid #ddd6fe",
                }}
              >
                Nuevo
              </span>
            ) : null}
            {disponible ? (
              <span
                style={{
                  ...chipBase,
                  background: "#fffbeb",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                }}
              >
                Disponible hoy
              </span>
            ) : null}
          </div>
        )}

        <h3 style={titleStyle}>{p.nombre || "Emprendimiento"}</h3>

        {tagline ? <p style={taglineStyle}>{tagline}</p> : null}

        <p style={locStyle}>
          <span aria-hidden>📍</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {baseLabel}
          </span>
        </p>

        {rubrosText ? <p style={rubrosStyle}>{rubrosText}</p> : null}

        <div style={ctaRowStyle}>
          {whatsappHref ? (
            <TrackedCardLink
              slug={p.slug}
              href={whatsappHref}
              type="whatsapp"
              style={btnWa}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp: ${p.nombre || "emprendimiento"}`}
            >
              WhatsApp
            </TrackedCardLink>
          ) : null}
          <TrackedCardLink
            slug={p.slug}
            href={fichaHref}
            type="view_ficha"
            analyticsSource={analyticsSource}
            style={{
              ...btnProfile,
              flex: whatsappHref ? 1 : undefined,
              width: whatsappHref ? undefined : "100%",
            }}
            aria-label={`Ver perfil: ${p.nombre || "emprendimiento"}`}
          >
            Ver perfil
          </TrackedCardLink>
        </div>
      </div>
    </article>
  );
}
