import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = s(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del emprendimiento." },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabase
      .from("emprendedores")
      .select("id, nombre, estado_publicacion")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado." },
        { status: 404 }
      );
    }

    // Copiar valores a campos *_final SOLO si están vacíos (no sobrescribir revisión manual)
    const { data: row, error: rowErr } = await supabase
      .from("emprendedores")
      .select(
        "id, categoria_id, subcategoria_principal_id, subcategorias_slugs, keywords, keywords_usuario, productos_detectados, categoria_slug_detectada, subcategoria_slug_detectada, categoria_slug_final, subcategoria_slug_final, keywords_finales"
      )
      .eq("id", id)
      .maybeSingle();

    if (rowErr) {
      return NextResponse.json(
        { ok: false, error: rowErr.message },
        { status: 500 }
      );
    }

    const updatesFinales: Record<string, unknown> = {};
    const categoriaSlugFinalActual = s((row as any)?.categoria_slug_final);
    const subcategoriaSlugFinalActual = s((row as any)?.subcategoria_slug_final);
    const keywordsFinalesActual = Array.isArray((row as any)?.keywords_finales)
      ? (row as any).keywords_finales
      : [];

    if (!categoriaSlugFinalActual) {
      const categoriaId = s((row as any)?.categoria_id);
      if (categoriaId) {
        const { data: catRow } = await supabase
          .from("categorias")
          .select("slug")
          .eq("id", categoriaId)
          .maybeSingle();
        const slug = s((catRow as any)?.slug);
        if (slug) updatesFinales.categoria_slug_final = slug;
      } else {
        const detected = s((row as any)?.categoria_slug_detectada);
        if (detected) updatesFinales.categoria_slug_final = detected;
      }
    }

    if (!subcategoriaSlugFinalActual) {
      const subId = s((row as any)?.subcategoria_principal_id);
      if (subId) {
        const { data: subRow } = await supabase
          .from("subcategorias")
          .select("slug")
          .eq("id", subId)
          .maybeSingle();
        const slug = s((subRow as any)?.slug);
        if (slug) updatesFinales.subcategoria_slug_final = slug;
      } else {
        const slugs = Array.isArray((row as any)?.subcategorias_slugs)
          ? (row as any).subcategorias_slugs
          : [];
        const first = s(slugs[0]);
        if (first) updatesFinales.subcategoria_slug_final = first;
        else {
          const detected = s((row as any)?.subcategoria_slug_detectada);
          if (detected) updatesFinales.subcategoria_slug_final = detected;
        }
      }
    }

    if (!keywordsFinalesActual.length) {
      const kws =
        (Array.isArray((row as any)?.keywords) && (row as any).keywords) ||
        (Array.isArray((row as any)?.keywords_usuario) && (row as any).keywords_usuario) ||
        (Array.isArray((row as any)?.productos_detectados) && (row as any).productos_detectados) ||
        [];
      if (kws.length) updatesFinales.keywords_finales = kws;
    }

    if (Object.keys(updatesFinales).length > 0) {
      const { error: finalsErr } = await supabase
        .from("emprendedores")
        .update(updatesFinales)
        .eq("id", id);
      if (finalsErr) {
        return NextResponse.json(
          { ok: false, error: finalsErr.message },
          { status: 500 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({
        estado_publicacion: "publicado",
        publicado: true,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Actualizar índice de Algolia para que aparezca en búsqueda y sugerencias
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    try {
      const reindexRes = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/reindex/emprendedores/item?id=${encodeURIComponent(id)}`
      );
      if (!reindexRes.ok) {
        console.warn("[aprobar] Reindex Algolia no ok:", reindexRes.status, await reindexRes.text());
      }
    } catch (err) {
      console.warn("[aprobar] Error llamando reindex Algolia:", err);
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: existing.id,
        nombre: existing.nombre,
        estado_publicacion: "publicado",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al aprobar.",
      },
      { status: 500 }
    );
  }
}