import { createClient } from "@supabase/supabase-js";
import PendientesClient from "@/components/admin/PendientesClient";

export const dynamic = "force-dynamic";

export default async function AdminPendientesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("emprendedores")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando pendientes:", error);
  }

  const items = data || [];

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <h1
        style={{
          fontSize: 38,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        Moderación de emprendimientos
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: 30,
        }}
      >
        Revisa, filtra y modera los emprendimientos enviados por la comunidad.
      </p>

      <PendientesClient initialItems={items} />
    </main>
  );
}