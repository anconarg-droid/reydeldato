"use client";

import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
import TrackedCardLink, {
  sendTrackedCardEvent,
  type CardViewListingSource,
} from "@/components/search/TrackedCardLink";

export type BusinessCardProps = {
  name: string;
  slug: string;
  analyticsSource?: CardViewListingSource;
  imageUrl?: string | null;
  shortDescription?: string | null;
  subcategoriasNombres?: string[] | null;
  categoria?: string | null;
  locationLabel?: string | null;
  coverageBadge?: string | null;
  variant: "basic" | "complete";
  fichaHref?: string | null;
  whatsappHref?: string | null;
  showSecondaryFichaCta?: boolean;
  /** Reservado: la variante Claude usa label fijo "Ver perfil". */
  secondaryFichaLabel?: string | null;
  signalText?: string | null;
  modalRubro?: string | null;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// ─── Card shell ───────────────────────────────────────────────────────────────

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column",
  minHeight: "100%",
  position: "relative",
  transition: "box-shadow 0.15s ease",
};

// Completa — borde verde prominente + sombra verde sutil
const cardStyleComplete: CSSProperties = {
  border: "2px solid #059669",
  boxShadow: "0 4px 16px rgba(5, 150, 105, 0.12)",
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  borderRadius: 16,
};

// ─── Media block ──────────────────────────────────────────────────────────────

// Básica: placeholder gris neutro
const mediaStyle: CSSProperties = {
  position: "relative",
  height: 168,
  background: "#f1f5f9",
  flexShrink: 0,
};

// Completa: placeholder verde muy suave — señal visual clara sin foto
const mediaStyleComplete: CSSProperties = {
  background: "#f0fdf4",
};

const imgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

// ─── Coverage badge ───────────────────────────────────────────────────────────

const baseBadge: CSSProperties = {
  position: "absolute",
  left: 10,
  top: 10,
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  maxWidth: "78%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  zIndex: 2,
};

