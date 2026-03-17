import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;

  const { data, error } = await supabase
    .from("vw_subcategorias_relacionadas")
    .select("sugerida_slug, sugerida_nombre")
    .eq("subcategoria_actual", slug)
    .limit(6);

  if (error) {
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({
    ok: true,
    sugerencias: data ?? [],
  });
}