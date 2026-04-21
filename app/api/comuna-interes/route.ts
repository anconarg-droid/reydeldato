import { NextResponse } from "next/server";
import { normalizeChileWhatsapp } from "@/lib/normalizeChileWhatsapp";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const comuna_slug = s(body?.comuna_slug);
    const nombreRaw = s(body?.nombre);
    const telefonoRaw = s(body?.telefono);
    const whatsappRaw = s(body?.whatsapp);
    const phoneRaw = telefonoRaw || whatsappRaw;

    if (!comuna_slug) {
      return NextResponse.json({ ok: false, error: "Falta comuna_slug" }, { status: 400 });
    }

    const normalized = normalizeChileWhatsapp(phoneRaw);
    if (!normalized) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingresa un WhatsApp móvil chileno válido (ej: 9 1234 5678, 56912345678 o +56912345678)",
        },
        { status: 400 }
      );
    }

    const nombre = nombreRaw.length >= 2 ? nombreRaw : null;
    if (nombreRaw.length > 0 && nombreRaw.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Si pones nombre, usa al menos 2 caracteres" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerPublicClient();
    const { error } = await supabase.from("comuna_interes").insert({
      comuna_slug,
      nombre,
      whatsapp: normalized,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, whatsapp: normalized });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
