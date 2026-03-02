"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ComunaOption = {
  nombre: string;
  slug: string;
  region_nombre?: string;
  display_name?: string;
};

export default function HomeSearch() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [comunaInput, setComunaInput] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [comunas, setComunas] = useState<ComunaOption[]>([]);
  const [loading, setLoading] = useState(false);

  const blurTimer = useRef<number | null>(null);

  const canSearch = useMemo(() => {
    return q.trim().length > 1 || comunaSlug.trim().length > 1;
  }, [q, comunaSlug]);

  async function fetchComunas(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setComunas([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/comunas?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setComunas(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setComunas([]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (comunaSlug.trim()) params.set("comuna", comunaSlug.trim());

    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 140px",
          gap: 10,
          overflow: "visible", // ✅ para que el dropdown no se corte
        }}
      >
        {/* Texto libre */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="¿Qué buscas? (gásfiter, carpas, veterinaria...)"
          style={{
            padding: "12px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.2)",
          }}
        />

        {/* Comuna */}
        <div style={{ position: "relative", overflow: "visible" }}>
          <input
            value={comunaInput}
            onChange={(e) => {
              const v = e.target.value;
              setComunaInput(v);
              setComunaSlug(""); // si escribe, invalida selección
              fetchComunas(v);
            }}
            onFocus={() => {
              // si ya hay texto y hay data, re-mostrar
              if (comunaInput.trim().length >= 2 && comunas.length === 0) {
                fetchComunas(comunaInput);
              }
            }}
            onBlur={() => {
              // ✅ delay para permitir click en opción sin que se cierre antes
              blurTimer.current = window.setTimeout(() => setComunas([]), 150);
            }}
            placeholder="¿En qué comuna? (opcional)"
            autoComplete="off"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          {/* Dropdown */}
          {comunas.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: 12,
                overflow: "hidden",
                zIndex: 9999, // ✅ por si hay overlays
                maxHeight: 260,
                overflowY: "auto",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              }}
              // ✅ evita que el blur del input cierre antes del click
              onMouseDown={(e) => e.preventDefault()}
            >
              {comunas.map((c) => {
                const label =
                  c.display_name ??
                  (c.region_nombre ? `${c.nombre}, ${c.region_nombre}` : c.nombre);

                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      if (blurTimer.current) window.clearTimeout(blurTimer.current);
                      setComunaSlug(c.slug);   // ✅ para filtrar en buscar
                      setComunaInput(label);   // ✅ para mostrar
                      setComunas([]);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background: "white",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.style.background = "rgba(0,0,0,0.04)");
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.style.background = "white");
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {loading && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Buscando comunas...
            </div>
          )}
        </div>

        <button
          disabled={!canSearch}
          style={{
            padding: "12px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.2)",
            fontWeight: 900,
            cursor: canSearch ? "pointer" : "not-allowed",
          }}
        >
          Buscar
        </button>
      </div>
    </form>
  );
}