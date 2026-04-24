import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

type EmprendedorRow = {
  comuna_id: number | null;
};

type ComunaRow = {
  id: number;
  nombre: string;
  slug: string;
  region_id: number | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured", items: [] },
        { status: 500 }
      );
    }

    const { data: emprendedores, error: emprendedoresError } = await supabase
      .from("emprendedores")
      .select("comuna_id")
      .eq("estado_publicacion", "publicado");

    if (emprendedoresError) {
      return NextResponse.json(
        { ok: false, error: emprendedoresError.message },
        { status: 500 }
      );
    }

    const conteoPorComuna = new Map<number, number>();

    for (const row of (emprendedores || []) as EmprendedorRow[]) {
      if (!row.comuna_id) continue;
      conteoPorComuna.set(
        row.comuna_id,
        (conteoPorComuna.get(row.comuna_id) || 0) + 1
      );
    }

    const comunaIds = Array.from(conteoPorComuna.keys());

    if (comunaIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data: comunas, error: comunasError } = await supabase
      .from("comunas")
      .select("id, nombre, slug, region_id")
      .in("id", comunaIds)
      .order("nombre", { ascending: true });

    if (comunasError) {
      return NextResponse.json(
        { ok: false, error: comunasError.message },
        { status: 500 }
      );
    }

    const items = ((comunas || []) as ComunaRow[]).map((comuna) => ({
      id: comuna.id,
      nombre: comuna.nombre,
      slug: comuna.slug,
      region_id: comuna.region_id || undefined,
      total: conteoPorComuna.get(comuna.id) || 0,
    }));

    items.sort((a, b) => {
      if ((b.total || 0) !== (a.total || 0)) {
        return (b.total || 0) - (a.total || 0);
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("Error en /api/comunas/activas:", error);
    return NextResponse.json(
      { ok: false, error: "Error cargando comunas activas" },
      { status: 500 }
    );
  }
}