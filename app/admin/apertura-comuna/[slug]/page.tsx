import { notFound } from "next/navigation";
import AdminAperturaComunaDetalleView from "@/components/admin/AdminAperturaComunaDetalleView";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { loadAdminAperturaComunaDetalle } from "@/lib/loadAdminAperturaComuna";

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
  params: Promise<{ slug: string }>;
};

export default async function AdminAperturaComunaSlugPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = String(rawSlug || "").trim().toLowerCase();

  const supabase = createSupabaseAdminForServer();
  const data = await loadAdminAperturaComunaDetalle(supabase, slug);

  if (!data) {
    notFound();
  }

  return <AdminAperturaComunaDetalleView data={data} />;
}
