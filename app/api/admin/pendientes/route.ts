import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  comunaIdPreferidaEmprendedorRow,
  mapComunasByIdForEmprendedorRows,
} from "@/lib/adminEmprendedoresComunaLookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("emprendedores")
      .select(`
        id,
        nombre_emprendimiento,
        slug,
        descripcion_corta,
        descripcion_larga,
        whatsapp,
        email,
        instagram,
        sitio_web,
        responsable_nombre,
        mostrar_responsable,
        nivel_cobertura,
        cobertura,
        coverage_labels,
        foto_principal_url,
        galeria_urls,
        estado_publicacion,
        created_at,
        comuna_id,
        categorias (
          id,
          nombre,
          slug
        )
      `)
      .in("estado_publicacion", ["en_revision", "borrador"])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "pendientes_fetch_error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const comunaMap = await mapComunasByIdForEmprendedorRows(supabase, rows);
    const items = rows.map((row) => {
      const cid = comunaIdPreferidaEmprendedorRow(row);
      const c = cid ? comunaMap.get(cid) : undefined;
      return {
        ...row,
        comunas: c
          ? { id: c.id, nombre: c.nombre, slug: c.slug }
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "pendientes_unexpected_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}