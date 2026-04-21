"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTimeEsCL } from "@/lib/formatDateTimeEsCL";

type Item = {
  id: string;
  nombre: string;
  slug: string;
  estado_publicacion?: string | null;
  plan?: string | null;
  updated_at?: string | null;
  comunas?: { nombre: string; slug: string } | null;
  categorias?: { nombre: string; slug: string } | null;
  /** `postulaciones_emprendedores.id` para revisar cambios cuando `en_revision`. */
  revisionPostulacionId?: string | null;
};

export type AdminEmprendimientosEstadoFiltro =
  | "todos"
  | "en_revision"
  | "publicado"
  | "suspendido";

type Props = {
  initialItems: Item[];
  estadoFiltro: AdminEmprendimientosEstadoFiltro;
};

const PLANES = ["trial", "basico", "premium"] as const;

type AdminJson = {
  ok?: boolean;
  error?: string;
  reason?: string;
  message?: string;
  publicacion?: { ok?: boolean };
  item?: { estado_publicacion?: string | null };
  reindexAlgolia?: ReindexAlgoliaPayload;
} & Record<string, unknown>;

type ReindexAlgoliaPayload = {
  ok?: boolean;
  reason?: string;
  message?: string;
} | null;

/** `ok` de la respuesta = operación admin resuelta; `publicacion.ok` confirma BD cuando viene explícito. */
function publicacionEnBdExitosa(res: Response, data: AdminJson | undefined): boolean {
  if (!res.ok || !data) return false;
  const pub = data.publicacion as { ok?: unknown } | undefined;
  if (pub && typeof pub === "object" && pub.ok === true) return true;
  return data.ok === true;
}

function textoAdvertenciaReindex(reindex: ReindexAlgoliaPayload): string | null {
  if (!reindex || reindex.ok === true) return null;
  if (reindex.reason === "algolia_source_view_missing") {
    return "Aviso: no se actualizó el índice de búsqueda (falta la vista de indexación en Supabase). La ficha sí quedó guardada con el estado indicado.";
  }
  const detalle =
    typeof reindex.message === "string" && reindex.message.trim() ? ` ${reindex.message.trim()}` : "";
  return `Aviso: el índice de búsqueda (Algolia) no se pudo actualizar; el cambio en la base de datos ya está aplicado.${detalle}`;
}

const FILTRO_LINKS: { value: AdminEmprendimientosEstadoFiltro; label: string; href: string }[] = [
  { value: "todos", label: "Todos", href: "/admin/emprendimientos" },
  { value: "en_revision", label: "En revisión", href: "/admin/emprendimientos?estado=en_revision" },
  { value: "publicado", label: "Publicados", href: "/admin/emprendimientos?estado=publicado" },
  { value: "suspendido", label: "Suspendidos", href: "/admin/emprendimientos?estado=suspendido" },
];

