import PendientesClient from "@/components/admin/PendientesClient";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { loadPostulacionesPorEstado } from "@/lib/loadPostulacionesModeracion";
import type { PostulacionModeracionItem } from "@/lib/loadPostulacionesModeracion";

export const dynamic = "force-dynamic";

export default async function AdminPendientesPage() {
  let items: PostulacionModeracionItem[] = [];
  let loadError: string | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    loadError =
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisá .env.local y reiniciá el servidor.";
  } else {
    try {
      const supabase = getSupabaseAdmin({ supabaseUrl: url, serviceRoleKey: key });
      const { items: loaded, error } = await loadPostulacionesPorEstado(
        supabase,
        "pendiente_revision"
      );
      if (error) {
        loadError = error.message;
      } else {
        items = loaded;
      }
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

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
        Moderación de postulaciones
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: 30,
        }}
      >
        Revisa las fichas enviadas desde el formulario público. Al aprobar se crea o
        actualiza el registro en emprendedores; aquí solo ves{" "}
        <code>postulaciones_emprendedores</code>.
      </p>

      {loadError ? (
        <p
          role="alert"
          style={{
            color: "#b91c1c",
            marginBottom: 24,
            padding: 16,
            background: "#fef2f2",
            borderRadius: 8,
            border: "1px solid #fecaca",
          }}
        >
          No se pudo cargar la cola: {loadError}
        </p>
      ) : null}

      <PendientesClient initialPostulaciones={items} initialEstadoFilter="pendiente_revision" />
    </main>
  );
}