function coverageBadgeStyle(label: string): CSSProperties {
  const v = s(label).toLowerCase();
  if (v.includes("de tu comuna")) {
    return { ...baseBadge, background: "#059669", color: "#fff" };
  }
  if (v.includes("en tu comuna") || v.includes("atiende tu comuna")) {
    return { ...baseBadge, background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" };
  }
  if (v.includes("regional") || v.includes("nacional")) {
    return { ...baseBadge, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
  }
  return { ...baseBadge, background: "rgba(15, 23, 42, 0.75)", color: "#fff" };
}

// ─── "Ficha completa" badge — body, bajo el nombre ───────────────────────────

const completeBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  color: "#059669",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: 999,
  padding: "3px 9px",
  width: "fit-content",
  letterSpacing: "0.02em",
};

// ─── Body ─────────────────────────────────────────────────────────────────────

const bodyStyle: CSSProperties = {
  padding: "14px 14px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flex: 1,
  position: "relative",
  zIndex: 2,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 17,
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#0f172a",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const descStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const locationStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 13,
  fontWeight: 600,
  color: "#1e293b",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  padding: "5px 10px",
  borderRadius: 8,
  width: "fit-content",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// ─── CTAs ─────────────────────────────────────────────────────────────────────

const ctaRowStyle: CSSProperties = {
  marginTop: "auto",
  display: "flex",
  gap: 8,
  paddingTop: 8,
  position: "relative",
  zIndex: 3,
};

const primaryCtaStyle: CSSProperties = {
  textDecoration: "none",
  background: "#059669",
  color: "#fff",
  borderRadius: 12,
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "0.01em",
  flex: 1,
};

const secondaryCtaStyle: CSSProperties = {
  textDecoration: "none",
  background: "#f8fafc",
  color: "#334155",
  borderRadius: 12,
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  fontSize: 13,
  border: "1px solid #e2e8f0",
  flex: 1,
};

const basicOverlayButtonStyle: CSSProperties = {
  ...overlayStyle,
  border: "none",
  padding: 0,
  margin: 0,
  background: "transparent",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessCard(props: BusinessCardProps) {
  const listingSource = props.analyticsSource ?? "search";
  const [basicModalOpen, setBasicModalOpen] = useState(false);

  const name = s(props.name) || "Emprendimiento";
  const slug = s(props.slug);
  const imageUrl = s(props.imageUrl);
  const shortDescription = s(props.shortDescription);
  const subcategoria = Array.isArray(props.subcategoriasNombres)
    ? s(props.subcategoriasNombres[0])
    : "";
  const categoria = s(props.categoria);
  const fallbackInfo = s(props.signalText);
  const locationLabel = s(props.locationLabel);
  const coverageBadge = s(props.coverageBadge);
  const fichaHref = s(props.fichaHref);
  const whatsappHref = s(props.whatsappHref);
  const isComplete = props.variant === "complete";

  const summaryText = shortDescription || subcategoria || categoria || fallbackInfo;
  const modalRubroLine = s(props.modalRubro) || subcategoria || categoria || fallbackInfo;
  const showWhatsappPrimary = !!whatsappHref;
  const showSecondaryFicha = !!fichaHref && (props.showSecondaryFichaCta ?? true);
  const showCtas = showWhatsappPrimary || showSecondaryFicha;

  const openBasicFichaModal = useCallback(() => {
    sendTrackedCardEvent(slug, "view_ficha", { source: listingSource });
    setBasicModalOpen(true);
  }, [slug, listingSource]);

  return (
    <>
      <article
        style={{
          ...cardStyle,
          ...(isComplete ? cardStyleComplete : null),
        }}
        aria-label={name}
      >
        {/* Overlay de navegación — sin cambios en lógica */}
        {fichaHref && isComplete ? (
          <TrackedCardLink
            slug={slug}
            href={fichaHref}
            type="view_ficha"
            analyticsSource={listingSource}
            style={overlayStyle}
            aria-label={`Ver ficha de ${name}`}
          >
            {/* overlay link */}
          </TrackedCardLink>
        ) : fichaHref && !isComplete ? (
          <button
            type="button"
            style={basicOverlayButtonStyle}
            aria-label={`Más sobre ${name}`}
            onClick={openBasicFichaModal}
          />
        ) : null}

        {/* Imagen — fondo diferenciado: gris (básica) vs verde suave (completa) */}
        <div style={{ ...mediaStyle, ...(isComplete ? mediaStyleComplete : null) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || "/placeholder-emprendedor.jpg"}
            alt={name}
            style={imgStyle}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/placeholder-emprendedor.jpg";
            }}
          />
          {coverageBadge ? (
            <div style={coverageBadgeStyle(coverageBadge)}>{coverageBadge}</div>
          ) : null}
        </div>

        {/* Body: nombre → badge completa → descripción → ubicación → CTAs */}
        <div style={bodyStyle}>
          {/* 1. Nombre */}
          <h3 style={titleStyle} title={name}>
            {name}
          </h3>

          {/* 2. Badge "Ficha completa" — solo en variante complete, bajo el nombre */}
          {isComplete ? (
            <div style={completeBadgeStyle}>
              <span style={{ fontSize: 10 }}>✓</span>
              Ficha completa
            </div>
          ) : null}

          {/* 3. Descripción — qué hace */}
          {summaryText ? (
            <p style={descStyle} title={summaryText}>
              {summaryText}
            </p>
          ) : null}

          {/* 4. Ubicación — dónde está */}
          {locationLabel ? (
            <div style={locationStyle} title={locationLabel}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>📍</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {locationLabel}
              </span>
            </div>
          ) : null}

          {/* 5. CTAs */}
          {showCtas ? (
            <div style={ctaRowStyle}>
              {showWhatsappPrimary ? (
                <TrackedCardLink
                  slug={slug}
                  href={whatsappHref}
                  type="whatsapp"
                  analyticsSource={listingSource}
                  target="_blank"
                  rel="noreferrer"
                  style={primaryCtaStyle}
                >
                  WhatsApp
                </TrackedCardLink>
              ) : null}

              {showSecondaryFicha ? (
                isComplete ? (
                  <TrackedCardLink
                    slug={slug}
                    href={fichaHref}
                    type="view_ficha"
                    analyticsSource={listingSource}
                    style={secondaryCtaStyle}
                  >
                    Ver perfil
                  </TrackedCardLink>
                ) : (
                  <button
                    type="button"
                    onClick={openBasicFichaModal}
                    style={{
                      ...secondaryCtaStyle,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Ver perfil
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {/* Modal ficha básica */}
      {basicModalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setBasicModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="basic-ficha-modal-negocio"
            style={{
              maxWidth: 400,
              width: "100%",
              background: "#fff",
              borderRadius: 16,
              padding: "22px 22px 18px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Información disponible
            </p>
            <h2
              id="basic-ficha-modal-negocio"
              style={{
                margin: modalRubroLine ? "0 0 6px 0" : "0 0 16px 0",
                fontSize: 21,
                lineHeight: 1.2,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {name}
            </h2>
            {modalRubroLine ? (
              <p
                style={{
                  margin: "0 0 14px 0",
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                {modalRubroLine}
              </p>
            ) : null}
            <p
              style={{
                margin: "0 0 18px 0",
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.55,
              }}
            >
              Este negocio aún no ha completado su ficha. Puedes contactarlo directamente por WhatsApp.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {showWhatsappPrimary ? (
                <TrackedCardLink
                  slug={slug}
                  href={whatsappHref}
                  type="whatsapp"
                  analyticsSource={listingSource}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...primaryCtaStyle, borderRadius: 12 }}
                >
                  WhatsApp
                </TrackedCardLink>
              ) : null}
              <button
                type="button"
                onClick={() => setBasicModalOpen(false)}
                style={{
                  padding: "11px 16px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#475569",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
