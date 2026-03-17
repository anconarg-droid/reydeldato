import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const comuna_slug = s(formData.get("comuna_slug"));
    const estado_apertura = s(formData.get("estado_apertura")).toLowerCase();

    if (!comuna_slug) {
      return NextResponse.redirect(new URL("/admin/comunas", req.url));
    }

    if (!["activa", "en_preparacion"].includes(estado_apertura)) {
      return NextResponse.redirect(new URL("/admin/comunas", req.url));
    }

    const { error } = await supabase
      .from("comunas_activas")
      .upsert(
        {
          comuna_slug,
          estado_apertura,
        },
        { onConflict: "comuna_slug" }
      );

    if (error) {
      console.error("Error actualizando estado_apertura:", error);
    }

    return NextResponse.redirect(new URL("/admin/comunas", req.url));
  } catch (error) {
    console.error("Error admin/comunas/estado:", error);
    return NextResponse.redirect(new URL("/admin/comunas", req.url));
  }
}

