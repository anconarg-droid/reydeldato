import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const query = String(req.nextUrl.searchParams.get("query") || "").trim();

    const supabase = createSupabaseServerClient();

    let sql = supabase
      .from("comunas")
      .select("nombre, slug")
      .order("nombre", { ascending: true })
      .limit(8);

    if (query) {
      sql = sql.ilike("nombre", `%${query}%`);
    }

    const { data, error } = await sql;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
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