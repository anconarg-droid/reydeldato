"use client";

import { useState } from "react";

type SinonimoItem = {
  id: number | string;
  termino_input: string;
  termino_canonico: string;
  activo: boolean;
};

export default function AdminSinonimosClient({
  initialItems,
}: {
  initialItems: SinonimoItem[];
}) {
  const [items, setItems] = useState<SinonimoItem[]>(initialItems);
  const [terminoInput, setTerminoInput] = useState("");
  const [terminoCanonico, setTerminoCanonico] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerminoInput, setEditTerminoInput] = useState("");
  const [editTerminoCanonico, setEditTerminoCanonico] = useState("");
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
          termino_input: terminoInput,
          termino_canonico: terminoCanonico,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(data.error || "Error creando sinónimo");
        return;
      }

      setItems((prev) => [data.item, ...prev]);
      setTerminoInput("");
      setTerminoCanonico("");
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

  async function deleteItem(id: number | string) {
    const ok = window.confirm("¿Eliminar este término?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/sinonimos?id=${encodeURIComponent(String(id))}`, {
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
    setEditingId(String(item.id));
    setEditTerminoInput(item.termino_input);
    setEditTerminoCanonico(item.termino_canonico);
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTerminoInput("");
    setEditTerminoCanonico("");
  }

  async function saveEdit(id: number | string) {
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
          termino_input: editTerminoInput,
          termino_canonico: editTerminoCanonico,
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
      setEditTerminoInput("");
      setEditTerminoCanonico("");
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
              htmlFor="termino_input"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Qué escribe el usuario
            </label>
            <input
              id="termino_input"
              value={terminoInput}
              onChange={(e) => setTerminoInput(e.target.value)}
              placeholder="ej: gasfiter"
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
              htmlFor="termino_canonico"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              Se convierte en
            </label>
            <input
              id="termino_canonico"
              value={terminoCanonico}
              onChange={(e) => setTerminoCanonico(e.target.value)}
              placeholder="ej: plomero"
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
          <div>Qué escribe el usuario</div>
          <div>Se convierte en</div>
          <div>Activo</div>
          <div>Acciones</div>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 18, color: "#6b7280" }}>
            No hay sinónimos cargados.
          </div>
        ) : (
          items.map((row) => {
            const isEditing = editingId === String(row.id);

            return (
              <div
                key={String(row.id)}
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
                      value={editTerminoInput}
                      onChange={(e) => setEditTerminoInput(e.target.value)}
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
                      {row.termino_input}
                    </div>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <input
                      value={editTerminoCanonico}
                      onChange={(e) => setEditTerminoCanonico(e.target.value)}
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
                      {row.termino_canonico ? row.termino_canonico : "—"}
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
