import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "server_misconfigured", items: [] },
      { status: 500 }
    );
  }

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