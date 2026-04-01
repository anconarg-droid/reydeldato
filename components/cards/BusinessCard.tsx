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
  /** Origen del listado para `card_view_click` (ver ficha desde tarjeta). */
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
  secondaryFichaLabel?: string | null;
  signalText?: string | null;
  /** Subcategoría / rubro en el modal de ficha básica; si falta, se usa subcategoriasNombres[0], categoria o signalText. */
  modalRubro?: string | null;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
  display: "flex",
  flexDirection: "column",
  minHeight: "100%",
  position: "relative",
};

const cardStyleHighlight: CSSProperties = {
  border: "2px solid #22c55e",
  boxShadow: "0 12px 28px rgba(34, 197, 94, 0.15)",
  transform: "scale(1.02)",
  zIndex: 2,
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  borderRadius: 18,
};

const mediaStyle: CSSProperties = {
  position: "relative",
  height: 170,
  background: "#f3f4f6",
};

const imgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  top: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(15, 23, 42, 0.85)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 900,
  maxWidth: "75%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function coverageBadgeStyle(label: string): CSSProperties {
  const v = s(label).toLowerCase();
  if (v.includes("en tu comuna")) {
    return {
      ...badgeStyle,
      background: "#ecfdf5",
      color: "#065f46",
      border: "1px solid #a7f3d0",
    };
  }
  if (v.includes("de tu comuna")) {
    return {
      ...badgeStyle,
      background: "#ecfdf5",
      color: "#065f46",
      border: "1px solid #a7f3d0",
    };
  }
  if (v.includes("atiende tu comuna")) {
    return {
      ...badgeStyle,
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }
  if (v.includes("regional")) {
    return {
      ...badgeStyle,
      background: "#faf5ff",
      color: "#6b21a8",
      border: "1px solid #e9d5ff",
    };
  }
  return {
    ...badgeStyle,
    background: "rgba(15, 23, 42, 0.85)",
    color: "#fff",
    border: "1px solid rgba(15,23,42,.3)",
  };
}

const profileBadgeStyle: CSSProperties = {
  position: "absolute",
  right: 12,
  top: 12,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  maxWidth: "70%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const profileBadgeBasicStyle: CSSProperties = {
  ...profileBadgeStyle,
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #cbd5e1",
};

const profileBadgeCompleteStyle: CSSProperties = {
  ...profileBadgeStyle,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const bodyStyle: CSSProperties = {
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  flex: 1,
  position: "relative",
  zIndex: 2,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.15,
  fontWeight: 950,
  color: "#0f172a",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const descStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const locationStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  padding: "7px 12px",
  borderRadius: 10,
  width: "fit-content",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  letterSpacing: ".01em",
};

const ctaRowStyle: CSSProperties = {
  marginTop: "auto",
  display: "flex",
  gap: 10,
  paddingTop: 6,
  position: "relative",
  zIndex: 3,
};

const primaryCtaStyle: CSSProperties = {
  textDecoration: "none",
  background: "#22c55e",
  color: "#fff",
  borderRadius: 14,
  minHeight: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  fontSize: 15,
  letterSpacing: ".01em",
  boxShadow: "none",
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

const secondaryCtaStyle: CSSProperties = {
  textDecoration: "none",
  background: "#f1f5f9",
  color: "#0f172a",
  borderRadius: 14,
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 13,
  border: "1px solid #dbe2ea",
  flex: 1,
};

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
  const secondaryLabel =
    s(props.secondaryFichaLabel) ||
    (isComplete ? "Ver más detalles" : "Ver ficha");
  const summaryText = shortDescription || subcategoria || categoria || fallbackInfo;
  const modalRubroLine =
    s(props.modalRubro) || subcategoria || categoria || fallbackInfo;
  const showWhatsappPrimary = !!whatsappHref;
  const showSecondaryFicha = !!fichaHref && (props.showSecondaryFichaCta ?? true);

  const openBasicFichaModal = useCallback(() => {
    sendTrackedCardEvent(slug, "view_ficha", { source: listingSource });
    setBasicModalOpen(true);
  }, [slug, listingSource]);

  return (
    <>
    <article
      style={{
        ...cardStyle,
        ...(isComplete ? cardStyleHighlight : null),
      }}
      aria-label={name}
    >
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

      <div style={mediaStyle}>
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
        {coverageBadge ? <div style={coverageBadgeStyle(coverageBadge)}>{coverageBadge}</div> : null}
        <div style={isComplete ? profileBadgeCompleteStyle : profileBadgeBasicStyle}>
          {isComplete ? "Ficha completa" : "Ficha básica"}
        </div>
      </div>

      <div style={bodyStyle}>
        <h3 style={titleStyle} title={name}>
          {name}
        </h3>

        {locationLabel ? (
          <div style={locationStyle} title={locationLabel}>
            {locationLabel}
          </div>
        ) : null}

        {summaryText ? (
          <p style={descStyle} title={summaryText}>
            {summaryText}
          </p>
        ) : null}

        {isComplete ? (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#166534" }}>
            Incluye fotos y detalles
          </p>
        ) : null}

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
                {secondaryLabel}
              </TrackedCardLink>
            ) : (
              <button
                type="button"
                onClick={openBasicFichaModal}
                style={{
                  ...secondaryCtaStyle,
                  border: secondaryCtaStyle.border,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {secondaryLabel}
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>

      {basicModalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.45)",
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
              boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Ficha básica
            </p>
            <h2
              id="basic-ficha-modal-negocio"
              style={{
                margin: modalRubroLine ? "0 0 6px 0" : "0 0 16px 0",
                fontSize: 22,
                lineHeight: 1.2,
                fontWeight: 950,
                color: "#0f172a",
              }}
            >
              {name}
            </h2>
            {modalRubroLine ? (
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                {modalRubroLine}
              </p>
            ) : null}
            <p style={{ margin: "0 0 18px 0", fontSize: 15, color: "#475569", lineHeight: 1.55 }}>
              Este emprendimiento no tiene más información disponible.
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
                  style={{ ...primaryCtaStyle, width: "100%" }}
                >
                  WhatsApp
                </TrackedCardLink>
              ) : null}
              <button
                type="button"
                onClick={() => setBasicModalOpen(false)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#334155",
                  cursor: "pointer",
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

