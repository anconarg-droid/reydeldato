import { NextRequest, NextResponse } from "next/server";
import { getSimilaresBySlug } from "@/lib/getSimilaresBySlug";

export const runtime = "nodejs";
function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = s(params?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    const { items, meta } = await getSimilaresBySlug(slug);
    return NextResponse.json({ ok: true, items, meta });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
