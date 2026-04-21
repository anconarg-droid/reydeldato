import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { validateRequiredPublicEmail } from "@/lib/validateEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => s(x)).filter(Boolean);
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nombre_emprendimiento =
      s(body?.nombre_emprendimiento) ||
      s(body?.nombre) ||
      s(body?.nombreNegocio);

    const responsable_nombre =
      s(body?.responsable_nombre) ||
      s(body?.responsable) ||
      s(body?.responsableNombre);

    const mostrar_responsable =
      typeof body?.mostrar_responsable === "boolean"
        ? body.mostrar_responsable
        : typeof body?.mostrarResponsable === "boolean"
        ? body.mostrarResponsable
        : false;

    const email = s(body?.email);
    const whatsapp = s(body?.whatsapp);
    const instagram = s(body?.instagram);
    const web = s(body?.web);

    const comuna_base_slug =
      s(body?.comuna_base_slug) ||
      s(body?.comunaBaseSlug);

    const nivel_cobertura =
      s(body?.nivel_cobertura) ||
      s(body?.cobertura_tipo) ||
      s(body?.coberturaTipo);

    const comunas_cobertura_slugs =
      arr(body?.comunas_cobertura_slugs).length > 0
        ? arr(body?.comunas_cobertura_slugs)
        : arr(body?.comunasCoberturaSlugs);

    const categoria_slug =
      s(body?.categoria_slug) ||
      s(body?.categoriaSlug);

    const subcategorias_slugs =
      arr(body?.subcategorias_slugs).length > 0
        ? arr(body?.subcategorias_slugs)
        : arr(body?.subcategoriasSlugs);

    const descripcion_corta = normalizeDescripcionCorta(
      s(body?.descripcion_corta) || s(body?.descripcionCorta),
    );

    const descripcion_larga = normalizeDescripcionLarga(
      s(body?.descripcion_larga) || s(body?.descripcionLarga),
    );

    if (!nombre_emprendimiento) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre_emprendimiento" },
        { status: 400 }
      );
    }

    if (!responsable_nombre) {
      return NextResponse.json(
        { ok: false, error: "Falta responsable_nombre" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Falta email" },
        { status: 400 }
      );
    }

    const emailVal = validateRequiredPublicEmail(email);
    if (!emailVal.ok) {
      return NextResponse.json(
        { ok: false, error: "email_invalido", message: emailVal.message },
        { status: 400 }
      );
    }

    if (!whatsapp) {
      return NextResponse.json(
        { ok: false, error: "Falta whatsapp" },
        { status: 400 }
      );
    }

    if (!comuna_base_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna_base_slug" },
        { status: 400 }
      );
    }

    if (!nivel_cobertura) {
      return NextResponse.json(
        { ok: false, error: "Falta nivel_cobertura" },
        { status: 400 }
      );
    }

    if (!categoria_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta categoria_slug" },
        { status: 400 }
      );
    }

    const errDesc = [
      ...validateDescripcionCortaPublicacion(descripcion_corta),
      ...validateDescripcionLarga(descripcion_larga),
    ];
    const msgDesc = primeraValidacionDescripcion(errDesc);
    if (msgDesc) {
      return NextResponse.json(
        { ok: false, error: msgDesc, message: msgDesc, errors: errDesc },
        { status: 400 }
      );
    }

    const payload = {
      nombre_emprendimiento,
      responsable_nombre,
      mostrar_responsable,
      email: emailVal.normalized,
      whatsapp,
      instagram: instagram || null,
      web: web || null,
      comuna_base_slug,
      nivel_cobertura,
      comunas_cobertura_slugs,
      categoria_slug,
      subcategorias_slugs,
      descripcion_corta,
      descripcion_larga: descripcion_larga.trim() ? descripcion_larga : null,
      estado: "pendiente",
    };

    const { data, error } = await supabase
      .from("emprendedores_pendientes")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.log("SUPABASE ERROR:", error);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Emprendimiento enviado correctamente a revisión",
      item: data,
    });
  } catch (err) {
    console.log("SERVER ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}