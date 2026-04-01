import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncEmprendedorToAlgolia } from "@/lib/algoliaSyncEmprendedor";
import { learnFromManualClassification } from "@/lib/learnFromManualClassification";
import { getPanelReviewerId } from "@/lib/getPanelReviewerId";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { calcularCompletitudEmprendedor } from "@/lib/calcularCompletitudEmprendedor";
import { calcularTipoFicha } from "@/lib/calcularTipoFicha";
import { calcularChecklistFicha } from "@/lib/calcularChecklistFicha";
import { validateCategoriaSubcategorias } from "@/lib/validateCategoriaSubcategorias";
import { normalizeCoberturaTipoDb } from "@/lib/cobertura";

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

function dedupeStrings(list: string[]): string[] {
  return [...new Set(list.map((x) => s(x)).filter(Boolean))];
}

/**
 * Panel → enum canónico `emprendedores.cobertura_tipo` (Postgres), no alias tipo solo_mi_comuna.
 */
function panelCoberturaToDb(tipo: string): string {
  return normalizeCoberturaTipoDb(tipo) || "solo_comuna";
}

/** Valores persistidos en `emprendedor_modalidades.modalidad` (enum típico en BD). */
const MODALIDADES_DB_VALIDAS_PANEL = [
  "local_fisico",
  "presencial_terreno",
  "online",
] as const;

/**
 * Claves NegocioForm → valores en `emprendedor_modalidades.modalidad`
 * (local_fisico, presencial_terreno, online).
 */
function modalidadPanelToDb(m: string): string {
  const x = s(m).toLowerCase();
  if (x === "local_fisico" || x === "local") return "local_fisico";
  if (
    x === "domicilio" ||
    x === "presencial" ||
    x === "presencial_terreno"
  ) {
    return "presencial_terreno";
  }
  if (x === "online") return "online";
  return x;
}

/** Valores en `emprendedor_modalidades.modalidad` → claves de NegocioForm. */
function modalidadesToPanelForm(rawList: string[]): string[] {
  const out = new Set<string>();
  for (const raw of rawList) {
    const x = s(raw).toLowerCase();
    if (x === "local_fisico" || x === "local") out.add("local_fisico");
    else if (
      x === "presencial_terreno" ||
      x === "domicilio" ||
      x === "presencial"
    ) {
      out.add("domicilio");
    } else if (x === "online") out.add("online");
  }
  return [...out];
}