export default function AdminEmprendimientosClient({ initialItems, estadoFiltro }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [reindexWarning, setReindexWarning] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);

  async function updatePlan(id: string, plan: string) {
    try {
      setLoadingId(id);
      setMessage("");
      setReindexWarning(null);

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

  async function publicarEnSitio(id: string) {
    try {
      setLoadingId(id);
      setMessage("");
      setReindexWarning(null);

      const res = await fetch(`/api/admin/emprendedores/${encodeURIComponent(id)}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await res.json()) as AdminJson;

      if (!publicacionEnBdExitosa(res, data)) {
        const reason = typeof data?.reason === "string" ? data.reason : "";
        const base = String(data?.error || "No se pudo publicar la ficha.");
        throw new Error(reason ? `${base} [${reason}]` : base);
      }

      const nuevoEstado = data.item?.estado_publicacion as string | undefined;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                estado_publicacion: nuevoEstado || "publicado",
              }
            : item
        )
      );

      setMessage("Aprobado. La ficha quedó publicada en el sitio.");
      const warn = textoAdvertenciaReindex(data.reindexAlgolia as ReindexAlgoliaPayload);
      setReindexWarning(warn);
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error al publicar."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function togglePublicacion(id: string, accion: "suspender" | "reactivar") {
    try {
      setLoadingId(id);
      setMessage("");
      setReindexWarning(null);

      const res = await fetch("/api/admin/publicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, accion }),
      });

      const data = (await res.json()) as AdminJson;

      if (!publicacionEnBdExitosa(res, data)) {
        throw new Error(String(data?.error || "No se pudo actualizar la publicación."));
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
      const warn = textoAdvertenciaReindex(data.reindexAlgolia as ReindexAlgoliaPayload);
      setReindexWarning(warn);
      router.refresh();
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

  async function rechazarRevision(emprendedorId: string, postulacionId: string | null | undefined) {
    const pid = String(postulacionId ?? "").trim();
    if (!pid) {
      setMessage("No hay borrador enlazado para rechazar desde aquí.");
      return;
    }
    if (
      !window.confirm(
        "¿Rechazar esta revisión? La ficha volverá a estado publicado (sin aplicar de nuevo el borrador)."
      )
    ) {
      return;
    }
    try {
      setLoadingId(emprendedorId);
      setMessage("");
      setReindexWarning(null);

      const res = await fetch(`/api/admin/revision/${encodeURIComponent(pid)}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as AdminJson;

      if (!res.ok || data?.ok !== true) {
        throw new Error(String(data?.error || data?.message || "No se pudo rechazar la revisión."));
      }

      setMessage(typeof data.message === "string" ? data.message : "Revisión rechazada.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error al rechazar la revisión."
      );
    } finally {
      setLoadingId(null);
    }
  }

  const emptyLabels: Record<AdminEmprendimientosEstadoFiltro, string> = {
    todos: "No hay emprendimientos para mostrar.",
    en_revision: "No hay emprendimientos en revisión.",
    publicado: "No hay emprendimientos publicados.",
    suspendido: "No hay emprendimientos suspendidos.",
  };
  const emptyCopy = emptyLabels[estadoFiltro];

  const filterBar = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: "#6b7280", marginRight: 4 }}>
        Filtrar:
      </span>
      {FILTRO_LINKS.map((f) => {
        const active = estadoFiltro === f.value;
        return (
          <Link
            key={f.value}
            href={f.href}
            scroll={false}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 34,
              padding: "0 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              border: active ? "1px solid #111827" : "1px solid #e5e7eb",
              background: active ? "#111827" : "#fff",
              color: active ? "#fff" : "#374151",
            }}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );

  if (!items.length) {
    return (
      <div>
        {filterBar}
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
          {reindexWarning ? (
            <div
              style={{
                marginBottom: 12,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                borderRadius: 12,
                padding: 10,
                fontSize: 13,
              }}
            >
              {reindexWarning}
            </div>
          ) : null}
          <div style={{ fontSize: 14, color: "#6b7280" }}>{emptyCopy}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {filterBar}
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
      {reindexWarning ? (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: 13,
          }}
        >
          {reindexWarning}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(180px, 1.5fr) minmax(140px, 1fr) minmax(160px, 1fr) 110px 130px minmax(220px, 1.2fr)",
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
                "minmax(180px, 1.5fr) minmax(140px, 1fr) minmax(160px, 1fr) 110px 130px minmax(220px, 1.2fr)",
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
                  Actualizado: {formatDateTimeEsCL(item.updated_at)}
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
                    estado === "publicado"
                      ? "#dcfce7"
                      : estado === "suspendido"
                        ? "#fee2e2"
                        : estado === "en_revision" ||
                            estado === "borrador" ||
                            estado === "rechazado"
                          ? "#fef9c3"
                          : "#e5e7eb",
                  color:
                    estado === "publicado"
                      ? "#166534"
                      : estado === "suspendido"
                        ? "#991b1b"
                        : estado === "en_revision" ||
                            estado === "borrador" ||
                            estado === "rechazado"
                          ? "#854d0e"
                          : "#374151",
                }}
              >
                {estado || "—"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {estado === "en_revision" ? (
                <>
                  {item.revisionPostulacionId ? (
                    <a
                      href={`/admin/revision/${encodeURIComponent(item.revisionPostulacionId)}`}
                      style={{
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 999,
                        border: "1px solid #86efac",
                        background: "#ecfdf5",
                        color: "#166534",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Revisar cambios
                    </a>
                  ) : (
                    <span
                      title="No se encontró postulación de edición (edicion_publicado) enlazada; revisá en Moderación de postulaciones."
                      style={{
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 999,
                        border: "1px dashed #d1d5db",
                        background: "#f9fafb",
                        color: "#9ca3af",
                        fontSize: 12,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Revisar cambios
                    </span>
                  )}
                  {/* Publicar desde listado no aplica postulación; usá Revisión de cambios o Pendientes. */}
                  <button
                    type="button"
                    disabled={loading || !item.revisionPostulacionId}
                    title={
                      !item.revisionPostulacionId
                        ? "Sin postulación de edición enlazada; no se puede rechazar desde aquí."
                        : undefined
                    }
                    onClick={() => void rechazarRevision(item.id, item.revisionPostulacionId)}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: loading || !item.revisionPostulacionId ? "default" : "pointer",
                    }}
                  >
                    Rechazar
                  </button>
                </>
              ) : null}

              {estado === "publicado" ? (
                <>
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
                      display: "inline-flex",
                      alignItems: "center",
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
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Editar
                  </a>
                  <button
                    type="button"
                    disabled={loading}
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
                      cursor: loading ? "default" : "pointer",
                    }}
                  >
                    Suspender
                  </button>
                </>
              ) : null}

              {estado === "suspendido" ? (
                <>
                  <button
                    type="button"
                    disabled={loading}
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
                      cursor: loading ? "default" : "pointer",
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
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Ver detalles
                  </a>
                </>
              ) : null}

              {estado !== "en_revision" &&
              estado !== "publicado" &&
              estado !== "suspendido" ? (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => publicarEnSitio(item.id)}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      border: "1px solid #86efac",
                      background: "#ecfdf5",
                      color: "#166534",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: loading ? "default" : "pointer",
                    }}
                  >
                    Publicar en sitio
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
                      display: "inline-flex",
                      alignItems: "center",
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
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Editar
                  </a>
                  <a
                    href={`/mejorar-ficha?id=${encodeURIComponent(item.id)}`}
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
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Editar ficha
                  </a>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

