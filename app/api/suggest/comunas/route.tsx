import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ComunaRow = {
  nombre?: string;
  slug?: string;
  region_nombre?: string;
};

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
    const q = s(new URL(req.url).searchParams.get("q"));

    if (q.length < 2) {
      return NextResponse.json({
        ok: true,
        comunas: [],
      });
    }

    const { data, error } = await supabase
      .from("vw_comunas_busqueda")
      .select("nombre,slug,region_nombre")
      .order("nombre", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "supabase_error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    const qq = norm(q);

    const filtered = ((data || []) as ComunaRow[]).filter((item) => {
      const nombre = norm(item.nombre);
      const slug = norm(item.slug);
      const region = norm(item.region_nombre);
      return (
        nombre.startsWith(qq) ||
        nombre.includes(qq) ||
        slug.startsWith(qq) ||
        slug.includes(qq) ||
        region.includes(qq)
      );
    });

    // Priorizar coincidencia por inicio del nombre
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
        region_nombre: s(item.region_nombre),
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