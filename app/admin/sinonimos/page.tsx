import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminSinonimosClient from "@/components/admin/AdminSinonimosClient";

export default async function AdminSinonimosPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("busqueda_sinonimos")
    .select("id, termino, sinonimos, activo")
    .order("termino");

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
          Admin · Sinónimos de búsqueda
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
            Error cargando sinónimos: {error.message}
          </div>
        ) : (
          <AdminSinonimosClient initialItems={data ?? []} />
        )}
      </section>
    </main>
  );
}