import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacionBasica,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { POSTULACIONES_MODERACION_SELECT } from "@/lib/loadPostulacionesModeracion";
import { validateRequiredPublicEmail } from "@/lib/validateEmail";
import { sendEmail } from "@/lib/email";
import { recibimosTuSolicitudEmailHtml } from "@/lib/emailTemplates/recibimosTuSolicitudEmailHtml";

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

/** `comunas.id` puede ser bigint o UUID según esquema. */
function parseComunaBaseId(raw: unknown): number | string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const t = s(raw);
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  return t;
}

async function resolveRegionSlugFromComunaId(
  comunaId: number | string
): Promise<string> {
  const { data: comuna, error: comunaError } = await supabase
    .from("comunas")
    .select("region_id")
    .eq("id", comunaId)
    .maybeSingle();

  if (comunaError) {
    throw new Error(`Error obteniendo regi?n de comuna: ${comunaError.message}`);
  }

  const rid = (comuna as { region_id?: unknown } | null)?.region_id;
  const regionId =
    rid === null || rid === undefined || rid === ""
      ? null
      : typeof rid === "number"
        ? rid
        : Number(rid);

  if (regionId == null || !Number.isFinite(regionId)) return "";

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

    const aceptaLegal = body?.acepta_terminos_privacidad === true;
    if (!aceptaLegal) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debes aceptar los Términos y Condiciones y la Política de Privacidad para publicar.",
        },
        { status: 400 }
      );
    }

    const { data: draft, error: draftError } = await supabase
      .from("postulaciones_emprendedores")
      .select(POSTULACIONES_MODERACION_SELECT)
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

    const row = draft as unknown as Record<string, unknown>;

    if (s(row.estado).toLowerCase() === "aprobada") {
      return NextResponse.json(
        { ok: false, error: "Esta postulaci?n ya fue aprobada" },
        { status: 400 }
      );
    }

    const nombreEmprendimiento = s(row.nombre_emprendimiento);
    const fraseNegocioNorm = normalizeDescripcionCorta(s(row.frase_negocio));
    const whatsappPrincipal = s(row.whatsapp_principal);
    const comunaBaseId = parseComunaBaseId(row.comuna_base_id);

    const coberturaTipo = normalizeCoberturaTipo(s(row.cobertura_tipo));
    let comunasCobertura = dedupe(arr(row.comunas_cobertura));
    let regionesCobertura = dedupe(arr(row.regiones_cobertura));

    // Publicación básica: solo datos mínimos (no locales, dirección, modalidades ni ficha completa).
    if (!nombreEmprendimiento) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre_emprendimiento" },
        { status: 400 }
      );
    }

    const emailCheck = validateRequiredPublicEmail(s(row.email));
    if (!emailCheck.ok) {
      return NextResponse.json(
        { ok: false, error: emailCheck.message },
        { status: 400 }
      );
    }
    const emailNorm = emailCheck.normalized;

    if (!whatsappPrincipal) {
      return NextResponse.json(
        { ok: false, error: "Falta whatsapp_principal" },
        { status: 400 }
      );
    }

    const errCorta = validateDescripcionCortaPublicacionBasica(fraseNegocioNorm);
    const msgCorta = primeraValidacionDescripcion(errCorta);
    if (msgCorta) {
      return NextResponse.json(
        { ok: false, error: msgCorta, errors: errCorta },
        { status: 400 }
      );
    }

    const descLibreRaw = s(row.descripcion_libre);
    if (descLibreRaw) {
      const largaN = normalizeDescripcionLarga(descLibreRaw);
      const errLarga = validateDescripcionLarga(largaN);
      const msgLarga = primeraValidacionDescripcion(errLarga);
      if (msgLarga) {
        return NextResponse.json(
          { ok: false, error: msgLarga, errors: errLarga },
          { status: 400 }
        );
      }
    }

    if (comunaBaseId === null) {
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
      if (!comunasCobertura.length) {
        const { data: cbRow } = await supabase
          .from("comunas")
          .select("slug")
          .eq("id", comunaBaseId)
          .maybeSingle();
        const baseSlug = s((cbRow as { slug?: unknown } | null)?.slug);
        if (baseSlug) comunasCobertura = [baseSlug];
      }
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

    const draftUpdateBase: Record<string, unknown> = {
      estado: "pendiente_revision" as const,
      nombre_emprendimiento: nombreEmprendimiento,
      email: emailNorm,
      whatsapp_principal: whatsappPrincipal,
      frase_negocio: fraseNegocioNorm,
      comuna_base_id: comunaBaseId,
      cobertura_tipo: coberturaTipo,
      comunas_cobertura: comunasCobertura,
      regiones_cobertura: regionesCobertura,
      categoria_id: null,
      subcategorias_ids: null,
    };

    const { error: updateDraftError } = await supabase
      .from("postulaciones_emprendedores")
      .update(draftUpdateBase)
      .eq("id", draftId);

    if (updateDraftError) {
      return NextResponse.json(
        { ok: false, error: updateDraftError.message },
        { status: 500 }
      );
    }

    // Email de confirmación (no bloquea el flujo si falla).
    try {
      await sendEmail({
        to: emailNorm,
        subject: "Recibimos tu solicitud — Rey del Dato",
        html: recibimosTuSolicitudEmailHtml(),
      });
    } catch {
      // Errores ya se registran dentro de sendEmail; nunca romper flujo.
    }

    return NextResponse.json({
      ok: true,
      draft_id: draftId,
      estado: "pendiente_revision",
      message:
        "Tu emprendimiento está en revisión. Te avisaremos cuando esté publicado.",
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