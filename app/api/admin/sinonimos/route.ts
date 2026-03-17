import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cleanTerm(value: string) {
  return (value ?? "")
    .toString()
    .trim()
    .toLowerCase();
}

function parseSinonimos(input: any): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((s) => cleanTerm(s))
      .filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => cleanTerm(s))
      .filter(Boolean);
  }

  return [];
}

/**
 * LISTAR
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .select("*")
      .order("termino");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * CREAR
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const termino = cleanTerm(body.termino);
    const sinonimos = parseSinonimos(body.sinonimos);

    if (!termino) {
      return NextResponse.json(
        { ok: false, error: "termino requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .insert({
        termino,
        sinonimos,
        activo: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * EDITAR
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const id = body.id;
    const termino = cleanTerm(body.termino);
    const sinonimos = parseSinonimos(body.sinonimos);
    const activo = body.activo;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const updateData: any = {};

    if (termino) updateData.termino = termino;
    if (sinonimos) updateData.sinonimos = sinonimos;
    if (typeof activo === "boolean") updateData.activo = activo;

    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * ELIMINAR
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("busqueda_sinonimos")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}