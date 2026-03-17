import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminComunasPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vw_comunas_por_abrir")
    .select(
      "comuna_slug, comuna_nombre, estado_apertura, total_emprendedores, avance_porcentaje, faltan_emprendedores_meta"
    )
    .order("comuna_nombre", { ascending: true });

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
          Admin · Comunas
        </h1>

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
            Error cargando comunas: {error.message}
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
                gridTemplateColumns:
                  "minmax(160px, 1.4fr) 120px 120px 120px 150px 180px",
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
              <div>Estado</div>
              <div>Emprend.</div>
              <div>Avance</div>
              <div>Faltan meta</div>
              <div>Acciones</div>
            </div>

            {items.map((item: any) => {
              const estado = (item.estado_apertura || "").toLowerCase();
              const avance = Number(item.avance_porcentaje || 0);
              return (
                <div
                  key={item.comuna_slug}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(160px, 1.4fr) 120px 120px 120px 150px 180px",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    fontSize: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#111827" }}>
                    {item.comuna_nombre}
                  </div>
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    {estado || "—"}
                  </div>
                  <div>{item.total_emprendedores ?? 0}</div>
                  <div>{avance.toFixed(0)}%</div>
                  <div>{item.faltan_emprendedores_meta ?? 0}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <FormButton
                      slug={item.comuna_slug}
                      accion="activa"
                      disabled={estado === "activa"}
                    >
                      Abrir comuna
                    </FormButton>
                    <FormButton
                      slug={item.comuna_slug}
                      accion="en_preparacion"
                      disabled={estado === "en_preparacion"}
                    >
                      Volver a preparación
                    </FormButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function FormButton({
  slug,
  accion,
  disabled,
  children,
}: {
  slug: string;
  accion: "activa" | "en_preparacion";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form
      action={`/api/admin/comunas/estado`}
      method="post"
      style={{ margin: 0 }}
    >
      <input type="hidden" name="comuna_slug" value={slug} />
      <input type="hidden" name="estado_apertura" value={accion} />
      <button
        type="submit"
        disabled={disabled}
        style={{
          height: 30,
          padding: "0 10px",
          borderRadius: 999,
          border: "1px solid #d1d5db",
          background: disabled ? "#f3f4f6" : "#fff",
          color: "#111827",
          fontSize: 12,
          fontWeight: 800,
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {children}
      </button>
    </form>
  );
}

