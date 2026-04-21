import { NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import {
  formatChileWhatsappDisplay,
  normalizeAndValidateChileWhatsappStrict,
} from "@/utils/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function auditLog(phase: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.warn("[recomendaciones-audit]", phase, JSON.stringify(payload));
}

/** Mismo tipo que `public.comunas.id` (FK); no limitar a UUID. */
function comunaIdParaInsert(comunaRow: { id?: unknown } | null): unknown {
  const id = comunaRow?.id;
  if (id == null || String(id).trim() === "") return undefined;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  const n = Number(id);
  if (Number.isFinite(n)) return n;
  return id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    auditLog("body_raw_keys", {
      keys: body && typeof body === "object" ? Object.keys(body as object) : [],
    });

    const nombre_emprendimiento = s(body?.nombre_emprendimiento);
    const servicio_texto_raw = s(body?.servicio_texto);
    const comuna_slug = s(body?.comuna_slug);
    const contacto = s(body?.contacto);

    if (!nombre_emprendimiento || nombre_emprendimiento.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Falta el nombre del emprendimiento." },
        { status: 400 }
      );
    }

    if (!comuna_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta la comuna." },
        { status: 400 }
      );
    }

    if (!contacto) {
      return NextResponse.json(
        { ok: false, error: "Falta el contacto del emprendimiento." },
        { status: 400 }
      );
    }

    const wa = normalizeAndValidateChileWhatsappStrict(contacto);
    let contactoFinal = contacto;
    if (wa.ok) {
      contactoFinal = formatChileWhatsappDisplay(wa.normalized);
    } else {
      const digitCount = contacto.replace(/\D/g, "").length;
      if (digitCount >= 8) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El contacto no es un WhatsApp chileno válido. Usa 9 1234 5678 o +56912345678, o un usuario de Instagram (@nombre).",
          },
          { status: 400 }
        );
      }
    }

    const supabase = createSupabaseServerPublicClient();

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id,nombre")
      .eq("slug", comuna_slug)
      .maybeSingle();

    if (comunaError) {
      return NextResponse.json(
        { ok: false, error: `Error buscando comuna: ${comunaError.message}` },
        { status: 500 }
      );
    }

    if (!comuna) {
      return NextResponse.json(
        { ok: false, error: "No encontramos la comuna seleccionada." },
        { status: 400 }
      );
    }

    const comunaRow = comuna as { id: unknown; nombre?: string } | null;
    const insertRow: Record<string, unknown> = {
      nombre_emprendimiento,
      whatsapp: contactoFinal,
      servicio: servicio_texto_raw || null,
      comuna: s(comunaRow?.nombre) || comuna_slug,
    };
    const cid = comunaIdParaInsert(comunaRow);
    if (cid !== undefined) {
      insertRow.comuna_id = cid;
    }

    auditLog("insert_row", {
      has_comuna_id: insertRow.comuna_id !== undefined,
      comuna_id_type: insertRow.comuna_id !== undefined ? typeof insertRow.comuna_id : null,
      nombre_len: nombre_emprendimiento.length,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("recomendaciones_emprendedores")
      .insert(insertRow)
      .select("id")
      .maybeSingle();

    if (insertError) {
      auditLog("insert_error", {
        message: insertError.message,
        code: (insertError as { code?: string }).code,
        details: (insertError as { details?: string }).details,
        hint: (insertError as { hint?: string }).hint,
      });
      return NextResponse.json(
        { ok: false, error: `No pudimos guardar la recomendación: ${insertError.message}` },
        { status: 500 }
      );
    }

    auditLog("insert_ok", {
      id: inserted && typeof inserted === "object" ? (inserted as { id?: unknown }).id : null,
    });

    return NextResponse.json({
      ok: true,
      id:
        inserted && typeof inserted === "object" && (inserted as { id?: unknown }).id != null
          ? String((inserted as { id: unknown }).id)
          : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado.",
      },
      { status: 500 }
    );
  }
}

