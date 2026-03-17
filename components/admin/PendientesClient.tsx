"use client";

import { useMemo, useState } from "react";

type Pendiente = {
  id: string;
  slug: string;

  nombre?: string;
  descripcion_negocio?: string | null;
  descripcion_corta?: string;
  descripcion_larga?: string | null;

  responsable_nombre?: string | null;
  mostrar_responsable?: boolean | null;

  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;

  subcategorias_slugs?: string[] | null;

  nivel_cobertura?: string | null;
  coverage_labels?: string[] | null;

  estado?: string | null;
  estado_publicacion?: string | null;
  publicado?: boolean | null;

  created_at?: string | null;

  foto_principal_url?: string | null;

  categorias?: {
    id: string;
    nombre: string;
    slug: string;
  } | null;

  comunas?: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function formatCoverage(
  nivelCobertura?: string | null,
  coverageLabels?: string[] | null,
  comunaBase?: string | null
) {
  const t = s(nivelCobertura);

  if (t === "solo_mi_comuna") {
    return comunaBase ? `Solo atiende en ${comunaBase}` : "Solo atiende en su comuna";
  }

  if (t === "varias_comunas") {
    if (coverageLabels?.length) return coverageLabels.join(" · ");
    return "Varias comunas";
  }

  if (t === "varias_regiones") {
    if (coverageLabels?.length) return coverageLabels.join(" · ");
    return "Una o más regiones";
  }

  if (t === "nacional") return "Todo Chile";

  return t || "No informada";
}

function formatDateSafe(input?: string | null) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export default function PendientesClient({
  initialItems,
}: {
  initialItems: Pendiente[];
}) {
  const [items, setItems] = useState<Pendiente[]>(initialItems || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | "borrador" | "pendiente_aprobacion" | "publicado" | "rechazado"
  >("pendiente_aprobacion");
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    const term = s(search).toLowerCase();
    return items
      .filter((item) => {
        if (estadoFilter === "todos") return true;
        return (item.estado_publicacion || "").toLowerCase() === estadoFilter;
      })
      .filter((item) => {
        if (!term) return true;
        const nombre = s(item.nombre).toLowerCase();
        const comuna = s(item.comunas?.nombre).toLowerCase();
        return nombre.includes(term) || comuna.includes(term);
      });
  }, [items, estadoFilter, search]);

  async function aprobar(id: string) {
    try {
      setLoadingId(id);
      setMessage("");

      const res = await fetch("/api/admin/aprobar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMessage(data?.error || "No se pudo aprobar el emprendimiento.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                estado_publicacion: "publicado",
                publicado: true,
              }
            : item
        )
      );

      setMessage("Emprendimiento aprobado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Ocurrió un error al aprobar.");
    } finally {
      setLoadingId(null);
    }
  }

  async function rechazar(id: string) {
    try {
      setLoadingId(id);
      setMessage("");

      const res = await fetch("/api/admin/rechazar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMessage(data?.error || "No se pudo rechazar el emprendimiento.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                estado_publicacion: "rechazado",
                publicado: false,
              }
            : item
        )
      );

      setMessage("Emprendimiento rechazado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("Ocurrió un error al rechazar.");
    } finally {
      setLoadingId(null);
    }
  }

  if (filtered.length === 0) {
    return (
      <div>
        {message ? <div style={messageStyle}>{message}</div> : null}
        <div style={emptyStyle}>No hay negocios que coincidan con los filtros.</div>
      </div>
    );
  }

  return (
    <div>
      {message ? <div style={messageStyle}>{message}</div> : null}

      <div style={filtersRowStyle}>
        <div style={filtersGroupStyle}>
          <label style={filterLabelStyle}>Estado</label>
          <select
            value={estadoFilter}
            onChange={(e) =>
              setEstadoFilter(e.target.value as typeof estadoFilter)
            }
            style={filterSelectStyle}
          >
            <option value="todos">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="pendiente_aprobacion">Pendiente aprobación</option>
            <option value="publicado">Publicado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div style={filtersGroupStyle}>
          <label style={filterLabelStyle}>Buscar por nombre o comuna</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej: panadería, Maipú..."
            style={filterInputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {filtered.map((item) => {
          const loading = loadingId === item.id;

          return (
            <article key={item.id} style={cardStyle}>
              <div style={topMetaStyle}>
                <span style={pillStyle}>
                  {item.categorias?.nombre || "sin-categoria"}
                </span>

                <span style={locationStyle}>
                  📍 {item.comunas?.nombre || "sin-comuna"}
                </span>

                <span style={statusStyle}>
                  {item.estado_publicacion || "sin-estado"}
                </span>
              </div>

              <h2 style={titleStyle}>{item.nombre || "Sin nombre"}</h2>

              {item.descripcion_negocio || item.descripcion_corta ? (
                <p style={shortDescStyle}>
                  {item.descripcion_negocio || item.descripcion_corta}
                </p>
              ) : null}

              <div style={contentGridStyle}>
                <div>
                  {item.responsable_nombre ? (
                    <p style={infoLineStyle}>
                      <strong>Responsable:</strong> {item.responsable_nombre}
                    </p>
                  ) : null}

                  {item.email ? (
                    <p style={infoLineStyle}>
                      <strong>Email:</strong> {item.email}
                    </p>
                  ) : null}

                  {item.sitio_web ? (
                    <p style={infoLineStyle}>
                      <strong>Web:</strong> {item.sitio_web}
                    </p>
                  ) : null}

                  {item.subcategorias_slugs?.length ? (
                    <p style={infoLineStyle}>
                      <strong>Subcategorías:</strong>{" "}
                      {item.subcategorias_slugs.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div>
                  {item.whatsapp ? (
                    <p style={infoLineStyle}>
                      <strong>WhatsApp:</strong> {item.whatsapp}
                    </p>
                  ) : null}

                  {item.instagram ? (
                    <p style={infoLineStyle}>
                      <strong>Instagram:</strong> @{item.instagram}
                    </p>
                  ) : null}

                  <p style={infoLineStyle}>
                    <strong>Cobertura:</strong>{" "}
                    {formatCoverage(
                      item.nivel_cobertura,
                      item.coverage_labels,
                      item.comunas?.nombre
                    )}
                  </p>

                  {item.created_at ? (
                    <p style={infoLineMutedStyle}>
                      Enviado: {formatDateSafe(item.created_at)}
                    </p>
                  ) : null}
                </div>
              </div>

              {item.foto_principal_url ? (
                <div style={imageBoxStyle}>
                  <img
                    src={item.foto_principal_url}
                    alt={item.nombre || "Foto principal"}
                    style={imageStyle}
                  />
                </div>
              ) : null}

              {item.descripcion_larga ? (
                <div style={longDescBoxStyle}>{item.descripcion_larga}</div>
              ) : null}

              <div style={actionsStyle}>
                <button
                  type="button"
                  onClick={() => aprobar(item.id)}
                  disabled={loading}
                  style={{
                    ...approveButtonStyle,
                    ...(loading ? disabledButtonStyle : {}),
                  }}
                >
                  {loading ? "Procesando..." : "Aprobar"}
                </button>

                <button
                  type="button"
                  onClick={() => rechazar(item.id)}
                  disabled={loading}
                  style={{
                    ...rejectButtonStyle,
                    ...(loading ? disabledButtonStyle : {}),
                  }}
                >
                  Rechazar
                </button>

                {item.slug ? (
                  <a
                    href={`/emprendedor/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={linkButtonStyle}
                  >
                    Ver detalles
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const topMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 12,
  fontSize: 13,
};

const pillStyle: React.CSSProperties = {
  color: "#444",
  fontWeight: 700,
};

const locationStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 700,
};

const statusStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1.1,
  fontWeight: 900,
  margin: "0 0 8px 0",
  color: "#111827",
};

const shortDescStyle: React.CSSProperties = {
  margin: "0 0 16px 0",
  color: "#555",
  fontSize: 16,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
  marginBottom: 16,
};

const infoLineStyle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 15,
  lineHeight: 1.5,
  color: "#222",
};

const infoLineMutedStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#6b7280",
};

const longDescBoxStyle: React.CSSProperties = {
  borderTop: "1px solid #f1f5f9",
  paddingTop: 14,
  marginTop: 8,
  color: "#444",
  fontSize: 15,
  lineHeight: 1.6,
};

const imageBoxStyle: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  maxWidth: 320,
};

const imageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  objectFit: "cover",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 18,
};

const approveButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "#10b981",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const rejectButtonStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 800,
  textDecoration: "none",
};

const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.7,
  cursor: "not-allowed",
};

const emptyStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 18,
  padding: 28,
  background: "#fff",
  color: "#6b7280",
  fontSize: 16,
};

const messageStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 14,
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  fontWeight: 700,
};

const filtersRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  alignItems: "flex-end",
  marginBottom: 18,
};

const filtersGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 220,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#4b5563",
};

const filterSelectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  padding: "0 10px",
  fontSize: 14,
};

const filterInputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  padding: "0 10px",
  fontSize: 14,
  minWidth: 260,
};