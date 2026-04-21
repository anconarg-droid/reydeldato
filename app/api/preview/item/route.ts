import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { loadEmprendedorPorTokenValido } from "@/lib/revisarMagicLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/preview/item?id=<emprendedor_uuid>&token=<access_token opaco>
 * También acepta `access_token` como alias de `token` (mismo valor en emprendedores.access_token).
 * Tras validar token + id, delega en GET /api/panel/negocio (misma forma de ítem que el panel).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const token = String(
    url.searchParams.get("token") ?? url.searchParams.get("access_token") ?? "",
  ).trim();

  if (!id || !token) {
    return NextResponse.json(
      { ok: false, error: "missing_params", message: "Faltan id o token." },
      { status: 400 },
    );
  }

  try {
    const admin = getSupabaseAdminFromEnv();
    const row = await loadEmprendedorPorTokenValido(admin, token);
    if (!row || String(row.id) !== id) {
      return NextResponse.json(
        { ok: false, error: "forbidden", message: "Enlace no válido o vencido." },
        { status: 403 },
      );
    }

    const origin = url.origin;
    const panelUrl = `${origin}/api/panel/negocio?id=${encodeURIComponent(id)}`;
    const res = await fetch(panelUrl, { cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "server_error", message },
      { status: 500 },
    );
  }
}
