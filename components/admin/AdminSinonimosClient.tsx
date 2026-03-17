"use client";

import { useState } from "react";

type SinonimoItem = {
  id: string;
  termino: string;
  sinonimos: string[];
  activo: boolean;
};

export default function AdminSinonimosClient({
  initialItems,
}: {
  initialItems: SinonimoItem[];
}) {
  const [items, setItems] = useState<SinonimoItem[]>(initialItems);
  const [termino, setTermino] = useState("");
  const [sinonimos, setSinonimos] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTermino, setEditTermino] = useState("");
  const [editSinonimos, setEditSinonimos] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/sinonimos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          termino,
          sinonimos,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.error || "Error creando sinónimo");
        return;
      }

      setItems((prev) => [data.item, ...prev]);
      setTermino("");
      setSinonimos("");
      setMessage("Sinónimo creado correctamente.");
    } catch {
      setMessage("Error de red al crear.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActivo(item: SinonimoItem) {
    try {
      const res = await fetch("/api/admin/sinonimos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          activo: !item.activo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.error || "Error actualizando");
        return;
      }

      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? data.item : x))
      );
    } catch {
      setMessage("Error de red al actualizar.");
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm("¿Eliminar este término?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/sinonimos?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.error || "Error eliminando");
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      setMessage("Error de red al eliminar.");
    }
  }

  function startEdit(item: SinonimoItem) {
    setEditingId(item.id);
    setEditTermino(item.termino);
    setEditSinonimos(
      Array.isArray(item.sinonimos) ? item.sinonimos.join(", ") : ""
    );
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTermino("");
    setEditSinonimos("");
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/sinonimos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          termino: editTermino,
          sinonimos: editSinonimos,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.error || "Error guardando edición");
        return;
      }

      setItems((prev) =>
        prev.map((x) => (x.id === id ? data.item : x))
      );

      setEditingId(null);
      setEditTermino("");
      setEditSinonimos("");
      setMessage("Cambios guardados.");
    } catch {
      setMessage("Error de red al guardar.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <>
      <section
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: 18,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: "0 0 14px 0",
            fontSize: 24,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Crear nuevo sinónimo
        </h2>

        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label
              htmlFor="termino"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Término
            </label>
            <input
              id="termino"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="ej: conejo"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 12px",
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="sinonimos"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Sinónimos separados por coma
            </label>
            <input
              id="sinonimos"
              value={sinonimos}
              onChange={(e) => setSinonimos(e.target.value)}
              placeholder="ej: veterinaria, mascotas, alimentos mascotas"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 12px",
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 46,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {loading ? "Guardando..." : "Crear"}
          </button>
        </form>

        {message ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#374151",
            }}
          >
            {message}
          </div>
        ) : null}
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr 110px 220px",
            gap: 16,
            padding: "14px 18px",
            fontWeight: 900,
            color: "#111827",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div>Término</div>
          <div>Sinónimos</div>
          <div>Activo</div>
          <div>Acciones</div>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 18, color: "#6b7280" }}>
            No hay sinónimos cargados.
          </div>
        ) : (
          items.map((row) => {
            const isEditing = editingId === row.id;

            return (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 110px 220px",
                  gap: 16,
                  padding: "14px 18px",
                  borderBottom: "1px solid #f3f4f6",
                  alignItems: "start",
                }}
              >
                <div>
                  {isEditing ? (
                    <input
                      value={editTermino}
                      onChange={(e) => setEditTermino(e.target.value)}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        padding: "0 10px",
                        fontSize: 14,
                      }}
                    />
                  ) : (
                    <div style={{ fontWeight: 800, color: "#111827" }}>
                      {row.termino}
                    </div>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <input
                      value={editSinonimos}
                      onChange={(e) => setEditSinonimos(e.target.value)}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        padding: "0 10px",
                        fontSize: 14,
                      }}
                    />
                  ) : (
                    <div style={{ color: "#374151", lineHeight: 1.6 }}>
                      {Array.isArray(row.sinonimos) && row.sinonimos.length > 0
                        ? row.sinonimos.join(", ")
                        : "—"}
                    </div>
                  )}
                </div>

                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 72,
                      height: 32,
                      borderRadius: 999,
                      fontWeight: 800,
                      fontSize: 13,
                      background: row.activo ? "#dcfce7" : "#f3f4f6",
                      color: row.activo ? "#166534" : "#6b7280",
                    }}
                  >
                    {row.activo ? "Sí" : "No"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(row.id)}
                        disabled={savingEdit}
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "none",
                          background: "#111827",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {savingEdit ? "Guardando..." : "Guardar"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActivo(row)}
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {row.activo ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(row.id)}
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1px solid #fecaca",
                          background: "#fff",
                          color: "#991b1b",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}