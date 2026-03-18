import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncEmprendedorToAlgolia } from "@/lib/algoliaSyncEmprendedor";
import { learnFromManualClassification } from "@/lib/learnFromManualClassification";
import { getPanelReviewerId } from "@/lib/getPanelReviewerId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

// GET /api/panel/negocio?id=...
// Devuelve datos del emprendedor en la forma que NegocioForm espera.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id", message: "Falta id de emprendedor" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("vw_emprendedor_ficha")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Emprendimiento no encontrado",
        },
        { status: 404 }
      );
    }

    const payload = {
      id: data.id,
      nombre: s(data.nombre),
      responsable: s(data.responsable_nombre),
      mostrarResponsable: data.mostrar_responsable === true,

      categoriaSlug: s(data.categoria_slug),
      subcategoriasSlugs: arr(data.subcategorias_slugs_arr),

      comunaBaseSlug: s(data.comuna_slug),
      coberturaTipo: ((): "solo_comuna" | "varias_comunas" | "regional" | "nacional" => {
        const nivel = s(data.cobertura_tipo).toLowerCase();
        if (nivel === "comuna" || nivel === "solo_mi_comuna" || nivel === "solo_comuna") return "solo_comuna";
        if (nivel === "varias_comunas") return "varias_comunas";
        if (nivel === "varias_regiones" || nivel === "regional") return "regional";
        if (nivel === "nacional") return "nacional";
        return "solo_comuna";
      })(),
      comunasCoberturaSlugs: arr(data.cobertura_comunas_slugs_arr),

      modalidadesAtencion: arr(data.modalidades_atencion_arr) as any[],

      descripcionCorta: s(data.descripcion_corta),
      descripcionLarga: s(data.descripcion_larga),

      whatsapp: s(data.whatsapp),
      instagram: s(data.instagram),
      web: s(data.sitio_web),
      email: s(data.email),

      fotoPrincipalUrl: s(data.foto_principal_url),
      galeriaUrls: arr(data.galeria_urls_arr),
    };

    return NextResponse.json({ ok: true, item: payload });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}

// PUT /api/panel/negocio?id=...
// Actualiza datos editables del emprendedor sin tocar slug, plan, trial_expira, estado_publicacion ni contadores.
export async function PUT(req: NextRequest) {
  try {
    const reviewedBy = await getPanelReviewerId(req);
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id", message: "Falta id de emprendedor" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const nombre = s(body?.nombre);
    const responsable_nombre = s(body?.responsable_nombre);
    const mostrar_responsable = !!body?.mostrar_responsable;

    const categoria_slug = s(body?.categoria_slug);
    const subcategorias_slugs = arr(body?.subcategorias_slugs);

    const comuna_base_slug = s(body?.comuna_base_slug);
    const cobertura_tipo = s(body?.cobertura_tipo);
    const comunas_cobertura_slugs = arr(body?.comunas_cobertura_slugs);

    const modalidades_atencion = arr(body?.modalidades_atencion);

    const descripcion_corta = s(body?.descripcion_corta);
    const descripcion_larga = s(body?.descripcion_larga);

    const whatsapp = s(body?.whatsapp);
    const instagram = s(body?.instagram);
    const web = s(body?.web);
    const email = s(body?.email);

    const foto_principal_url = s(body?.foto_principal_url);
    const galeria_urls = arr(body?.galeria_urls);

    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Nombre obligatorio" },
        { status: 400 }
      );
    }

    if (!comuna_base_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna_base_slug" },
        { status: 400 }
      );
    }

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id,slug")
      .eq("slug", comuna_base_slug)
      .maybeSingle();

    if (comunaError || !comuna) {
      return NextResponse.json(
        { ok: false, error: "Comuna base no encontrada" },
        { status: 400 }
      );
    }

    let categoria: { id: string; slug: string } | null = null;
    let subcats: Array<{ id: string; slug: string; categoria_id: string }> = [];

    if (categoria_slug) {
      const { data: catData, error: categoriaError } = await supabase
        .from("categorias")
        .select("id,slug")
        .eq("slug", categoria_slug)
        .maybeSingle();

      if (categoriaError || !catData) {
        return NextResponse.json(
          { ok: false, error: "Categoría no encontrada" },
          { status: 400 }
        );
      }

      categoria = catData;
    }

    if (subcategorias_slugs.length) {
      const { data, error: subcatsError } = await supabase
        .from("subcategorias")
        .select("id,slug,categoria_id")
        .in("slug", subcategorias_slugs);

      if (subcatsError) {
        return NextResponse.json(
          { ok: false, error: subcatsError.message },
          { status: 400 }
        );
      }

      if (!data || data.length !== subcategorias_slugs.length) {
        return NextResponse.json(
          { ok: false, error: "Una o más subcategorías no existen" },
          { status: 400 }
        );
      }

      subcats = data;

      if (categoria) {
        const fueraCategoria = subcats.some(
          (s) => s.categoria_id !== (categoria as any).id
        );
        if (fueraCategoria) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Hay subcategorías que no pertenecen a la categoría seleccionada",
            },
            { status: 400 }
          );
        }
      }
    }

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({
        nombre,
        responsable_nombre,
        mostrar_responsable,
        categoria_id: categoria ? categoria.id : subcats.length > 0 ? subcats[0].categoria_id : null,
        comuna_base_id: comuna.id,
        cobertura: cobertura_tipo,
        nivel_cobertura: cobertura_tipo,
        modalidades_atencion,
        descripcion_corta,
        descripcion_larga,
        whatsapp,
        instagram,
        sitio_web: web,
        web,
        email,
        foto_principal_url,
        galeria_urls,
        subcategorias_slugs,
        ...(subcats.length > 0 && {
          subcategoria_principal_id: subcats[0].id,
        }),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const { error: deleteRelError } = await supabase
      .from("emprendedor_subcategorias")
      .delete()
      .eq("emprendedor_id", id);

    if (deleteRelError) {
      return NextResponse.json(
        { ok: false, error: deleteRelError.message },
        { status: 500 }
      );
    }

    if (subcats.length) {
      const rows = subcats.map((sc) => ({
        emprendedor_id: id,
        subcategoria_id: sc.id,
      }));

      const { error: insertRelError } = await supabase
        .from("emprendedor_subcategorias")
        .insert(rows);

      if (insertRelError) {
        return NextResponse.json(
          { ok: false, error: insertRelError.message },
          { status: 500 }
        );
      }

      // Aprendizaje: guardar keywords del emprendedor en el diccionario para futuras clasificaciones
      await learnFromManualClassification(supabase, id, subcats[0].id, { reviewedBy }).catch(() => {});
    }

    // Reindex puntual en Algolia para el emprendimiento editado (no bloquea la respuesta)
    syncEmprendedorToAlgolia(String(id)).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}

