import { NextResponse } from "next/server";
import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import { comunaPublicaAbierta } from "@/lib/comunaPublicaAbierta";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Misma regla que `app/abrir-comuna/[slug]/page.tsx` (redirect a /[slug] si el directorio ya es público).
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Falta slug" }, { status: 400 });
  }

  const supabase = createSupabaseServerPublicClient();

  const { data: comunaRow } = await supabase
    .from("comunas")
    .select("id, forzar_abierta")
    .eq("slug", slug)
    .maybeSingle();

  if (!comunaRow?.id) {
    return NextResponse.json({ ok: true, directorio_publico: false });
  }

  const { data: config } = await supabase
    .from("comunas_config")
    .select("activa")
    .eq("comuna_id", comunaRow.id)
    .maybeSingle();

  const { data: vwRow } = await supabase
    .from(VW_APERTURA_COMUNA_V2)
    .select("porcentaje_apertura, abierta")
    .eq("comuna_slug", slug)
    .maybeSingle();

  const vw = vwRow
    ? {
        porcentaje_apertura: Number(
          (vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0
        ),
        abierta: (vwRow as { abierta?: unknown }).abierta,
      }
    : null;

  const directorio_publico =
    config?.activa !== false &&
    comunaPublicaAbierta(
      (comunaRow as { forzar_abierta?: unknown }).forzar_abierta,
      vw
    );

  return NextResponse.json({ ok: true, directorio_publico });
}
