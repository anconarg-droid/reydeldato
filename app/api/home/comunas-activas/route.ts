import { NextResponse } from "next/server";
import { getHomeComunasActivasItems } from "@/lib/getHomeComunasActivasItems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const res = await getHomeComunasActivasItems();
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.error, items: [] },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, items: res.items });
}
