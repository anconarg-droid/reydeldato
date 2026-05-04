import { NextRequest, NextResponse } from "next/server";
import { normalizeText } from "@/lib/search/normalizeText";
import { searchEmprendedoresGlobalAlgolia } from "@/lib/search/searchEmprendedoresGlobalAlgolia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Búsqueda global (sin comuna), p. ej. `scope=nacional` desde listados por comuna.
 * Misma pila que `/resultados`: Algolia + hidrata `BuscarApiItem`.
 */
export async function GET(req: NextRequest) {
  const qRaw = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const q = normalizeText(qRaw);
  if (!q) {
    return NextResponse.json({ ok: false, error: "Parámetro q requerido." }, { status: 400 });
  }
  const scope = (req.nextUrl.searchParams.get("scope") ?? "").trim().toLowerCase();
  if (scope && scope !== "nacional") {
    return NextResponse.json(
      { ok: false, error: "Solo se admite scope=nacional." },
      { status: 400 },
    );
  }

  const r = await searchEmprendedoresGlobalAlgolia(q, 24, { regionSlug: null });
  return NextResponse.json({
    ok: true,
    items: r.items,
    error: r.error,
  });
}
