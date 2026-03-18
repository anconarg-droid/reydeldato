import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * POST /api/publicar/borrador
 * Crea un registro en emprendedores con estado = borrador, form_completo = false.
 * Devuelve { id, slug } para usar en autosave y envío final.
 */
export async function POST(_req: NextRequest) {
  try {
    const slug = `borrador-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: primeraComuna } = await supabase
      .from("comunas")
      .select("id, nombre, slug")
      .limit(1)
      .maybeSingle();

    const comunaBaseId = primeraComuna?.id ?? null;
    const comunaSlug = primeraComuna?.slug ?? "";
    const comunaNombre = primeraComuna?.nombre ?? "";

    if (!comunaBaseId) {
      return NextResponse.json(
        { ok: false, error: "No hay comunas en el sistema." },
        { status: 500 }
      );
    }

    const payloadCompleto = {
      slug,
      nombre: "",
      descripcion_corta: "",
      descripcion_larga: null,
      categoria_id: null,
      comuna_base_id: comunaBaseId,
      direccion: null,
      // estándar nuevo (compat DB: la app acepta también "solo_mi_comuna")
      nivel_cobertura: "comuna",
      cobertura: "comuna",
      coverage_keys: [comunaSlug],
      coverage_labels: [comunaNombre],
      modalidades_atencion: [],
      whatsapp: "",
      instagram: null,
      sitio_web: null,
      web: null,
      email: "",
      responsable_nombre: "",
      mostrar_responsable: true,
      keywords: [],
      tipo_actividad: null,
      sector_slug: null,
      tags_slugs: null,
      keywords_clasificacion: null,
      clasificacion_confianza: null,
      clasificacion_fuente: null,
      foto_principal_url: "",
      galeria_urls: [],
      estado: "borrador",
      estado_publicacion: "borrador",
      form_completo: false,
      ultimo_avance: new Date().toISOString(),
      origen_registro: "form_publicar",
    };

    let result = await supabase
      .from("emprendedores")
      .insert(payloadCompleto)
      .select("id, slug")
      .single();

    if (result.error && result.error.code === "PGRST204") {
      const { form_completo: _fc, ultimo_avance: _ua, origen_registro: _or, ...payloadSinColumnas } = payloadCompleto;
      result = await supabase
        .from("emprendedores")
        .insert(payloadSinColumnas)
        .select("id, slug")
        .single();
    }

    const { data: inserted, error } = result;
    if (error) {
      console.error("[publicar/borrador] insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: inserted.id,
      slug: inserted.slug,
    });
  } catch (e) {
    console.error("[publicar/borrador] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error al crear borrador" },
      { status: 500 }
    );
  }
}
