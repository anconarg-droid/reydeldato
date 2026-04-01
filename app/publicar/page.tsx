import { Suspense } from "react";
import { redirect } from "next/navigation";
import PublicarSimpleClient from "./PublicarSimpleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recordEvent } from "@/lib/analytics/recordEvent";

type PageProps = {
  searchParams?: Promise<{ id?: string }>;
};

export default async function PublicarPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  let initialPostulacionId = String(sp.id || "").trim() || null;

  const supabase = createSupabaseServerClient();

  // Si no viene draft_id, crear borrador automáticamente y redirigir
  if (!initialPostulacionId) {
    const { data: nuevaPostulacion, error: createError } = await supabase
      .from("postulaciones_emprendedores")
      .insert({
        estado: "borrador",
      })
      .select("id")
      .single();

    if (createError || !nuevaPostulacion?.id) {
      console.error("[publicar/page] error creando borrador:", createError);
      throw new Error("No se pudo crear el borrador inicial.");
    }

    try {
      const admin = getSupabaseAdmin();
      await recordEvent(admin, {
        event_type: "draft_created",
        metadata: {
          comuna_slug: null,
          origen: "publicar_page",
          draft_id: nuevaPostulacion.id,
        },
      });
    } catch (e) {
      console.error("[publicar/page] tracking draft_created error:", e);
    }

    redirect(`/publicar?id=${nuevaPostulacion.id}`);
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
      <PublicarSimpleClient
        comunas={comunas}
        regiones={regiones}
        initialPostulacionId={initialPostulacionId}
      />
    </Suspense>
  );
}