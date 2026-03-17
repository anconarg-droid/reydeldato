import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("comunas_activas")
      .select("comuna_slug, comuna_nombre, activa, orden")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .order("comuna_nombre", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "supabase_error",
          message: error.message,
          items: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado cargando comunas activas.",
        items: [],
      },
      { status: 500 }
    );
  }
}