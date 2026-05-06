"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PagoAdminItem = {
  id: string;
  emprendedorId: string;
  emprendedorNombre: string;
  emprendedorSlug: string;
  planCodigo: string;
  metodoPago: string;
  proveedor: string;
  referencia: string;
  estado: string;
  monto: number;
  comprobanteUrl: string | null;
  observaciones: string | null;
  createdAt: string | null;
  paidAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export default function AdminPagosClient() {
  const [items, setItems] = useState<PagoAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/pagos", { cache: "no-store" });
      const j = (await r.json()) as { ok?: boolean; items?: PagoAdminItem[]; error?: string };
      if (!r.ok || !j?.ok) {
        setItems([]);
        setError(j?.error || "No se pudo cargar pagos.");
      } else {
        setItems(Array.isArray(j.items) ? j.items : []);
      }
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resumen = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const k = s(it.estado) || "—";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const aprobar = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/pagos/${encodeURIComponent(id)}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || "No se pudo aprobar.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const rechazar = useCallback(async (id: string) => {
    const motivo = window.prompt("Motivo (opcional) para rechazar:", "") ?? "";
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/pagos/${encodeURIComponent(id)}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones: motivo }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || "No se pudo rechazar.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <div style={{ marginTop: 18 }}>
      {error ? (
        <p
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: 14,
            padding: 12,
            background: "#fef2f2",
            borderRadius: 10,
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fff",
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
          }}
        >
          Recargar
        </button>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {resumen.map(([k, v]) => (
            <span key={k} style={{ marginRight: 10 }}>
              <strong style={{ color: "#111827" }}>{k}</strong>: {v}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 14, color: "#6b7280" }}>Cargando…</p>
      ) : (
        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr>
                {[
                  "Emprendimiento",
                  "Plan",
                  "Método",
                  "Referencia",
                  "Monto",
                  "Estado",
                  "Comprobante",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "10px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const busy = busyId === it.id;
                return (
                  <tr key={it.id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontWeight: 900, color: "#0f172a" }}>
                        {it.emprendedorNombre || it.emprendedorSlug || it.emprendedorId}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {it.emprendedorSlug ? `/${it.emprendedorSlug}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontWeight: 800 }}>{it.planCodigo}</span>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {it.metodoPago} / {it.proveedor}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <code style={{ fontWeight: 800 }}>{it.referencia}</code>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      ${Math.round(it.monto).toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontWeight: 800 }}>{it.estado}</span>
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {it.comprobanteUrl ? (
                        <a
                          href={it.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#0f766e", fontWeight: 800 }}
                        >
                          Ver
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={busy || it.estado === "aprobado"}
                          onClick={() => void aprobar(it.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #bbf7d0",
                            background: "#ecfdf5",
                            color: "#065f46",
                            fontWeight: 900,
                            cursor: busy ? "default" : "pointer",
                          }}
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={busy || it.estado === "rechazado"}
                          onClick={() => void rechazar(it.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#991b1b",
                            fontWeight: 900,
                            cursor: busy ? "default" : "pointer",
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: "#64748b" }}>
                    Sin pagos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

