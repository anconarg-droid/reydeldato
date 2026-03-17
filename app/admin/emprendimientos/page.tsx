import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminEmprendimientosClient from "@/components/admin/AdminEmprendimientosClient";

export const dynamic = "force-dynamic";

export default async function AdminEmprendimientosPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("emprendedores")
    .select(
      `
      id,
      nombre,
      slug,
      estado_publicacion,
      plan,
      updated_at,
      comunas!emprendedores_comuna_base_id_fkey ( nombre, slug ),
      categorias ( nombre, slug )
    `
    )
    .in("estado_publicacion", ["publicado", "suspendido"])
    .order("updated_at", { ascending: false });

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: 34,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Admin · Emprendimientos publicados
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
            Error cargando emprendimientos: {error.message}
          </div>
        ) : (
          <AdminEmprendimientosClient initialItems={data ?? []} />
        )}
      </section>
    </main>
  );
}

