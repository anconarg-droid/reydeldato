import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

function cleanTermInput(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function trimCanonico(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * LISTAR
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .select("id, termino_input, termino_canonico, activo")
      .order("termino_input");

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

    const termino_input = cleanTermInput(body.termino_input);
    const termino_canonico = trimCanonico(body.termino_canonico);

    if (!termino_input) {
      return NextResponse.json(
        { ok: false, error: "termino_input requerido" },
        { status: 400 }
      );
    }
    if (!termino_canonico) {
      return NextResponse.json(
        { ok: false, error: "termino_canonico requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .insert({
        termino_input,
        termino_canonico,
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
    const activo = body.activo;

    if (id === undefined || id === null || id === "") {
      return NextResponse.json(
        { ok: false, error: "id requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerPublicClient();

    const updateData: Record<string, unknown> = {};

    if (body.termino_input !== undefined) {
      updateData.termino_input = cleanTermInput(body.termino_input);
    }
    if (body.termino_canonico !== undefined) {
      updateData.termino_canonico = trimCanonico(body.termino_canonico);
    }
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

    const supabase = createSupabaseServerPublicClient();

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