// GET /api/panel/negocio?id=...
// Devuelve datos del emprendedor en la forma que NegocioForm espera.
// Columnas de emprendedores alineadas al esquema real (sin legacy nombre / descripcion_corta / etc.).
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
      .from("emprendedores")
      .select(
        `
          id,
          nombre_emprendimiento,
          nombre_responsable,
          mostrar_responsable_publico,
          categoria_id,
          comuna_id,
          cobertura_tipo,
          comunas_cobertura,
          regiones_cobertura,
          frase_negocio,
          descripcion_libre,
          whatsapp_principal,
          whatsapp_secundario,
          instagram,
          sitio_web,
          email,
          foto_principal_url
        `
      )
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

    const row = data as Record<string, unknown>;

    let comunaSlug = "";
    if (row.comuna_id != null) {
      const { data: comuna } = await supabase
        .from("comunas")
        .select("slug")
        .eq("id", row.comuna_id)
        .maybeSingle();

      comunaSlug =
        comuna && typeof (comuna as { slug?: unknown }).slug === "string"
          ? s((comuna as { slug: string }).slug)
          : "";
    }

    let categoriaSlug = "";
    if (row.categoria_id != null) {
      const { data: categoria } = await supabase
        .from("categorias")
        .select("slug")
        .eq("id", row.categoria_id)
        .maybeSingle();

      categoriaSlug =
        categoria && typeof (categoria as { slug?: unknown }).slug === "string"
          ? s((categoria as { slug: string }).slug)
          : "";
    }

    const coberturaRaw = s(row.cobertura_tipo).toLowerCase();

    const emprendedorId = s(row.id);
    let modalidadesAtencion: string[] = [];
    if (emprendedorId) {
      const { data: modRows } = await supabase
        .from("emprendedor_modalidades")
        .select("modalidad")
        .eq("emprendedor_id", emprendedorId);

      if (Array.isArray(modRows)) {
        modalidadesAtencion = modalidadesToPanelForm(
          modRows.map((r) => s((r as { modalidad?: unknown }).modalidad))
        );
      }
    }

    let galeriaExtraCount = 0;
    const galeriaSlots = Array.from({ length: 8 }, () => "");
    let subcategoriasSlugs: string[] = [];
    if (emprendedorId) {
      const { data: galRows } = await supabase
        .from("emprendedor_galeria")
        .select("imagen_url")
        .eq("emprendedor_id", emprendedorId);

      if (Array.isArray(galRows)) {
        const urls = galRows
          .map((r) => s((r as { imagen_url?: unknown }).imagen_url))
          .filter(Boolean);
        galeriaExtraCount = urls.length;
        for (let i = 0; i < 8 && i < urls.length; i++) {
          galeriaSlots[i] = urls[i] ?? "";
        }
      }

      const { data: subRelRows } = await supabase
        .from("emprendedor_subcategorias")
        .select("subcategorias(slug)")
        .eq("emprendedor_id", emprendedorId);

      if (Array.isArray(subRelRows)) {
        subcategoriasSlugs = dedupeStrings(
          subRelRows.map((r) =>
            s((r as { subcategorias?: { slug?: unknown } }).subcategorias?.slug)
          )
        );
      }
    }

    const regionesCoberturaSlugs = arr(row.regiones_cobertura);

    const completitud = calcularCompletitudEmprendedor({
      nombreEmprendimiento: row.nombre_emprendimiento,
      whatsappPrincipal: row.whatsapp_principal,
      whatsappSecundario: row.whatsapp_secundario,
      fotoPrincipalUrl: row.foto_principal_url,
      fraseNegocio: row.frase_negocio,
      comunaId: row.comuna_id,
      categoriaId: row.categoria_id,
      coberturaTipo: row.cobertura_tipo,
      comunasCobertura: arr(row.comunas_cobertura),
      regionesCoberturaCount: regionesCoberturaSlugs.length,
      modalidadesCount: modalidadesAtencion.length,
      instagram: row.instagram,
      sitioWeb: row.sitio_web,
      descripcionLibre: row.descripcion_libre,
      galeriaExtraCount,
    });

    const comunaIdNum =
      row.comuna_id == null
        ? null
        : Number.isFinite(Number(row.comuna_id))
          ? Number(row.comuna_id)
          : null;

    const tipoFicha = calcularTipoFicha({
      nombre_emprendimiento: s(row.nombre_emprendimiento) || null,
      whatsapp_principal: s(row.whatsapp_principal) || null,
      frase_negocio: s(row.frase_negocio) || null,
      comuna_id: comunaIdNum,
      cobertura_tipo: s(row.cobertura_tipo) || null,
      descripcion_libre: s(row.descripcion_libre) || null,
      foto_principal_url: s(row.foto_principal_url) || null,
      galeria_count: galeriaExtraCount,
      instagram: s(row.instagram) || null,
      sitio_web: s(row.sitio_web) || null,
    });

    const checklistFaltantes = calcularChecklistFicha({
      descripcion_libre: s(row.descripcion_libre) || null,
      foto_principal_url: s(row.foto_principal_url) || null,
      galeria_count: galeriaExtraCount,
      instagram: s(row.instagram) || null,
      sitio_web: s(row.sitio_web) || null,
    });

    const payload = {
      id: s(row.id),
      nombre: s(row.nombre_emprendimiento),
      responsable: s(row.nombre_responsable),
      mostrarResponsable: row.mostrar_responsable_publico === true,

      categoriaSlug,
      subcategoriasSlugs,

      comunaBaseSlug: comunaSlug,
      coberturaTipo: ((): "solo_comuna" | "varias_comunas" | "regional" | "nacional" => {
        if (
          coberturaRaw === "comuna" ||
          coberturaRaw === "solo_mi_comuna" ||
          coberturaRaw === "solo_comuna"
        ) {
          return "solo_comuna";
        }
        if (coberturaRaw === "varias_comunas") {
          return "varias_comunas";
        }
        if (
          coberturaRaw === "regional" ||
          coberturaRaw === "varias_regiones"
        ) {
          return "regional";
        }
        if (coberturaRaw === "nacional") {
          return "nacional";
        }
        return "solo_comuna";
      })(),
      comunasCoberturaSlugs: arr(row.comunas_cobertura),
      regionesCoberturaSlugs,

      modalidadesAtencion: modalidadesAtencion as any[],

      descripcionCorta: s(row.frase_negocio),
      descripcionLarga: s(row.descripcion_libre),

      whatsapp:
        s(row.whatsapp_principal) ||
        s(row.whatsapp_secundario),
      instagram: s(row.instagram),
      web: s(row.sitio_web),
      email: s(row.email),

      fotoPrincipalUrl: s(row.foto_principal_url),
      galeriaUrls: galeriaSlots,
    };

    return NextResponse.json({
      ok: true,
      item: payload,
      completitud,
      tipoFicha,
      checklistFaltantes,
    });
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
    const regiones_cobertura_slugs = arr(body?.regiones_cobertura_slugs);

    const modalidades_atencion = arr(body?.modalidades_atencion);

    const descripcion_corta = s(body?.descripcion_corta);
    const descripcion_larga = s(body?.descripcion_larga);

    const whatsapp = s(body?.whatsapp);
    const instagram = s(body?.instagram);
    const web = s(body?.web);
    const email = s(body?.email);

    const foto_principal_url_raw = body?.foto_principal_url;
    const foto_principal_url = s(foto_principal_url_raw);
    const galeria_urls = arr(body?.galeria_urls).slice(0, 8);

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
      .select("id, slug, region_id")
      .eq("slug", comuna_base_slug)
      .maybeSingle();

    if (comunaError || !comuna) {
      return NextResponse.json(
        { ok: false, error: "Comuna base no encontrada" },
        { status: 400 }
      );
    }

    const comunaRow = comuna as { id: string; slug: string; region_id?: unknown };
    let baseRegionSlug = "";
    if (comunaRow.region_id != null && String(comunaRow.region_id).trim()) {
      const { data: regRow } = await supabase
        .from("regiones")
        .select("slug")
        .eq("id", comunaRow.region_id as never)
        .maybeSingle();
      baseRegionSlug =
        regRow && typeof (regRow as { slug?: unknown }).slug === "string"
          ? s((regRow as { slug: string }).slug)
          : "";
    }

    const dbCobertura = panelCoberturaToDb(cobertura_tipo);

    let comunasSlugsJson: string[] = [];
    let regionesSlugsJson: string[] = [];

    if (
      dbCobertura === "solo_comuna" ||
      dbCobertura === "solo_mi_comuna" ||
      dbCobertura === "comuna"
    ) {
      comunasSlugsJson = comuna_base_slug ? [comuna_base_slug] : [];
      regionesSlugsJson = [];
    } else if (dbCobertura === "varias_comunas") {
      comunasSlugsJson = dedupeStrings([comuna_base_slug, ...comunas_cobertura_slugs]);
      regionesSlugsJson = [];
    } else if (dbCobertura === "varias_regiones" || dbCobertura === "regional") {
      comunasSlugsJson = [];
      regionesSlugsJson =
        regiones_cobertura_slugs.length > 0
          ? dedupeStrings(regiones_cobertura_slugs)
          : baseRegionSlug
            ? [baseRegionSlug]
            : [];
    } else if (dbCobertura === "nacional") {
      comunasSlugsJson = [];
      regionesSlugsJson = [];
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

      const uniqueCategoriaIds = [
        ...new Set(subcats.map((sc) => sc.categoria_id)),
      ];
      if (uniqueCategoriaIds.length > 1) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Las subcategorías indicadas pertenecen a más de una categoría. Elige subcategorías de un solo rubro.",
          },
          { status: 400 }
        );
      }

      const effectiveCategoriaId =
        categoria?.id ?? uniqueCategoriaIds[0] ?? null;

      const tax = await validateCategoriaSubcategorias(
        supabase,
        effectiveCategoriaId,
        subcats.map((sc) => sc.id)
      );
      if (!tax.ok) {
        return NextResponse.json(
          { ok: false, error: tax.error },
          { status: 400 }
        );
      }
    }

    const emprendedorUpdate: Record<string, unknown> = {
      nombre_emprendimiento: nombre,
      nombre_responsable: responsable_nombre,
      mostrar_responsable_publico: mostrar_responsable,
      categoria_id: categoria
        ? categoria.id
        : subcats.length > 0
          ? subcats[0].categoria_id
          : null,
      comuna_id: comunaRow.id,
      cobertura_tipo: dbCobertura,
      comunas_cobertura: comunasSlugsJson,
      regiones_cobertura: regionesSlugsJson,
      frase_negocio: descripcion_corta,
      descripcion_libre: descripcion_larga,
      whatsapp_principal: whatsapp,
      instagram: s(instagram) || null,
      sitio_web: s(web) || null,
      email: s(email) || null,
      subcategoria_principal_id: subcats.length > 0 ? subcats[0].id : null,
    };

    if (foto_principal_url_raw !== undefined) {
      if (foto_principal_url === "") {
        emprendedorUpdate.foto_principal_url = null;
      } else if (isPersistibleFotoUrl(foto_principal_url)) {
        emprendedorUpdate.foto_principal_url = foto_principal_url;
      }
    }

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update(emprendedorUpdate)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const { error: delComunasErr } = await supabase
      .from("emprendedor_comunas_cobertura")
      .delete()
      .eq("emprendedor_id", id);
    if (delComunasErr) {
      return NextResponse.json(
        { ok: false, error: delComunasErr.message },
        { status: 500 }
      );
    }
    if (comunasSlugsJson.length) {
      const { data: comunaRows } = await supabase
        .from("comunas")
        .select("id, slug")
        .in("slug", dedupeStrings(comunasSlugsJson));
      const comunaInsRaw = (comunaRows ?? [])
        .map((r) => ({
          emprendedor_id: id,
          comuna_id: s((r as { id?: unknown }).id),
        }))
        .filter((row) => row.comuna_id);
      const comunaIns = [
        ...new Map(comunaInsRaw.map((r) => [r.comuna_id, r])).values(),
      ];
      if (comunaIns.length) {
        const { error: insComunasErr } = await supabase
          .from("emprendedor_comunas_cobertura")
          .insert(comunaIns);
        if (insComunasErr) {
          return NextResponse.json(
            { ok: false, error: insComunasErr.message },
            { status: 500 }
          );
        }
      }
    }

    const { error: delRegErr } = await supabase
      .from("emprendedor_regiones_cobertura")
      .delete()
      .eq("emprendedor_id", id);
    if (delRegErr) {
      return NextResponse.json(
        { ok: false, error: delRegErr.message },
        { status: 500 }
      );
    }
    if (regionesSlugsJson.length) {
      const { data: regionRows } = await supabase
        .from("regiones")
        .select("id, slug")
        .in("slug", dedupeStrings(regionesSlugsJson));
      const regionInsRaw = (regionRows ?? [])
        .map((r) => ({
          emprendedor_id: id,
          region_id: s((r as { id?: unknown }).id),
        }))
        .filter((row) => row.region_id);
      const regionIns = [
        ...new Map(regionInsRaw.map((r) => [r.region_id, r])).values(),
      ];
      if (regionIns.length) {
        const { error: insRegErr } = await supabase
          .from("emprendedor_regiones_cobertura")
          .insert(regionIns);
        if (insRegErr) {
          return NextResponse.json(
            { ok: false, error: insRegErr.message },
            { status: 500 }
          );
        }
      }
    }

    const { error: delModErr } = await supabase
      .from("emprendedor_modalidades")
      .delete()
      .eq("emprendedor_id", id);
    if (delModErr) {
      return NextResponse.json(
        { ok: false, error: delModErr.message },
        { status: 500 }
      );
    }
    const rawMods = dedupeStrings(modalidades_atencion);
    const invalidMods = rawMods.filter((m) => {
      const db = modalidadPanelToDb(m);
      return !(MODALIDADES_DB_VALIDAS_PANEL as readonly string[]).includes(db);
    });
    if (invalidMods.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "modalidad_invalida",
          message: `Modalidad inválida: ${invalidMods.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const modalidadesUnique = [
      ...new Set(
        rawMods
          .map(modalidadPanelToDb)
          .filter((m) =>
            (MODALIDADES_DB_VALIDAS_PANEL as readonly string[]).includes(m)
          )
      ),
    ];
    if (modalidadesUnique.length) {
      const modIns = modalidadesUnique.map((m) => ({
        emprendedor_id: id,
        modalidad: m,
      }));
      const { error: insModErr } = await supabase
        .from("emprendedor_modalidades")
        .insert(modIns);
      if (insModErr) {
        return NextResponse.json(
          { ok: false, error: insModErr.message },
          { status: 500 }
        );
      }
    }

    const { error: delGalErr } = await supabase
      .from("emprendedor_galeria")
      .delete()
      .eq("emprendedor_id", id);
    if (delGalErr) {
      return NextResponse.json(
        { ok: false, error: delGalErr.message },
        { status: 500 }
      );
    }
    if (galeria_urls.length) {
      const galIns = galeria_urls.map((url) => ({
        emprendedor_id: id,
        imagen_url: url,
      }));
      const { error: insGalErr } = await supabase
        .from("emprendedor_galeria")
        .insert(galIns);
      if (insGalErr) {
        return NextResponse.json(
          { ok: false, error: insGalErr.message },
          { status: 500 }
        );
      }
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

      await learnFromManualClassification(supabase, id, subcats[0].id, {
        reviewedBy,
      }).catch(() => {});
    }

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
