import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { formatDateTimeEsCL } from "@/lib/formatDateTimeEsCL";

export const dynamic = "force-dynamic";

export default async function AdminComunaInteresPage({
  searchParams,
}: {
  searchParams?: Promise<{ comuna?: string; desde?: string; hasta?: string }>;
}) {
  const sp =
    (await (searchParams ?? Promise.resolve({}))) as {
      comuna?: string;
      desde?: string;
      hasta?: string;
    };
  const comunaFilter = (sp.comuna || "").trim();
  const desde = (sp.desde || "").trim();
  const hasta = (sp.hasta || "").trim();

  const supabase = createSupabaseServerPublicClient();

  let query = supabase
    .from("comuna_interes")
    .select("*")
    .order("created_at", { ascending: false });

  if (comunaFilter) {
    query = query.eq("comuna_slug", comunaFilter);
  }

  if (desde) {
    query = query.gte("created_at", desde);
  }

  if (hasta) {
    query = query.lte("created_at", hasta);
  }

  const { data, error } = await query.limit(200);

  const items = data || [];

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: 34,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Admin · Interés por comuna
        </h1>

        <form
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 4,
              }}
            >
              Comuna slug
            </label>
            <input
              name="comuna"
              defaultValue={comunaFilter}
              placeholder="ej: maipu"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 10px",
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 4,
              }}
            >
              Desde (ISO)
            </label>
            <input
              name="desde"
              defaultValue={desde}
              placeholder="2026-01-01"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 10px",
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 4,
              }}
            >
              Hasta (ISO)
            </label>
            <input
              name="hasta"
              defaultValue={hasta}
              placeholder="2026-12-31"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid #d1d5db",
                padding: "0 10px",
                fontSize: 14,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <button
              type="submit"
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Filtrar
            </button>
          </div>
        </form>

        {error ? (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 16,
              padding: 16,
            }}
          >
            Error cargando registros: {error.message}
          </div>
        ) : (
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
                gridTemplateColumns: "140px 160px 140px 1fr 200px",
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
              <div>Nombre</div>
              <div>WhatsApp</div>
              <div>Rubro</div>
              <div>Email / Fecha</div>
            </div>

            {items.map((row: any, idx: number) => (
              <div
                key={`${row.comuna_slug}-${row.nombre}-${row.created_at}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 160px 140px 1fr 200px",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 13,
                }}
              >
                <div>{row.comuna_slug}</div>
                <div>{row.nombre}</div>
                <div>{row.whatsapp ?? row.telefono ?? "—"}</div>
                <div>{row.rubro ?? "—"}</div>
                <div>
                  <div>{row.email ?? "—"}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {row.created_at ? formatDateTimeEsCL(row.created_at) : ""}
                  </div>
                </div>
              </div>
            ))}

            {!items.length && (
              <div
                style={{
                  padding: 16,
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                No hay registros para los filtros aplicados.
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

