"use client";

import { useState } from "react";

type Item = {
  id: string;
  categoria_slug?: string | null;
  subcategoria_slug: string;
  keywords: string[];
  activo: boolean;
};

export default function AdminKeywordsRubroClient({
  initialItems,
}: {
  initialItems: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("");

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/keywords-rubro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoria_slug: categoria,
        subcategoria_slug: subcategoria,
        keywords,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Error creando");
      return;
    }

    setItems((prev) => [data.item, ...prev]);
    setCategoria("");
    setSubcategoria("");
    setKeywords("");
    setMessage("Keywords de rubro creadas.");
  }

  async function toggleActivo(item: Item) {
    const res = await fetch("/api/admin/keywords-rubro", {
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

    setItems((prev) => prev.map((x) => (x.id === item.id ? data.item : x)));
  }

  async function deleteItem(id: string) {
    const ok = window.confirm("¿Eliminar este registro?");
    if (!ok) return;

    const res = await fetch(`/api/admin/keywords-rubro?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Error eliminando");
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
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
        <h2 style={{ margin: "0 0 14px 0", fontSize: 24, fontWeight: 900 }}>
          Crear keywords por rubro
        </h2>

        <form
          onSubmit={createItem}
          style={{
            display: "grid",
            gridTemplateColumns: "180px 180px 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
              Categoría slug
            </label>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="hogar-construccion"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
              Subcategoría slug
            </label>
            <input
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              placeholder="gasfiteria"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
              Keywords separadas por coma
            </label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="gas, agua, plomero, calefont"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 12px",
              }}
            />
          </div>

          <button
            type="submit"
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
            Crear
          </button>
        </form>

        {message ? (
          <div style={{ marginTop: 12, fontSize: 14, color: "#374151" }}>
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
            gridTemplateColumns: "180px 180px 1fr 110px 160px",
            gap: 16,
            padding: "14px 18px",
            fontWeight: 900,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div>Categoría</div>
          <div>Subcategoría</div>
          <div>Keywords</div>
          <div>Activo</div>
          <div>Acciones</div>
        </div>

        {items.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 180px 1fr 110px 160px",
              gap: 16,
              padding: "14px 18px",
              borderBottom: "1px solid #f3f4f6",
              alignItems: "start",
            }}
          >
            <div>{row.categoria_slug || "—"}</div>
            <div style={{ fontWeight: 800 }}>{row.subcategoria_slug}</div>
            <div>{Array.isArray(row.keywords) ? row.keywords.join(", ") : "—"}</div>
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
            </div>
          </div>
        ))}
      </section>
    </>
  );
}