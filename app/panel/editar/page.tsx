import { redirect } from "next/navigation";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { buildMejorarFichaQueryString } from "@/lib/mejorarFichaQuery";

/**
 * Ruta legacy: antes mostraba el hub "Gestiona tu ficha".
 * Se redirige a `/mejorar-ficha` preservando id, slug, tokens y focus.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    slug?: string;
    id?: string;
    access_token?: string;
    token?: string;
    refresh_token?: string;
    focus?: string;
    comuna?: string;
    servicio?: string;
  }>;
}) {
  const params = await searchParams;
  const idParam = String(params.id || "").trim();
  const slug = String(params.slug || "").trim();
  const accessToken = String(params.access_token || "").trim();
  const token = String(params.token || "").trim();
  const refreshToken = String(params.refresh_token || "").trim();
  const focus = String(params.focus || "").trim();
  const comuna = String(params.comuna || "").trim();
  const servicio = String(params.servicio || "").trim();

  let emprendedorId = idParam;
  const supabase = createSupabaseServerPublicClient();

  if (!emprendedorId && slug) {
    const { data: empBySlug } = await supabase
      .from("vw_emprendedores_publico")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    emprendedorId =
      empBySlug && typeof (empBySlug as { id?: unknown }).id === "string"
        ? String((empBySlug as { id: string }).id).trim()
        : "";
  }

  const entries: Record<string, string | undefined> = {};
  if (emprendedorId) entries.id = emprendedorId;
  if (accessToken) entries.access_token = accessToken;
  else if (token) entries.access_token = token;
  if (refreshToken) entries.refresh_token = refreshToken;
  if (focus) entries.focus = focus;
  if (comuna) entries.comuna = comuna;
  if (servicio) entries.servicio = servicio;
  entries.origen = "panel";

  redirect(`/mejorar-ficha${buildMejorarFichaQueryString(entries)}`);
}
