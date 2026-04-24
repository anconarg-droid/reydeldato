import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Resuelve `comunas.id` desde `slug` (guardado en formularios del panel). */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 }
      );
    }

    const slug = s(req.nextUrl.searchParams.get("slug"));
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Falta slug" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("comunas")
      .select("id, slug, nombre")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Comuna no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      slug: data.slug,
      nombre: data.nombre,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error al resolver comuna",
      },
      { status: 500 }
    );
  }
}
