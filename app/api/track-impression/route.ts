import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordEvent } from "@/lib/analytics/recordEvent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slugs = Array.isArray(body?.slugs) ? body.slugs : [];
    const comuna_slug = body?.comuna_slug != null ? s(body.comuna_slug) : null;
    const sector_slug = body?.sector_slug != null ? s(body.sector_slug) : null;
    const q = body?.q != null ? s(body.q) : null;
    const session_id = body?.session_id ? s(body.session_id) : null;

    const cleanSlugs = slugs
      .map((slug: unknown) => String(slug || "").trim())
      .filter(Boolean);

    if (!cleanSlugs.length) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // No bloquear la respuesta: procesar en segundo plano
    processImpressions(
      cleanSlugs,
      { comuna_slug, sector_slug, q, session_id }
    ).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("track-impression error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function processImpressions(
  cleanSlugs: string[],
  ctx: {
    comuna_slug: string | null;
    sector_slug: string | null;
    q: string | null;
    session_id: string | null;
  }
) {
  const { data: items, error: findError } = await supabase
    .from("emprendedores")
    .select("id, slug, impresiones_busqueda")
    .in("slug", cleanSlugs)
    .eq("estado_publicacion", "publicado");

  if (findError || !items?.length) {
    console.error("track-impression fetch:", findError);
    return;
  }

  const metadata = {
    comuna_slug: ctx.comuna_slug ?? null,
    sector_slug: ctx.sector_slug ?? null,
    q: ctx.q ?? null,
    session_id: ctx.session_id ?? null,
  };

  for (const item of items) {
    const current = Number(item.impresiones_busqueda || 0);
    supabase
      .from("emprendedores")
      .update({ impresiones_busqueda: current + 1 })
      .eq("slug", item.slug)
      .then(({ error }) => {
        if (error) console.error("track-impression update:", item.slug, error);
      });

    recordEvent(supabase, {
      event_type: "search_result_impression",
      emprendedor_id: item.id,
      slug: item.slug,
      session_id: ctx.session_id ?? undefined,
      metadata,
    }).catch((err) => console.error("track-impression recordEvent:", item.slug, err));
  }
}