import { NextRequest, NextResponse } from "next/server";

// MVP: en memoria (temporal). Después lo mandamos a Supabase.
const COUNTS = (globalThis as any).__EVENTS__ ?? new Map<string, number>();
(globalThis as any).__EVENTS__ = COUNTS;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const type = body?.type; // "view" | "whatsapp" | "call" | "share"

  if (!id || !type) return NextResponse.json({ ok: false }, { status: 400 });

  const key = `${id}:${type}`;
  COUNTS.set(key, (COUNTS.get(key) ?? 0) + 1);

  return NextResponse.json({ ok: true });
}