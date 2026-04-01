"use client";

import { useState } from "react";
import HoverCard from "@/components/HoverCard";
import Link from "next/link";

type Item = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  foto_principal_url?: string;
  logo_path?: string;
  comuna_base_slug?: string;
  categoria_slug?: string;
  whatsapp?: string;
  _matchLabel?: string;
  _bucket?:
    | "local"
    | "exacta"
    | "cobertura_comuna"
    | "regional"
    | "nacional"
    | "general";
  _band?: number;
  _shuffle?: number;
  _textScore?: number;
};

function pretty(s?: string) {
  return (s ?? "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function PreviewCard({ item }: { item: Item }) {
  const img = item.foto_principal_url || item.logo_path || "";

  return (
    <Link
      href={`/emprendedor/${item.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <article
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            height: 110,
            background: img ? `center/cover no-repeat url(${img})` : "#e5e7eb",
          }}
        />
        <div style={{ padding: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#2563eb",
              marginBottom: 6,
            }}
          >
            {pretty(item.categoria_slug)} • {pretty(item.comuna_base_slug)}
          </div>

          <div
            style={{
              fontSize: 17,
              lineHeight: 1.1,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 6,
            }}
          >
            {item.nombre}
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: "#4b5563",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {item.descripcion_corta || "Sin descripción"}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function SearchSectionClient({
  title,
  icon,
  items = [],
  defaultOpen = false,
  helperText,
}: {
  title: string;
  icon: string;
  items?: Item[];
  defaultOpen?: boolean;
  helperText?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  const previewItems = items.slice(0, 3);

  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
              fontSize: 24,
              color: "#111827",
            }}
          >
            <span>{icon}</span>
            <span>{title}</span>
          </span>

          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 999,
                padding: "6px 10px",
                background: "#f9fafb",
              }}
            >
              {items.length}
            </span>

            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#6b7280",
                minWidth: 24,
              }}
            >
              {open ? "−" : "+"}
            </span>
          </span>
        </button>

        <div style={{ padding: "0 20px 20px" }}>
          {helperText ? (
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#6b7280",
              }}
            >
              {helperText}
            </p>
          ) : null}

          {!open ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                {previewItems.map((item) => (
                  <PreviewCard key={item.id} item={item} />
                ))}
              </div>

              {items.length > 3 ? (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#6b7280",
                  }}
                >
                  + {items.length - 3} resultado{items.length - 3 === 1 ? "" : "s"} más
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                gap: 20,
              }}
            >
              {items.map((item) => (
                <HoverCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}