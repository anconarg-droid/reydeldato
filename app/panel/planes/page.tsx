import { redirect } from "next/navigation";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { resolveEmprendedorIdForPanelMetrics } from "@/lib/panelNegocioAccessToken";
import { panelPlanesVisibleEnServidor } from "@/lib/panelPlanesVisibility";
import PlanesPanelClientGate from "./PlanesPanelClientGate";

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{
    slug?: string;
    id?: string;
    pago?: string;
    access_token?: string;
  }>;
}) {
  const params = await searchParams;
  const slug = String(params.slug || "").trim();
  const idParam = String(params.id || "").trim();
  const accessToken = String(params.access_token || "").trim();
  const pago = String(params.pago || "").trim().toLowerCase();

  if (!panelPlanesVisibleEnServidor()) {
    const sp = new URLSearchParams();
    if (idParam) sp.set("id", idParam);
    if (slug) sp.set("slug", slug);
    if (accessToken) sp.set("access_token", accessToken);
    const q = sp.toString();
    redirect(q ? `/panel?${q}` : "/panel");
  }

  // /panel/planes no es público: requiere access_token (mismo mecanismo que panel).
  if (accessToken.length < 8) {
    redirect("/panel");
  }

  let emprendedorId = "";
  const supabase = createSupabaseServerPublicClient();

  if (accessToken.length >= 8) {
    const admin = getSupabaseAdminFromEnv();
    const resolved = await resolveEmprendedorIdForPanelMetrics(
      admin,
      accessToken
    );
    emprendedorId = resolved ?? "";
  }

  // Nota: no resolvemos por slug/id sin access_token para evitar exponer planes como landing pública.

  if (!emprendedorId) {
    const sp = new URLSearchParams();
    if (accessToken) sp.set("access_token", accessToken);
    const q = sp.toString();
    redirect(q ? `/panel?${q}` : "/panel");
  }

  return (
    <main className="w-full min-h-screen bg-gray-50/80">
      <PlanesPanelClientGate
        id={emprendedorId}
        slug={slug}
        accessToken={accessToken}
        pagoFlash={pago === "fallo" ? "fallo" : null}
      />
    </main>
  );
}
