import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { loadAdminRevisionData } from "@/lib/loadAdminRevision";
import AdminRevisionClient from "@/components/admin/AdminRevisionClient";

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

type PageProps = {
  params: Promise<{ id: string }>;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export default async function AdminRevisionPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminForServer();
  const data = await loadAdminRevisionData(supabase, id);

  if (data.error || !data.postulacion) {
    return (
      <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
        <section style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link
            href="/admin/emprendimientos"
            style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
          >
            ← Volver a emprendimientos
          </Link>
          <h1 style={{ marginTop: 24, fontSize: 28, fontWeight: 900 }}>Revisión de cambios</h1>
          <p style={{ color: "#b91c1c", marginTop: 12 }}>{data.error || "No se encontró la postulación."}</p>
        </section>
      </main>
    );
  }

  const p = data.postulacion;
  const nombre =
    s(p.nombre_emprendimiento) || s(p.nombre) || "Postulación sin nombre";

  return (
    <main style={{ padding: "32px 20px", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 32, fontWeight: 900, color: "#111827" }}>
          Revisión de cambios
        </h1>
        <AdminRevisionClient
          postulacionId={s(p.id) || id}
          nombrePostulacion={nombre}
          estadoPostulacion={s(p.estado)}
          tipoPostulacion={s(p.tipo_postulacion)}
          emprendedorId={s(p.emprendedor_id) || null}
          emprendedorSlug={data.emprendedorSlug}
          fields={data.fields}
          resumenCambios={data.resumenCambios}
          tieneCambiosCriticos={data.tieneCambiosCriticos}
          initialCategoriaId={data.initialCategoriaId}
          initialSubcategoriaIds={data.initialSubcategoriaIds}
          referenciaCategoriaNombre={data.referenciaCategoriaNombre}
          referenciaSubcategoriasTexto={data.referenciaSubcategoriasTexto}
        />
      </section>
    </main>
  );
}
