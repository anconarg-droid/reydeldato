"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ComunaAutocomplete from "./ComunaAutocomplete"; // ajusta si tu ruta es distinta

type SuggestItem = { slug: string; nombre: string; region?: string };

function clean(s: string) {
  return (s ?? "")s(...).replace(/\s+/g, " ");
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Detecta comuna si está al final del texto:
 * "gasfiter talagante" -> comuna=talagante, serviceQuery="gasfiter"
 */
async function detectComunaFromQuery(qRaw: string): Promise<{
  serviceQuery: string;
  comunaSlug?: string;
  comunaLabel?: string;
}> {
  const q = clean(qRaw);
  if (!q || q.length < 2) return { serviceQuery: q };

  const words = q.split(" ");
  const maxTailWords = Math.min(4, words.length);

  for (let k = maxTailWords; k >= 1; k--) {
    const tail = words.slice(words.length - k).join(" ");
    if (tail.length < 2) continue;

    const res = await fetch(`/api/suggest/comunas?q=${encodeURIComponent(tail)}`);
    const data = await res.json();

    const items: SuggestItem[] = data?.items ?? [];
    if (!items.length) continue;

    const best = items[0];

    const tailN = stripAccents(tail.toLowerCase());
    const nombreN = stripAccents((best.nombre ?? "").toLowerCase());
    const slugN = stripAccents((best.slug ?? "").toLowerCase()).replace(/-/g, " ");

    const looksMatch =
      nombreN.includes(tailN) ||
      tailN.includes(nombreN) ||
      slugN.includes(tailN) ||
      tailN.includes(slugN);

    if (!looksMatch) continue;

    const service = clean(words.slice(0, words.length - k).join(" "));

    return {
      serviceQuery: service,
      comunaSlug: best.slug,
      comunaLabel: best.nombre,
    };
  }

  return { serviceQuery: q };
}

export default function HomeSearch() {
  const router = useRouter();

  // Texto libre (izquierda)
  const [qRaw, setQRaw] = useState("");

  // Comuna elegida manualmente (derecha)
  const [comunaSlug, setComunaSlug] = useState<string>("");

  const [loading, setLoading] = useState(false);

  async function runSearch() {
    const raw = qRaw.trim();

    // Si no hay texto y no hay comuna, no hacemos nada.
    if (!raw && !comunaSlug) return;

    setLoading(true);
    try {
      let finalQ = raw;
      let finalComuna = comunaSlug || "";

      // Si no eligió comuna manual, intentamos detectarla dentro del texto
      if (!finalComuna && raw) {
        const detected = await detectComunaFromQuery(raw);
        if (detected.comunaSlug) {
          finalComuna = detected.comunaSlug;
          finalQ = detected.serviceQuery || "";
        }
      }

      // Construimos URL a /buscar (página de resultados)
      const params = new URLSearchParams();
      if (finalQ) params.set("q", finalQ);
      if (finalComuna) params.set("comuna", finalComuna);

      router.push(`/buscar?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
          ¿Qué buscas?
        </label>
        <input
          value={qRaw}
          onChange={(e) => setQRaw(e.target.value)}
          placeholder="gasfiter, veterinaria, pastelería… (o: gasfiter talagante)"
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
      </div>

      <div style={{ width: 360 }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
          ¿En qué comuna?
        </label>

        {/* Este componente debe llamar a setComunaSlug(slug) cuando seleccionas una */}
        <ComunaAutocomplete
          valueSlug={comunaSlug}
          onPick={(slug) => setComunaSlug(slug)}
          placeholder="Escribe una comuna (ej: Padre Hurtado)"
        />
      </div>

      <div style={{ paddingTop: 18 }}>
        <button
          onClick={runSearch}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
    </div>
  );
}