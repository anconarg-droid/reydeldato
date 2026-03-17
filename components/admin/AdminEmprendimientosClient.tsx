"use client";

import { useState } from "react";

type Item = {
  id: string;
  nombre: string;
  slug: string;
  estado_publicacion?: string | null;
  plan?: string | null;
  updated_at?: string | null;
  comunas?: { nombre: string; slug: string } | null;
  categorias?: { nombre: string; slug: string } | null;
};

type Props = {
  initialItems: Item[];
};

const PLANES = ["trial", "basico", "premium"] as const;

export default function AdminEmprendimientosClient({ initialItems }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function updatePlan(id: string, plan: string) {
    try {
      setLoadingId(id);
      setMessage("");

      const res = await fetch("/api/admin/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, plan }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo actualizar el plan.");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                plan,
              }
            : item
        )
      );

      setMessage("Plan actualizado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error al actualizar el plan."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function togglePublicacion(id: string, accion: "suspender" | "reactivar") {
    try {
      setLoadingId(id);
      setMessage("");

      const res = await fetch("/api/admin/publicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo actualizar la publicación.");
      }

      const nuevoEstado = data.item?.estado_publicacion as string | undefined;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                estado_publicacion: nuevoEstado || item.estado_publicacion,
              }
            : item
        )
      );

      setMessage("Publicación actualizada correctamente.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar la publicación."
      );
    } finally {
      setLoadingId(null);
    }
  }

  if (!items.length) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: 18,
          padding: 18,
        }}
      >
        {message ? (
          <div
            style={{
              marginBottom: 12,
              border: "1px solid #d1fae5",
              background: "#ecfdf5",
              color: "#166534",
              borderRadius: 12,
              padding: 10,
              fontSize: 14,
            }}
          >
            {message}
          </div>
        ) : null}
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          No hay emprendimientos publicados para mostrar.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {message ? (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#ecfdf5",
            color: "#166534",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(180px, 1.5fr) minmax(140px, 1fr) minmax(160px, 1fr) 110px 130px 190px",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
          fontSize: 13,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        <div>Nombre</div>
        <div>Comuna</div>
        <div>Categoría</div>
        <div>Plan</div>
        <div>Estado</div>
        <div>Acciones</div>
      </div>

      {items.map((item) => {
        const loading = loadingId === item.id;
        const estado = (item.estado_publicacion || "").toLowerCase();

        return (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(180px, 1.5fr) minmax(140px, 1fr) minmax(160px, 1fr) 110px 130px 190px",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid #f3f4f6",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: "#111827" }}>{item.nombre}</div>
              {item.updated_at ? (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  Actualizado: {new Date(item.updated_at).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div style={{ fontSize: 13, color: "#374151" }}>
              {item.comunas?.nombre || "—"}
            </div>

            <div style={{ fontSize: 13, color: "#374151" }}>
              {item.categorias?.nombre || "—"}
            </div>

            <div>
              <select
                value={(item.plan || "basico").toLowerCase()}
                disabled={loading}
                onChange={(e) => updatePlan(item.id, e.target.value)}
                style={{
                  minWidth: 90,
                  height: 32,
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  padding: "0 10px",
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                {PLANES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 90,
                  height: 30,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  background:
                    estado === "publicado" ? "#dcfce7" : estado === "suspendido" ? "#fee2e2" : "#e5e7eb",
                  color:
                    estado === "publicado" ? "#166534" : estado === "suspendido" ? "#991b1b" : "#374151",
                }}
              >
                {estado || "—"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={loading || estado === "suspendido"}
                onClick={() => togglePublicacion(item.id, "suspender")}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid #fca5a5",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: loading || estado === "suspendido" ? "default" : "pointer",
                }}
              >
                Suspender
              </button>

              <button
                type="button"
                disabled={loading || estado === "publicado"}
                onClick={() => togglePublicacion(item.id, "reactivar")}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid #bbf7d0",
                  background: "#ecfdf5",
                  color: "#166534",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: loading || estado === "publicado" ? "default" : "pointer",
                }}
              >
                Reactivar
              </button>

              <a
                href={`/emprendedor/${item.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Ver detalles
              </a>

              <a
                href={`/panel/negocios/nuevo?id=${encodeURIComponent(item.id)}`}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Editar
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

