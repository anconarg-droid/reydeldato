"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ComunaItem = {
  id?: string;
  slug: string;
  nombre: string;
  region_nombre?: string;
  display_name?: string;
};

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [comunaInput, setComunaInput] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");

  const [open, setOpen] = useState(false);
  const [loadingComunas, setLoadingComunas] = useState(false);
  const [comunas, setComunas] = useState<ComunaItem[]>([]);

  const boxRef = useRef<HTMLDivElement | null>(null);

  async function buscarComunas(texto: string) {
    const term = s(texto);

    if (term.length < 2) {
      setComunas([]);
      return;
    }

    try {
      setLoadingComunas(true);

      const res = await fetch(
        `/api/suggest/comunas?q=${encodeURIComponent(term)}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      setComunas(
        items.map((x: any) => ({
          id: s(x.id),
          slug: s(x.slug),
          nombre: s(x.nombre),
          region_nombre: s(x.region_nombre),
          display_name:
            s(x.display_name) ||
            [s(x.nombre), s(x.region_nombre)].filter(Boolean).join(", "),
        }))
      );
    } catch {
      setComunas([]);
    } finally {
      setLoadingComunas(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      buscarComunas(comunaInput);
    }, 180);

    return () => clearTimeout(t);
  }, [comunaInput]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const placeholderComuna = useMemo(
    () => "Comuna (opcional)",
    []
  );

  function selectComuna(item: ComunaItem) {
    setComunaInput(item.display_name || item.nombre);
    setComunaSlug(item.slug);
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();

    if (s(q)) params.set("q", s(q));
    if (s(comunaSlug)) params.set("comuna", s(comunaSlug));

    const url = params.toString() ? `/buscar?${params.toString()}` : "/buscar";
    window.location.href = url;
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr auto",
        gap: 12,
        alignItems: "start",
      }}
    >
      {/* TEXTO LIBRE */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="¿Qué necesitas? Ej: gasfiter, veterinaria, comida de gatos..."
        style={{
          width: "100%",
          height: 52,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          padding: "0 14px",
          fontSize: 15,
          outline: "none",
        }}
      />

      {/* COMUNA AUTOCOMPLETE */}
      <div ref={boxRef} style={{ position: "relative" }}>
        <input
          value={comunaInput}
          onChange={(e) => {
            setComunaInput(e.target.value);
            setComunaSlug("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholderComuna}
          autoComplete="off"
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "1px solid #d1d5db",
            padding: "0 14px",
            fontSize: 15,
            outline: "none",
          }}
        />

        {open && (s(comunaInput).length >= 2 || loadingComunas) ? (
          <div
            style={{
              position: "absolute",
              top: 58,
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              overflow: "hidden",
              zIndex: 30,
            }}
          >
            {loadingComunas ? (
              <div
                style={{
                  padding: 12,
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                Buscando comunas...
              </div>
            ) : comunas.length > 0 ? (
              comunas.map((item, i) => (
                <button
                  key={`${item.slug}-${i}`}
                  type="button"
                  onClick={() => selectComuna(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    border: "none",
                    background: "#fff",
                    cursor: "pointer",
                    borderTop: i === 0 ? "none" : "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    {item.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    {item.region_nombre || item.display_name}
                  </div>
                </button>
              ))
            ) : (
              <div
                style={{
                  padding: 12,
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                No encontramos comunas
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* BOTON */}
      <button
        type="submit"
        style={{
          height: 52,
          padding: "0 22px",
          borderRadius: 14,
          border: "none",
          background: "#111827",
          color: "#fff",
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Buscar
      </button>
    </form>
  );
}