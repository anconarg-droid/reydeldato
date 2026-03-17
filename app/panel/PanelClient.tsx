"use client";

import { useEffect, useState } from "react";

type PanelData = {
  ok: boolean;
  item?: {
    id: string;
    nombre: string;
    slug: string;
    estado?: string;
    plan?: string;
  };
  stats?: {
    vistas_ficha: number;
    click_whatsapp: number;
    click_instagram: number;
    click_web: number;
  };
  activity?: {
    tipo_evento: string;
    canal: string;
    created_at: string;
    metadata?: any;
  }[];
  message?: string;
};

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 18,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PanelClient({ id }: { id: string }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"7d" | "30d" | "total">("total");
  const [activity, setActivity] = useState<PanelData["activity"]>([]);

  useEffect(() => {
    async function load() {
      if (!id) {
        setError("Falta el id del emprendimiento");
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("id", id);
        params.set("range", range);

        const res = await fetch(`/api/panel?${params.toString()}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "No se pudo cargar el panel");
        }

        setData(json);
      } catch (e: any) {
        setError(e?.message || "Error inesperado");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, range]);

  useEffect(() => {
    async function loadActivity() {
      if (!id) return;

      try {
        const params = new URLSearchParams();
        params.set("id", id);

        const res = await fetch(`/api/panel/activity?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) return;
        setActivity(json.items || []);
      } catch {
        // silencioso, no bloquea el panel
      }
    }

    loadActivity();
  }, [id]);

  if (loading) {
    return <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>Cargando panel...</div>;
  }

  if (error || !data?.item) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error || "No se pudo cargar el panel"}
        </div>
      </div>
    );
  }

  const item = data.item;
  const stats = data.stats || {
    vistas_ficha: 0,
    click_whatsapp: 0,
    click_instagram: 0,
    click_web: 0,
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 20,
          background: "#fff",
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32 }}>{item.nombre}</h1>

        <div style={{ marginTop: 8, color: "#6b7280" }}>
          Estado: {s(item.estado) || "aprobado"} • Plan: {s(item.plan) || "basico"}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <a
            href={`/emprendedor/${item.slug}`}
            target="_blank"
            rel="noreferrer"
            style={buttonLight}
          >
            Ver mi ficha pública
          </a>

          <a
            href={`/emprendedor/${item.slug}`}
            target="_blank"
            rel="noreferrer"
            style={buttonDark}
          >
            Compartir mi ficha
          </a>

          <a
            href={`/panel/negocios/nuevo?id=${encodeURIComponent(item.id)}`}
            style={buttonLight}
          >
            Editar mi ficha
          </a>
        </div>
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
          Rango:
        </span>
        {[
          { key: "7d", label: "Últimos 7 días" },
          { key: "30d", label: "Últimos 30 días" },
          { key: "total", label: "Total" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key as any)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border:
                range === opt.key ? "1px solid #111827" : "1px solid #e5e7eb",
              background: range === opt.key ? "#111827" : "#fff",
              color: range === opt.key ? "#fff" : "#111827",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
        {range !== "total" && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            (Los rangos detallados se activarán cuando existan eventos con fecha en Supabase)
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <StatCard title="Visitas a tu ficha" value={stats.vistas_ficha} />
        <StatCard title="Clicks en WhatsApp" value={stats.click_whatsapp} />
        <StatCard title="Clicks en Instagram" value={stats.click_instagram} />
        <StatCard title="Clicks en sitio web" value={stats.click_web} />
      </div>

      <section style={{ marginTop: 28 }}>
        <h2
          style={{
            margin: "0 0 10px 0",
            fontSize: 20,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Actividad reciente
        </h2>

        {activity && activity.length > 0 ? (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              background: "#fff",
              padding: 12,
            }}
          >
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {activity.map((evt, idx) => {
                const fecha = new Date(evt.created_at);
                const label =
                  evt.tipo_evento === "vista_ficha" || evt.tipo_evento === "page_view_profile"
                    ? "Vista de ficha"
                    : `Click (${evt.canal})`;

                return (
                  <li
                    key={`${evt.tipo_evento}-${evt.canal}-${evt.created_at}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 4px",
                      borderBottom:
                        idx === activity.length - 1
                          ? "none"
                          : "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#111827",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {fecha.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Aún no registramos actividad reciente para este emprendimiento.
          </p>
        )}
      </section>
    </div>
  );
}

const buttonLight: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const buttonDark: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
};