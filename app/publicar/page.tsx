import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import PublicarSimpleClientGate from "./PublicarSimpleClientGate";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { recordEvent } from "@/lib/analytics/recordEvent";

type PageProps = {
  searchParams?: Promise<{
    id?: string;
    comuna?: string;
    servicio?: string;
    edicion_basica?: string;
    access_token?: string;
    token?: string;
  }>;
};

function isEdicionBasicaFlag(raw: string | undefined): boolean {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "si";
}

export default async function PublicarPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  let initialPostulacionId = String(sp.id || "").trim() || null;
  const hintComuna = String(sp.comuna || "").trim();
  const hintServicio = String(sp.servicio || "").trim();
  const edicionBasica = isEdicionBasicaFlag(sp.edicion_basica);
  const accessTokenHint =
    String(sp.access_token || "").trim() || String(sp.token || "").trim();

  const supabase = createSupabaseServerPublicClient();

  let initialEdicionBasicaEmprendedorId: string | null = null;
  let initialEdicionBasicaAccessToken: string | null = null;

  if (edicionBasica && initialPostulacionId) {
    const { data: emp } = await supabase
      .from("vw_emprendedores_publico")
      .select("id")
      .eq("id", initialPostulacionId)
      .maybeSingle();
    const eid =
      emp && typeof (emp as { id?: unknown }).id === "string"
        ? String((emp as { id: string }).id).trim()
        : "";
    if (eid) initialEdicionBasicaEmprendedorId = eid;
  } else if (edicionBasica && accessTokenHint.length >= 8) {
    initialEdicionBasicaAccessToken = accessTokenHint;
  }

  // Si `id` corresponde a un emprendedor existente, /publicar redirige a mejorar-ficha,
  // salvo `edicion_basica=1` (formulario de datos básicos con persistencia vía panel).
  if (initialPostulacionId && !edicionBasica) {
    const { data: emp } = await supabase
      .from("vw_emprendedores_publico")
      .select("id")
      .eq("id", initialPostulacionId)
      .maybeSingle();

    const emprendedorId =
      emp && typeof (emp as { id?: unknown }).id === "string"
        ? String((emp as { id: string }).id).trim()
        : "";

    if (emprendedorId) {
      redirect(`/mejorar-ficha?id=${encodeURIComponent(emprendedorId)}`);
    }
  }

  const skipAutoDraft =
    Boolean(initialEdicionBasicaEmprendedorId) ||
    Boolean(initialEdicionBasicaAccessToken);

  if (edicionBasica && !initialPostulacionId && !skipAutoDraft) {
    redirect("/panel");
  }

  // Si no viene draft_id, crear borrador automáticamente y redirigir
  if (!initialPostulacionId && !skipAutoDraft) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${proto}://${host}`;

    const res = await fetch(`${baseUrl}/api/publicar/borrador`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({}),
    });

    const payload = (await res.json().catch(() => null)) as
      | { ok?: boolean; id?: string | number; error?: string; message?: string; db_error?: string; db_code?: string }
      | null;

    const draftIdRaw = payload?.id;
    const draftId = draftIdRaw != null ? String(draftIdRaw).trim() : "";

    if (!res.ok || !payload?.ok || !draftId) {
      console.error("[publicar/page] error creando borrador:", {
        httpStatus: res.status,
        payload,
      });
      throw new Error(payload?.message || payload?.error || "No se pudo crear el borrador inicial.");
    }

    try {
      await recordEvent(supabase, {
        event_type: "draft_created",
        metadata: {
          comuna_slug: null,
          origen: "publicar_page",
          draft_id: draftId,
        },
      });
    } catch (e) {
      console.error("[publicar/page] tracking draft_created error:", e);
    }

    const qs = new URLSearchParams();
    qs.set("id", draftId);
    if (hintComuna) qs.set("comuna", hintComuna);
    if (hintServicio) qs.set("servicio", hintServicio);
    redirect(`/publicar?${qs.toString()}`);
  }

  const { data: regionesRaw, error: regionesError } = await supabase
    .from("regiones")
    .select("id,nombre,slug")
    .order("nombre");

  const { data: comunasRaw, error: comunasError } = await supabase
    .from("comunas")
    .select("id,nombre,slug,region_id")
    .order("nombre");

  const regiones = (regionesRaw || []).map(
    (r: { id: string | number; nombre: string; slug: string }) => ({
      id: String(r.id),
      nombre: r.nombre,
      slug: r.slug,
    })
  );

  const regionMap = new Map(regiones.map((r) => [String(r.id), r]));

  const comunas = (comunasRaw || []).map(
    (c: {
      id: string | number;
      nombre: string;
      slug: string;
      region_id?: string | number | null;
    }) => {
      const region =
        c.region_id != null ? regionMap.get(String(c.region_id)) : null;

      return {
        id: String(c.id),
        nombre: c.nombre,
        slug: c.slug,
        region_id: c.region_id != null ? String(c.region_id) : null,
        region_nombre: region?.nombre || null,
        display_name: region ? `${c.nombre}, ${region.nombre}` : c.nombre,
      };
    }
  );

  if (regionesError || comunasError) {
    console.error("[publicar/page] error cargando catalogos", {
      regionesError: regionesError?.message ?? null,
      comunasError: comunasError?.message ?? null,
    });
  }

  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "50vh", padding: 24 }}>
          <p>Cargando…</p>
        </main>
      }
    >
      <PublicarSimpleClientGate
        comunas={comunas}
        regiones={regiones}
        initialPostulacionId={initialPostulacionId}
        initialEdicionBasicaEmprendedorId={initialEdicionBasicaEmprendedorId}
        initialEdicionBasicaAccessToken={initialEdicionBasicaAccessToken}
      />
    </Suspense>
  );
}
