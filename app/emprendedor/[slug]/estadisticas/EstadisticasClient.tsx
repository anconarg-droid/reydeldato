"use client";

import { useEffect, useState } from "react";

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

type StatsApi = {
  ok: boolean;
  item?: {
    id?: string;
    slug?: string;
    nombre?: string;
  };
  historico?: Record<string, number>;
  ultimos7?: Record<string, number>;
  ultimos30?: Record<string, number>;
  error?: string;
};

const etiquetas: Record<string, string> = {
  impresiones_resultados: "Veces en resultados de búsqueda",
  clics_tarjeta: "Clics en tarjeta (desde resultados)",
  view_ficha: "Vistas de ficha",
  click_whatsapp: "Clics en WhatsApp",
  click_instagram: "Clics en Instagram",
  click_web: "Clics en sitio web",
  click_email: "Clics en email",
};

const keys = [
  "impresiones_resultados",
  "clics_tarjeta",
  "view_ficha",
  "click_whatsapp",
  "click_instagram",
  "click_web",
  "click_email",
];

export default function EstadisticasClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<StatsApi | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/emprendedor/${slug}/estadisticas`, {
          cache: "no-store",
        });

        const json: StatsApi = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "No se pudieron cargar estadísticas");
        }

        setData(json);
      } catch (e: any) {
        setError(e?.message || "Error inesperado");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div style={wrap}>
        <div style={container}>Cargando estadísticas...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={wrap}>
        <div style={container}>
          <div style={errorBox}>{error || "No disponible"}</div>
        </div>
      </div>
    );
  }

  const nombre = s(data.item?.nombre) || "Emprendimiento";

  return (
    <div style={wrap}>
      <div style={container}>
        <h1 style={title}>Estadísticas</h1>
        <p style={subtitle}>{nombre}</p>

        <div style={grid3}>
          <StatsCard titulo="Histórico" valores={data.historico || {}} />
          <StatsCard titulo="Últimos 7 días" valores={data.ultimos7 || {}} />
          <StatsCard titulo="Últimos 30 días" valores={data.ultimos30 || {}} />
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  titulo,
  valores,
}: {
  titulo: string;
  valores: Record<string, number>;
}) {
  return (
    <section style={card}>
      <h2 style={cardTitle}>{titulo}</h2>

      <div style={{ marginTop: 14 }}>
        {keys.map((k) => (
          <div key={k} style={row}>
            <span style={label}>{etiquetas[k]}</span>
            <strong style={value}>{Number(valores[k] || 0)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

const wrap: React.CSSProperties = {
  background: "#f9fafb",
  minHeight: "100vh",
};

const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: 24,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 42,
  fontWeight: 900,
  color: "#111827",
};

const subtitle: React.CSSProperties = {
  marginTop: 8,
  color: "#6b7280",
  fontSize: 18,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  marginTop: 24,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 20,
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 900,
  color: "#111827",
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid #f3f4f6",
};

const label: React.CSSProperties = {
  color: "#374151",
  fontSize: 15,
};

const value: React.CSSProperties = {
  color: "#111827",
  fontSize: 18,
};

const errorBox: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
};