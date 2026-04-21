import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

function clean(value: string) {
  return (value ?? "").toString().trim().toLowerCase();
}

function parseKeywords(input: any): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map((x) => clean(x)).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((x) => clean(x))
      .filter(Boolean);
  }

  return [];
}

export async function GET() {
  try {
    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("keywords_rubro")
      .select("*")
      .order("categoria_slug", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const categoria_slug = clean(body.categoria_slug || "");
    const subcategoria_slug = clean(body.subcategoria_slug || "");
    const keywords = parseKeywords(body.keywords);

    if (!subcategoria_slug) {
      return NextResponse.json(
        { ok: false, error: "subcategoria_slug requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("keywords_rubro")
      .insert({
        categoria_slug: categoria_slug || null,
        subcategoria_slug,
        keywords,
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

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const id = body.id;
    const categoria_slug = clean(body.categoria_slug || "");
    const subcategoria_slug = clean(body.subcategoria_slug || "");
    const keywords = parseKeywords(body.keywords);
    const activo = body.activo;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id requerido" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.categoria_slug !== undefined) updateData.categoria_slug = categoria_slug || null;
    if (body.subcategoria_slug !== undefined) updateData.subcategoria_slug = subcategoria_slug;
    if (body.keywords !== undefined) updateData.keywords = keywords;
    if (typeof activo === "boolean") updateData.activo = activo;

    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("keywords_rubro")
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

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

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
      .from("keywords_rubro")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}