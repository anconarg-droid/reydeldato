import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { badRequest, serverError } from "@/lib/http";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import { loadEmprendedorPorTokenValido } from "@/lib/revisarMagicLink";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { validateRequiredPublicEmail } from "@/lib/validateEmail";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";
import {
  validateOptionalInstagram,
  validateOptionalWebsite,
} from "@/lib/contactoPublicoValidation";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function trunc100(v: unknown): string | null {
  const t = s(v);
  if (!t) return null;
  return t.length > 100 ? t.slice(0, 100) : t;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!s(token)) {
      return NextResponse.json(
        { ok: false, error: "token_requerido", message: "Falta el parámetro token." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const emp = await loadEmprendedorPorTokenValido(supabase, token!);
    if (!emp || !emp.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "token_invalido",
          message: "El enlace no es válido o expiró. Pedí uno nuevo al equipo.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, emprendedor: emp });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError("Error al validar el enlace", { message: msg });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = s(body.token);
    // eslint-disable-next-line no-console
    console.log("[api/revisar] payload", body);
    // eslint-disable-next-line no-console
    console.log("[api/revisar] token (body)", token);
    // eslint-disable-next-line no-console
    console.log(
      "[api/revisar] token (query)",
      s(request.nextUrl.searchParams.get("token"))
    );

    if (!token) {
      return badRequest("Falta token.");
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const current = await loadEmprendedorPorTokenValido(supabase, token);
    if (!current || !current.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "token_invalido",
          message: "El enlace no es válido o expiró.",
        },
        { status: 401 }
      );
    }

    const nombreRaw = s(body.nombreEmprendimiento);
    if (!nombreRaw) {
      return badRequest("El nombre del emprendimiento es obligatorio.");
    }
    const nombreEmprendimiento = trunc100(nombreRaw);
    if (!nombreEmprendimiento) {
      return badRequest("El nombre del emprendimiento es obligatorio.");
    }

    const fraseNorm = normalizeDescripcionCorta(
      s(body.fraseNegocio ?? body.frase_negocio),
    );
    const errFrase = validateDescripcionCortaPublicacion(fraseNorm);
    const msgFrase = primeraValidacionDescripcion(errFrase);
    if (msgFrase) {
      return badRequest(msgFrase);
    }

    const largaNorm = normalizeDescripcionLarga(
      s(body.descripcionLibre ?? body.descripcion_libre),
    );
    const errLarga = validateDescripcionLarga(largaNorm);
    const msgLarga = primeraValidacionDescripcion(errLarga);
    if (msgLarga) {
      return badRequest(msgLarga);
    }

    const emailVal = validateRequiredPublicEmail(s(body.email));
    if (!emailVal.ok) {
      return badRequest(emailVal.message);
    }

    const wa = normalizeAndValidateChileWhatsappStrict(
      s(body.whatsappPrincipal ?? body.whatsapp_principal),
    );
    if (!wa.ok) {
      return badRequest("WhatsApp inválido.");
    }

    const ig = validateOptionalInstagram(s(body.instagram));
    if (!ig.ok) {
      return badRequest(ig.message);
    }

    const web = validateOptionalWebsite(s(body.sitioWeb ?? body.sitio_web));
    if (!web.ok) {
      return badRequest(web.message);
    }

    let fotoUrl: string | null = null;
    const fotoRaw = s(body.fotoPrincipalUrl ?? body.foto_principal_url);
    if (fotoRaw) {
      if (!isPersistibleFotoUrl(fotoRaw)) {
        return badRequest("La URL de la foto principal no es válida.");
      }
      fotoUrl = fotoRaw;
    }

    const patch = {
      nombre_emprendimiento: nombreEmprendimiento,
      frase_negocio: fraseNorm,
      descripcion_libre: largaNorm || null,
      email: emailVal.normalized,
      whatsapp_principal: wa.normalized,
      instagram: ig.normalized ? trunc100(ig.normalized) : null,
      sitio_web: web.normalized ? String(web.normalized).trim() : null,
      foto_principal_url: fotoUrl,
      estado_publicacion: ESTADO_PUBLICACION.en_revision,
      clasificacion_estado: "pendiente",
      updated_at: new Date().toISOString(),
    };

    // Este handler no inserta en emprendedor_regiones_cobertura ni pivota subcategorías; solo update.
    // eslint-disable-next-line no-console
    console.log("[api/revisar] update emprendedores", {
      emprendedor_id: current.id,
      patch,
    });

    const { error } = await supabase.from("emprendedores").update(patch).eq("id", current.id);

    if (error) {
      // eslint-disable-next-line no-console
      console.log("[api/revisar] update emprendedores error", error);
      return serverError("No se pudieron guardar los cambios", { message: error.message });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Cambios guardados. Tu ficha volvió a revisión y no se mostrará hasta ser aprobada.",
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[api/revisar] ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return Response.json(
      {
        ok: false,
        error: "internal_error",
        message,
      },
      { status: 500 }
    );
  }
}
