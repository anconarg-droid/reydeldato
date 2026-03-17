import { NextRequest, NextResponse } from "next/server";
import { incrementCommuneActivity } from "@/lib/commune-activity";

type Body = { slug?: string; type?: string };

/**
 * POST /api/cobertura/activity
 * Body: { slug: string, type: 'share' | 'invite' }
 * Incrementa shares o invites para la comuna (crea fila si no existe).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const type = typeof body?.type === "string" ? body.type.trim().toLowerCase() : "";

    if (!slug) {
      return NextResponse.json({ ok: false, error: "slug requerido" }, { status: 400 });
    }

    if (type === "share") {
      await incrementCommuneActivity(slug, "shares");
      return NextResponse.json({ ok: true });
    }
    if (type === "invite") {
      await incrementCommuneActivity(slug, "invites");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "type debe ser 'share' o 'invite'" }, { status: 400 });
  } catch (e) {
    console.error("[cobertura/activity] POST error:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
