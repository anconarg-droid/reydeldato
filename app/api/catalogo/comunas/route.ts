import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("vw_comunas_busqueda")
    .select("nombre,slug,display_name")
    .order("nombre");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, items: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    items: data || [],
  });
}