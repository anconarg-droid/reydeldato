import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import AdminKeywordsRubroClient from "@/components/admin/AdminKeywordsRubroClient";

export default async function AdminKeywordsRubroPage() {
  const supabase = createSupabaseServerPublicClient();

  const { data, error } = await supabase
    .from("keywords_rubro")
    .select("id, categoria_slug, subcategoria_slug, keywords, activo")
    .order("categoria_slug", { ascending: true });

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 20px 0", fontSize: 34, fontWeight: 900 }}>
          Admin · Keywords por rubro
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
            Error cargando keywords por rubro: {error.message}
          </div>
        ) : (
          <AdminKeywordsRubroClient initialItems={data ?? []} />
        )}
      </section>
    </main>
  );
}