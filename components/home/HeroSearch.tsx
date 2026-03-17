"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [comuna, setComuna] = useState("");

  function handleSearch() {
    const params = new URLSearchParams();

    if (query) params.append("q", query);
    if (comuna) params.append("comuna", comuna);

    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <section
      style={{
        padding: "60px 20px",
        textAlign: "center",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          fontWeight: 900,
          marginBottom: 16,
          color: "#111827",
        }}
      >
        Encuentra servicios y datos cerca de ti
      </h1>

      <p
        style={{
          fontSize: 18,
          color: "#4b5563",
          marginBottom: 28,
        }}
      >
        Busca emprendedores, servicios o productos en tu comuna
      </p>

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          display: "grid",
          gap: 12,
        }}
      >
        <input
          placeholder="¿Qué necesitas?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            height: 56,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <input
          placeholder="Comuna (opcional)"
          value={comuna}
          onChange={(e) => setComuna(e.target.value)}
          style={{
            height: 56,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <button
          onClick={handleSearch}
          style={{
            height: 56,
            borderRadius: 14,
            border: "none",
            background: "#111827",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </div>
    </section>
  );
}