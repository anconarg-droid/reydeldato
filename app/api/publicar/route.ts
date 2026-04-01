import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CoberturaTipo =
  | "solo_comuna"
  | "varias_comunas"
  | "varias_regiones"
  | "nacional";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((x) => s(x)).filter(Boolean))];
}

function isMissingKeywordsUsuarioColumn(err: {
  message?: string;
  code?: string;
}): boolean {
  const m = String(err.message ?? "").toLowerCase();
  return (
    err.code === "PGRST204" ||
    (m.includes("schema cache") &&
      m.includes("keywords") &&
      m.includes("usuario"))
  );
}

function normalizeCoberturaTipo(raw: string): CoberturaTipo | "" {
  const x = s(raw).toLowerCase();

  if (x === "solo_comuna" || x === "solo_mi_comuna" || x === "comuna") {
    return "solo_comuna";
  }
  if (x === "varias_comunas") return "varias_comunas";
  if (x === "varias_regiones" || x === "regional") return "varias_regiones";
  if (x === "nacional") return "nacional";

  return "";
}

function normalizeModalidades(raw: unknown): string[] {
  const values = arr(raw).map((x) => x.toLowerCase());

  const mapped = values
    .map((x) => {
      if (x === "local_fisico" || x === "local") return "local";
      if (x === "domicilio" || x === "presencial") return "presencial";
      if (x === "online") return "online";
      return "";
    })
    .filter(Boolean);

  return dedupe(mapped);
}

async function resolveRegionSlugFromComunaId(comunaId: number): Promise<string> {
  const { data: comuna, error: comunaError } = await supabase
    .from("comunas")
    .select("region_id")
    .eq("id", comunaId)
    .maybeSingle();

  if (comunaError) {
    throw new Error(`Error obteniendo regi?n de comuna: ${comunaError.message}`);
  }

  const regionId =
    comuna && typeof (comuna as { region_id?: unknown }).region_id === "number"
      ? (comuna as { region_id: number }).region_id
      : null;

  if (!regionId) return "";

  const { data: region, error: regionError } = await supabase
    .from("regiones")
    .select("slug")
    .eq("id", regionId)
    .maybeSingle();

  if (regionError) {
    throw new Error(`Error obteniendo slug de regi?n: ${regionError.message}`);
  }

  return region && typeof (region as { slug?: unknown }).slug === "string"
    ? s((region as { slug: string }).slug)
    : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draftId = s(body?.draft_id);

    if (!draftId) {
      return NextResponse.json(
        { ok: false, error: "Falta draft_id" },
        { status: 400 }
      );
    }

    const { data: draft, error: draftError } = await supabase
      .from("postulaciones_emprendedores")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    if (draftError) {
      return NextResponse.json(
        { ok: false, error: draftError.message },
        { status: 500 }
      );
    }

    if (!draft) {
      return NextResponse.json(
        { ok: false, error: "Postulaci?n no encontrada" },
        { status: 404 }
      );
    }

    const row = draft as Record<string, unknown>;

    if (s(row.estado).toLowerCase() === "aprobada") {
      return NextResponse.json(
        { ok: false, error: "Esta postulaci?n ya fue aprobada" },
        { status: 400 }
      );
    }

    const nombreEmprendimiento = s(row.nombre_emprendimiento);
    const fraseNegocio = s(row.frase_negocio);
    const whatsappPrincipal = s(row.whatsapp_principal);
    const keywordsUsuario = arr(row.keywords_usuario);

    const comunaBaseId =
      row.comuna_base_id === null || row.comuna_base_id === undefined
        ? null
        : Number(row.comuna_base_id);

    const coberturaTipo = normalizeCoberturaTipo(s(row.cobertura_tipo));
    let comunasCobertura = dedupe(arr(row.comunas_cobertura));
    let regionesCobertura = dedupe(arr(row.regiones_cobertura));

    // Validaci?n ficha b?sica m?nima
    if (!nombreEmprendimiento) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre_emprendimiento" },
        { status: 400 }
      );
    }

    if (!whatsappPrincipal) {
      return NextResponse.json(
        { ok: false, error: "Falta whatsapp_principal" },
        { status: 400 }
      );
    }

    if (!fraseNegocio) {
      return NextResponse.json(
        { ok: false, error: "Falta frase_negocio" },
        { status: 400 }
      );
    }

    if (!comunaBaseId || !Number.isFinite(comunaBaseId)) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna_base_id v?lido" },
        { status: 400 }
      );
    }

    if (!coberturaTipo) {
      return NextResponse.json(
        { ok: false, error: "Falta cobertura_tipo v?lido" },
        { status: 400 }
      );
    }

    // Normalizaci?n cobertura
    if (coberturaTipo === "solo_comuna") {
      comunasCobertura = [];
      regionesCobertura = [];
    } else if (coberturaTipo === "varias_comunas") {
      regionesCobertura = [];
    } else if (coberturaTipo === "varias_regiones") {
      comunasCobertura = [];
      if (!regionesCobertura.length) {
        const regionSlug = await resolveRegionSlugFromComunaId(comunaBaseId);
        regionesCobertura = regionSlug ? [regionSlug] : [];
      }
    } else if (coberturaTipo === "nacional") {
      comunasCobertura = [];
      regionesCobertura = [];
    }

    const draftUpdateBase = {
      estado: "pendiente_revision" as const,
      nombre_emprendimiento: nombreEmprendimiento,
      whatsapp_principal: whatsappPrincipal,
      frase_negocio: fraseNegocio,
      keywords_usuario: keywordsUsuario.length ? keywordsUsuario : null,
      comuna_base_id: comunaBaseId,
      cobertura_tipo: coberturaTipo,
      comunas_cobertura: comunasCobertura,
      regiones_cobertura: regionesCobertura,
      categoria_id: null,
      subcategorias_ids: null,
    };

    let { error: updateDraftError } = await supabase
      .from("postulaciones_emprendedores")
      .update(draftUpdateBase)
      .eq("id", draftId);

    if (
      updateDraftError &&
      draftUpdateBase.keywords_usuario != null &&
      isMissingKeywordsUsuarioColumn(updateDraftError)
    ) {
      console.warn(
        "[POST publicar] Sin columna keywords_usuario; actualización sin ese campo. Migración: 20260330010100_postulaciones_keywords_usuario.sql"
      );
      const { keywords_usuario: _k, ...sinKw } = draftUpdateBase;
      const retry = await supabase
        .from("postulaciones_emprendedores")
        .update(sinKw)
        .eq("id", draftId);
      updateDraftError = retry.error;
    }

    if (updateDraftError) {
      return NextResponse.json(
        { ok: false, error: updateDraftError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      draft_id: draftId,
      estado: "pendiente_revision",
      message: "Postulación enviada a revisión",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}