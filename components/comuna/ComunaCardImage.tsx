"use client";

import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Imagen de card con fallback si falla la carga (solo en cliente: onError).
 */
export default function ComunaCardImage({ src, alt, className, style }: Props) {
  const placeholderSrc = "/placeholder-emprendedor.jpg";
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onError={(ev) => {
          const target = ev.currentTarget;
          if (target.src.includes(placeholderSrc)) return;
          target.src = placeholderSrc;
        }}
      />
      <div
        style={{
          display: "none",
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          color: "#94a3b8",
          background: "#f1f5f9",
        }}
      >
        🏪
      </div>
    </div>
  );
}
