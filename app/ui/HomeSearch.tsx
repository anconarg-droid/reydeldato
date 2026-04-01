"use client";

import { useEffect, useMemo, useState } from "react";
import ComunaAutocomplete from "@/components/ComunaAutocomplete";

type CatalogComuna = {
  slug: string;
  nombre: string;
  region_nombre?: string | null;
  region_id?: string | null;
};

export default function HomeSearch() {
  const [q, setQ] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [catalogComunas, setCatalogComunas] = useState<CatalogComuna[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/publicar/catalogo");
        const data = await res.json();
        if (!cancelled && data?.ok && Array.isArray(data.comunas)) {
          setCatalogComunas(data.comunas);
        }
      } catch {
        if (!cancelled) setCatalogComunas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const comunaOptions = useMemo(
    () =>
      catalogComunas.map((c) => ({
        slug: c.slug,
        nombre: c.nombre,
        region_nombre: c.region_nombre ?? null,
      })),
    [catalogComunas]
  );

  const goBuscar = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    if (comunaSlug.trim()) params.set("comuna", comunaSlug.trim());

    const row = catalogComunas.find((c) => c.slug === comunaSlug);
    if (row?.region_id) params.set("regionId", String(row.region_id));

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
          name="comuna_ui_demo"
          options={comunaOptions}
          onSelectedSlugChange={setComunaSlug}
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
    </main>
  );
}
