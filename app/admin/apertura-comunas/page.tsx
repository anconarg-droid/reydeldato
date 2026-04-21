import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { loadAdminAperturaComunasResumen } from "@/lib/loadAdminAperturaComuna";

export const dynamic = "force-dynamic";

function createSupabaseAdminForServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    );
  }
  return getSupabaseAdmin({ supabaseUrl: url, serviceRoleKey: key });
}

export default async function AdminAperturaComunasPage() {
  let error: string | null = null;
  let items: Awaited<ReturnType<typeof loadAdminAperturaComunasResumen>>["items"] =
    [];

  try {
    const supabase = createSupabaseAdminForServer();
    const out = await loadAdminAperturaComunasResumen(supabase);
    error = out.error;
    items = out.items;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/admin"
            style={{ fontSize: 14, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
          >
            ← Volver al panel admin
          </Link>
        </div>

        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: 34,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Apertura de comunas · resumen
        </h1>
        <p style={{ margin: "0 0 24px 0", fontSize: 15, color: "#4b5563", maxWidth: 720 }}>
          Vista interna: porcentaje y fracción <strong>rubros cumplidos / rubros requeridos</strong> desde{" "}
          <code style={{ fontSize: 13 }}>vw_apertura_comuna_v2</code>. El desglose por rubro está en cada
          comuna.
        </p>

        {error ? (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
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
              gridTemplateColumns: "minmax(180px, 1.6fr) 100px 100px 100px 160px",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: 13,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            <div>Comuna</div>
            <div>% Apertura</div>
            <div>Cumplido</div>
            <div>Meta</div>
            <div>Detalle</div>
          </div>

          {items.map((row) => (
            <div
              key={row.comuna_slug}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 1.6fr) 100px 100px 100px 160px",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid #f3f4f6",
                fontSize: 14,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700, color: "#111827" }}>{row.comuna_nombre}</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>
                {row.porcentaje_apertura != null ? `${row.porcentaje_apertura.toFixed(1)}%` : "—"}
              </div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>{row.total_cumplido ?? "—"}</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>{row.total_requerido ?? "—"}</div>
              <div>
                <Link
                  href={`/admin/apertura-comuna/${encodeURIComponent(row.comuna_slug)}`}
                  style={{
                    display: "inline-block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    background: "#111827",
                    padding: "6px 12px",
                    borderRadius: 999,
                    textDecoration: "none",
                  }}
                >
                  Ver rubros
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
