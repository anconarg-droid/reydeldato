import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type ComunaRow = {
  nombre?: string;
  slug?: string;
  regiones?: { nombre?: string } | { nombre?: string }[] | null;
};

function regionNombreFromRow(item: ComunaRow): string {
  const r = item.regiones;
  if (r == null) return "";
  if (Array.isArray(r)) return s((r[0] as { nombre?: string } | undefined)?.nombre);
  return s((r as { nombre?: string }).nombre);
}

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function norm(v: unknown): string {
  return s(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "config",
          message: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 503 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const q = s(new URL(req.url).searchParams.get("q"));

    if (q.length < 2) {
      return NextResponse.json({
        ok: true,
        comunas: [],
      });
    }

    /**
     * Región vía FK `region_id` → `regiones` (mismo patrón que getEmprendedorPublicoBySlug).
     * No usa la columna opcional `comunas.region` (puede no existir).
     */
    let rawRows: ComunaRow[] = [];
    {
      const { data, error } = await supabase
        .from("comunas")
        .select("nombre, slug, regiones(nombre)")
        .order("nombre", { ascending: true });

      if (!error && Array.isArray(data)) {
        rawRows = data as ComunaRow[];
      } else if (error) {
        const { data: dataPlain, error: errPlain } = await supabase
          .from("comunas")
          .select("nombre, slug")
          .order("nombre", { ascending: true });
        if (errPlain) {
          return NextResponse.json(
            {
              ok: false,
              error: "supabase_error",
              message: errPlain.message,
            },
            { status: 500 }
          );
        }
        rawRows = (dataPlain || []) as ComunaRow[];
      }
    }

    const qq = norm(q);

    const filtered = rawRows.filter((item) => {
      const nombre = norm(item.nombre);
      const slug = norm(item.slug);
      const region = norm(regionNombreFromRow(item));
      return (
        nombre.startsWith(qq) ||
        nombre.includes(qq) ||
        slug.startsWith(qq) ||
        slug.includes(qq) ||
        region.includes(qq)
      );
    });

    const comunas = filtered
      .sort((a, b) => {
        const na = norm(a.nombre);
        const nb = norm(b.nombre);
        const aStart = na.startsWith(qq) ? 0 : 1;
        const bStart = nb.startsWith(qq) ? 0 : 1;
        if (aStart !== bStart) return aStart - bStart;
        return na.localeCompare(nb, "es");
      })
      .slice(0, 12)
      .map((item) => ({
        nombre: s(item.nombre),
        slug: s(item.slug),
        region_nombre: regionNombreFromRow(item),
      }));

    return NextResponse.json({
      ok: true,
      comunas,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "comunas_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}