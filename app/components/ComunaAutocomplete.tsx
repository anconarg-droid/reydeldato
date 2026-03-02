"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ComunaHit = {
  id: string;
  nombre: string;
  slug: string;
  region?: { id: string; nombre: string; slug: string } | null;
  country?: { id: string; nombre: string; slug: string } | null;
};

type Props = {
  valueSlug: string; // comuna slug seleccionado (ej: "calera-de-tango")
  onChangeSlug: (slug: string) => void;
  placeholder?: string;
  allowAllOption?: boolean;
};

export default function ComunaAutocomplete({
  valueSlug,
  onChangeSlug,
  placeholder = "Escribe una comuna…",
  allowAllOption = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComunaHit[]>([]);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedLabel = useMemo(() => {
    // cuando ya hay una comuna seleccionada, mostramos el slug “bonito” si no hemos cargado data
    if (!valueSlug) return "";
    return valueSlug.replace(/-/g, " ");
  }, [valueSlug]);

  function formatLabel(c: ComunaHit) {
    const parts = [c.nombre, c.region?.nombre, c.country?.nombre].filter(Boolean);
    return parts.join(" · ");
  }

  async function fetchComunas(q: string) {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/comunas?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as ComunaHit[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // ignore abort errors
    } finally {
      setLoading(false);
    }
  }

  // debounce simple
  useEffect(() => {
    const t = setTimeout(() => {
      fetchComunas(query);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // cerrar al click afuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(slug: string) {
    onChangeSlug(slug);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
        Comuna
      </label>

      <input
        value={open ? query : valueSlug ? selectedLabel : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 10,
          border: "1px solid #d0d0d0",
          outline: "none",
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {allowAllOption && (
            <button
              type="button"
              onClick={() => pick("")}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "white",
                cursor: "pointer",
                borderBottom: "1px solid #f1f1f1",
              }}
            >
              Todas las comunas
            </button>
          )}

          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {loading && (
              <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>Buscando…</div>
            )}

            {!loading && items.length === 0 && query.trim().length >= 2 && (
              <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>
                Sin resultados
              </div>
            )}

            {!loading &&
              items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.slug)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: "white",
                    cursor: "pointer",
                    borderTop: "1px solid #f6f6f6",
                  }}
                >
                  <div style={{ fontWeight: 650 }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {c.region?.nombre} · {c.country?.nombre}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}