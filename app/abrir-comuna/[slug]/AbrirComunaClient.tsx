"use client";

import { useCallback, useMemo, useState } from "react";

type CategoriaEstado = {
  categoria_id?: string | null;
  categoria_nombre: string;
  categoria_slug?: string | null;
  total_inscritos: number;
  categoria_cubierta: boolean;
};

type AbrirComunaData = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre?: string | null;
  avance_porcentaje: number;
  total_emprendedores: number;
  categorias_totales: number;
  categorias_cubiertas: number;
  categorias_faltantes: number;
  estado: string;
  categorias?: CategoriaEstado[];
};

function getEstadoVisual(estado?: string) {
  if (estado === "activa") {
    return {
      emoji: "🟢",
      label: "Activa",
      color: "#166534",
      bg: "#ecfdf5",
      border: "#86efac",
    };
  }

  if (estado === "lista_para_abrir") {
    return {
      emoji: "🟠",
      label: "Lista para abrir",
      color: "#9a3412",
      bg: "#fff7ed",
      border: "#fdba74",
    };
  }

  if (estado === "en_proceso" || estado === "con_movimiento") {
    return {
      emoji: "🟡",
      label: "En proceso",
      color: "#854d0e",
      bg: "#fefce8",
      border: "#fde047",
    };
  }

  return {
    emoji: "🔒",
    label: "Sin movimiento",
    color: "#4b5563",
    bg: "#f9fafb",
    border: "#d1d5db",
  };
}

export default function AbrirComunaClient({
  data,
}: {
  data: AbrirComunaData | null;
}) {

  if (!data) {
    return (
      <div style={{padding:40,fontFamily:"sans-serif"}}>
        <h2>Comuna no encontrada</h2>
        <p>No hay información disponible para esta comuna.</p>
      </div>
    );
  }
  const [copiado, setCopiado] = useState(false);

  const estadoVisual = useMemo(
  () => getEstadoVisual(data?.estado || "sin_movimiento"),
  [data?.estado]
);

  const shareText = useMemo(() => {
    return `Ayúdanos a activar ${data.comuna_nombre} en Rey del Dato. Revisa el avance y comparte esta página.`;
  }, [data.comuna_nombre]);

  const compartir = useCallback(async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Abrir ${data.comuna_nombre} en Rey del Dato`,
          text: shareText,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 1800);
    } catch (error) {
      console.error("Error compartiendo:", error);
    }
  }, [data.comuna_nombre, shareText]);

  const categorias = data.categorias || [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "36px 20px 60px",
        }}
      >
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${estadoVisual.border}`,
              background: estadoVisual.bg,
              color: estadoVisual.color,
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            <span>{estadoVisual.emoji}</span>
            <span>{estadoVisual.label}</span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#111827",
            }}
          >
            Abramos {data.comuna_nombre}
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#4b5563",
              fontSize: 17,
              lineHeight: 1.7,
              maxWidth: 760,
            }}
          >
            Rey del Dato todavía no está completamente activo en{" "}
            <strong>{data.comuna_nombre}</strong>
            {data.region_nombre ? `, ${data.region_nombre}` : ""}. Aquí puedes
            ver el avance real de la comuna y compartir esta página para moverla
            más rápido.
          </p>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 14,
            marginBottom: 26,
          }}
        >
          <div style={metricCardStyle}>
            <div style={metricNumberStyle}>{data.avance_porcentaje}%</div>
            <div style={metricLabelStyle}>Avance total</div>
          </div>

          <div style={metricCardStyle}>
            <div style={metricNumberStyle}>{data.categorias_cubiertas}</div>
            <div style={metricLabelStyle}>Categorías cubiertas</div>
          </div>

          <div style={metricCardStyle}>
            <div style={metricNumberStyle}>{data.categorias_faltantes}</div>
            <div style={metricLabelStyle}>Categorías faltantes</div>
          </div>

          <div style={metricCardStyle}>
            <div style={metricNumberStyle}>{data.total_emprendedores}</div>
            <div style={metricLabelStyle}>Emprendimientos</div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            background: "#fff",
            padding: 20,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Progreso de la comuna
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#6b7280",
                  fontSize: 15,
                }}
              >
                {data.categorias_cubiertas} de {data.categorias_totales}{" "}
                categorías ya tienen movimiento.
              </p>
            </div>

            <button
              onClick={compartir}
              type="button"
              style={{
                border: "none",
                background: "#22c55e",
                color: "#fff",
                borderRadius: 12,
                padding: "12px 18px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {copiado ? "Link copiado" : "Compartir esta comuna"}
            </button>
          </div>

          <div
            style={{
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, data.avance_porcentaje || 0))}%`,
                height: "100%",
                background: "#111827",
                borderRadius: 999,
              }}
            />
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#4b5563",
            }}
          >
            Avance actual: <strong>{data.avance_porcentaje}%</strong>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            background: "#fff",
            padding: 20,
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 28,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            Estado por categoría
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {categorias.map((item, index) => {
              const completa = item.categoria_cubierta;

              return (
                <div
                  key={`${item.categoria_slug || item.categoria_nombre}-${index}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 14,
                    background: completa ? "#f0fdf4" : "#fafafa",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#111827",
                        fontSize: 17,
                      }}
                    >
                      {item.categoria_nombre}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: "#6b7280",
                      }}
                    >
                      {item.total_inscritos} emprendimiento
                      {item.total_inscritos === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 120,
                      textAlign: "right",
                      fontWeight: 900,
                      color: completa ? "#166534" : "#92400e",
                    }}
                  >
                    {completa ? "✅ Cubierta" : "⏳ Falta mover"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

const metricCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
};

const metricNumberStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1,
};

const metricLabelStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#6b7280",
};