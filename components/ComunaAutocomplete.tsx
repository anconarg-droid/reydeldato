"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getRegionShort } from "@/utils/regionShort";

type ComunaOption = {
  slug: string;
  nombre: string;
  region_nombre?: string | null;
};

function norm(s?: string | null) {
  return (s ?? "").toString().trim().toLowerCase();
}

type Props = {
  name: string;
  defaultValue?: string; // slug que viene desde la URL
  options: ComunaOption[];
  placeholder?: string;
  label?: string;
  /** Notifica cuando cambia el slug elegido (vacío si no hay match). */
  onSelectedSlugChange?: (slug: string) => void;
};

export default function ComunaAutocomplete({
  name,
  defaultValue = "",
  options,
  placeholder = "Escribe tu comuna (ej: Maipú, Calera de Tango)",
  label = "Comuna",
  onSelectedSlugChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const onSlugCb = useRef(onSelectedSlugChange);
  onSlugCb.current = onSelectedSlugChange;

  const selectedFromSlug = useMemo(() => {
    return options.find((o) => norm(o.slug) === norm(defaultValue)) || null;
  }, [defaultValue, options]);

  const [inputValue, setInputValue] = useState(selectedFromSlug?.nombre || "");
  const [selectedSlug, setSelectedSlug] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const match = options.find((o) => norm(o.slug) === norm(defaultValue)) || null;
    setInputValue(match?.nombre || defaultValue || "");
    setSelectedSlug(defaultValue || "");
  }, [defaultValue, options]);

  useEffect(() => {
    onSlugCb.current?.(selectedSlug);
  }, [selectedSlug]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(inputValue);

    if (q.length < 2) return [];

    return options
      .filter(
        (item) =>
          norm(item.slug).includes(q) ||
          norm(item.nombre).includes(q) ||
          norm(item.region_nombre).includes(q)
      )
      .slice(0, 8);
  }, [inputValue, options]);

  const showResults = open && norm(inputValue).length >= 2 && filtered.length > 0;
  const showNoResults = open && norm(inputValue).length >= 2 && filtered.length === 0;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <label
        htmlFor={`${name}-visible`}
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 900,
          marginBottom: 6,
          color: "#111827",
        }}
      >
        {label}
      </label>

      <input
        id={`${name}-visible`}
        type="text"
        value={inputValue}
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => {
          if (norm(inputValue).length >= 2) setOpen(true);
        }}
       onChange={(e) => {
  const next = e.target.value;
  setInputValue(next);

  const match = options.find(
    (o) => norm(o.nombre) === norm(next) || norm(o.slug) === norm(next)
  );

  if (match) {
    setSelectedSlug(match.slug);
  } else {
    setSelectedSlug("");
  }

  setOpen(norm(next).length >= 2);
}}
        style={{
          width: "100%",
          height: 52,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          padding: "0 16px",
          fontSize: 15,
          background: "#fff",
          color: "#111827",
          outline: "none",
        }}
      />

      <input type="hidden" name={name} value={selectedSlug} />

      {showResults ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 14,
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            overflow: "hidden",
            zIndex: 80,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "10px 14px 6px",
              fontSize: 11,
              fontWeight: 900,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "#f8fafc",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            Sugerencias
          </div>

          {filtered.map((item) => (
            <button
              key={item.slug}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const short = getRegionShort(item.region_nombre);
                setInputValue(short ? `${item.nombre} — ${short}` : item.nombre);
                setSelectedSlug(item.slug);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                border: "none",
                background: "#fff",
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                {getRegionShort(item.region_nombre)
                  ? `${item.nombre} — ${getRegionShort(item.region_nombre)}`
                  : item.nombre}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {showNoResults ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 14,
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            padding: "14px",
            zIndex: 80,
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          No encontramos comunas con ese texto.
        </div>
      ) : null}
    </div>
  );
}