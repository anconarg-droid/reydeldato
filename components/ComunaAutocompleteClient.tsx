"use client";

import { useMemo, useState } from "react";
import { getRegionShort } from "@/utils/regionShort";

type ComunaOption = {
  slug: string;
  nombre: string;
  region_nombre?: string | null;
};

function norm(text: string) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function ComunaAutocompleteClient({
  options,
}: {
  options: ComunaOption[];
}) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options.slice(0, 8);

    return options
      .filter((item) => {
        const label = `${item.nombre} ${item.region_nombre || ""}`;
        return norm(label).includes(q);
      })
      .slice(0, 8);
  }, [query, options]);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedSlug("");
        }}
        placeholder="Escribe tu comuna"
        autoComplete="off"
        style={{
          width: "100%",
          height: 52,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          padding: "0 16px",
          fontSize: 16,
          outline: "none",
        }}
      />

      <input type="hidden" name="comuna" value={selectedSlug} />

      {query.trim() !== "" && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 30,
          }}
        >
          {filtered.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => {
                const short = getRegionShort(item.region_nombre);
                setQuery(short ? `${item.nombre} — ${short}` : item.nombre);
                setSelectedSlug(item.slug);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <span style={{ fontWeight: 800, color: "#111827", fontSize: 15 }}>
                {getRegionShort(item.region_nombre)
                  ? `${item.nombre} — ${getRegionShort(item.region_nombre)}`
                  : item.nombre}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}