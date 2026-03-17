import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const comuna = (url.searchParams.get("comuna") || "").trim();

    const base = supabase
      .from("emprendedores")
      .select("id", { count: "exact", head: true })
      .eq("estado_publicacion", "publicado");

    const { count, error } = comuna
      ? await base.eq("comuna_base_slug", comuna)
      : await base;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      total: count ?? 0,
      scope: comuna ? "comuna" : "global",
      comuna_slug: comuna || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "stats_emprendedores_error",
      },
      { status: 500 }
    );
  }
}

