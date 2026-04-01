import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data, error } = await supabase
      .from("comunas")
      .select("id, nombre, slug, region_id")
      .ilike("nombre", `%${q}%`)
      .order("nombre", { ascending: true })
      .limit(15);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error buscando comunas" },
      { status: 500 }
    );
  }
}