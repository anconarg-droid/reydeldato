import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TIPO_ACTIVIDAD_VALUES = ["venta", "servicio", "arriendo"] as const;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function slugifyTag(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "tag";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const propuestoNombre = s((body as any).propuesto_nombre);
    let propuestoSlug = s((body as any).propuesto_slug).toLowerCase();
    const sectorSlug = s((body as any).sector_slug);
    const tipoActividad = s((body as any).tipo_actividad).toLowerCase();
    const emprendedorId = s((body as any).emprendedor_id) || null;
    const descripcionContexto = s((body as any).descripcion_contexto) || null;

    if (!propuestoNombre || propuestoNombre.length < 3) {
      return NextResponse.json(
        {
          ok: false,
          error: "nombre_invalido",
          message: "El nombre de la etiqueta propuesta debe tener al menos 3 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!propuestoSlug) {
      propuestoSlug = slugifyTag(propuestoNombre);
    } else {
      propuestoSlug = slugifyTag(propuestoSlug);
    }

    if (!sectorSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "sector_requerido",
          message: "Debes indicar un sector para la etiqueta propuesta.",
        },
        { status: 400 }
      );
    }

    if (!TIPO_ACTIVIDAD_VALUES.includes(tipoActividad as any)) {
      return NextResponse.json(
        {
          ok: false,
          error: "tipo_actividad_invalido",
          message: "tipo_actividad debe ser 'venta', 'servicio' o 'arriendo'.",
        },
        { status: 400 }
      );
    }

    // Validar que el sector existe
    const { data: sectorRow, error: sectorError } = await supabase
      .from("sectores")
      .select("slug")
      .eq("slug", sectorSlug)
      .maybeSingle();

    if (sectorError || !sectorRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "sector_no_encontrado",
          message: "El sector indicado no existe.",
        },
        { status: 400 }
      );
    }

    // Insertar sugerencia
    const { data, error } = await supabase
      .from("tags_sugeridos")
      .insert({
        propuesto_nombre: propuestoNombre,
        propuesto_slug: propuestoSlug,
        sector_slug: sectorSlug,
        tipo_actividad: tipoActividad,
        emprendedor_id: emprendedorId || null,
        descripcion_contexto: descripcionContexto,
        estado: "pendiente",
      })
      .select("id, propuesto_nombre, propuesto_slug, sector_slug, tipo_actividad, estado")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          ok: false,
          error: "insert_error",
          message: error?.message || "No se pudo guardar la etiqueta sugerida.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: data,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "tags_sugeridos_error",
        message: err instanceof Error ? err.message : "Error inesperado al sugerir etiqueta.",
      },
      { status: 500 }
    );
  }
}

