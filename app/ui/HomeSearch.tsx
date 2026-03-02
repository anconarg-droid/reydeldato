"use client";

import { useState } from "react";
import ComunaAutocomplete from "@/components/ComunaAutocomplete";

type Picked = {
  id: string;
  nombre: string;
  slug: string;
  region: null | { id: string; nombre: string; slug: string };
  country: null | { id: string; nombre: string; slug: string };
};

export default function HomeSearch() {
  const [q, setQ] = useState("");
  const [comunaText, setComunaText] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);

  const goBuscar = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    // ✅ la búsqueda real se hace por slug (estable)
    if (picked?.slug) params.set("comuna", picked.slug);

    // ✅ si quieres mandar regionId también (útil para tu /api/buscar)
    if (picked?.region?.id) params.set("regionId", picked.region.id);

    window.location.href = `/buscar?${params.toString()}`;
  };

  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>Rey del Dato</h1>
      <p style={{ opacity: 0.7, marginBottom: 18 }}>
        Busca servicios, productos y datos locales
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "start" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="¿Qué buscas? (ej: gasfiter, veterinaria...)"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />

        <ComunaAutocomplete
          value={comunaText}
          onSelect={(sel, typed) => {
            setPicked(sel as any);
            setComunaText(typed);
          }}
          placeholder="Comuna (ej: San..., Calera..., Maipú...)"
        />

        <button
          onClick={goBuscar}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor: "pointer",
            height: 42,
          }}
        >
          Buscar
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Tip: si eliges comuna, el sistema prioriza locales; luego expande a región/nacional según tu lógica.
      </div>

      <div style={{ marginTop: 18 }}>
        <a href="/buscar?debug=1" style={{ opacity: 0.7 }}>
          Ir a buscador de pruebas (debug)
        </a>
      </div>
    </main>
  );
}