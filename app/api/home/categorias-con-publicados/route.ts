import { NextResponse } from "next/server";
import { CATEGORIAS_CATALOGO, prettyLabelSubcategoria } from "@/lib/categoriasCatalogo";
import { loadConteosCategoriasIndex } from "@/lib/loadCategoriasIndexCounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Categorías con al menos un emprendedor `estado_publicacion = publicado` y ejemplos de sub
 * solo si esa sub tiene oferta real (misma paginación que `loadConteosCategoriasIndex` sobre
 * `vw_emprendedores_publico`).
 */
export async function GET() {
  try {
    const { porSlug, subSlugsConPublicadosPorCategoriaSlug } =
      await loadConteosCategoriasIndex({ comunaSlug: null });
    const items = CATEGORIAS_CATALOGO.filter((c) => porSlug.has(c.slug)).map((c) => {
      const conSubs = subSlugsConPublicadosPorCategoriaSlug.get(c.slug);
      const ejemplosSub = c.subcategorias
        .filter((sub) => conSubs?.has(sub))
        .slice(0, 2)
        .map((sub) => ({
          slug: sub,
          label: prettyLabelSubcategoria(sub),
        }));
      return {
        slug: c.slug,
        nombre: c.nombre,
        emoji: c.emoji,
        ejemplosSub,
      };
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        items: [] as unknown[],
        error: e instanceof Error ? e.message : "Error",
      },
      { status: 500 }
    );
  }
}
