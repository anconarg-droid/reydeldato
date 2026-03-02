"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ComunaAutocomplete from "./components/ComunaAutocomplete";

export default function HomePage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [comunaSlug, setComunaSlug] = useState(""); // base: comuna slug

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const url =
      `/buscar?q=${encodeURIComponent(q)}` +
      `&comuna=${encodeURIComponent(comunaSlug)}`;

    router.push(url);
  }

  return (
    <main style={{ padding: 50, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 48, marginBottom: 10 }}>Rey del Dato</h1>

      <p style={{ opacity: 0.7, marginBottom: 18 }}>
        Busca servicios, productos y datos locales
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 320px 120px", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Qué buscas
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: gasfiter, veterinaria, psicólogo…"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid #d0d0d0",
              outline: "none",
            }}
          />
        </div>

        <ComunaAutocomplete valueSlug={comunaSlug} onChangeSlug={setComunaSlug} />

        <div style={{ display: "flex", alignItems: "end" }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Buscar
          </button>
        </div>
      </form>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        Tip: si eliges comuna, el sistema prioriza locales primero. Región/país se muestran solo como contexto.
      </div>

      <div style={{ marginTop: 14 }}>
        <a href="/buscar?debug=1" style={{ fontSize: 13 }}>
          Ir a buscador de pruebas (debug)
        </a>
      </div>
    </main>
  );
}