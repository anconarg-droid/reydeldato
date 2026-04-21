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

  if (!idParam && !slug && !accessToken) {
    redirect("/panel");
  }

  let emprendedorId = idParam;
  const supabase = createSupabaseServerPublicClient();

  if (!emprendedorId && accessToken.length >= 8) {
    const admin = getSupabaseAdminFromEnv();
    const resolved = await resolveEmprendedorIdForPanelMetrics(
      admin,
      accessToken
    );
    emprendedorId = resolved ?? "";
  }

  if (!emprendedorId && slug) {
    const { data: empBySlug } = await supabase
      .from("vw_emprendedores_publico")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    emprendedorId =
      empBySlug && typeof (empBySlug as { id?: unknown }).id === "string"
        ? (empBySlug as { id: string }).id
        : "";
  }

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
        pagoFlash={pago === "fallo" ? "fallo" : null}
      />
    </main>
  );
}
