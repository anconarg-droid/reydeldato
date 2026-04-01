import { loadPostulacionesPorEstado } from "@/lib/loadPostulacionesModeracion";
import PendientesClient from "@/components/admin/PendientesClient";

export const dynamic = "force-dynamic";

export default async function AdminPendientesPage() {
  const { items, error } = await loadPostulacionesPorEstado("pendiente_revision");

  if (error) {
    console.error("Error cargando postulaciones pendientes:", error.message);
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

      <PendientesClient initialPostulaciones={items} initialEstadoFilter="pendiente_revision" />
    </main>
  );
}
