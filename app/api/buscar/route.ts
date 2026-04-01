import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeText } from "@/lib/search/normalizeText";
import { splitByTerritorialBucket, territorialLevelFromRpcRow } from "@/lib/search/territorialLevelFromRpcRow";
import { rotateDeterministic } from "@/lib/search/deterministicRotation";
import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";

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

/** subcategorias.id es integer: solo acepta dígitos (sin decimales ni espacios). */
function parseSubcategoriaIdParam(v: string): number | null {
  const t = v.trim();
  if (!t || !/^\d+$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  if (n <= 0 || !Number.isSafeInteger(n)) return null;
  return n;
}

type BloqueCliente = "de_tu_comuna" | "atienden_tu_comuna";

function isTrue(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "t" || s === "yes" || s === "y";
}

function computeEsFichaCompletaFromRow(row: Record<string, unknown>): boolean {
  return tieneFichaCompleta({
    planActivo: isTrue(row.plan_activo),
    planExpiraAt:
      row.plan_expira_at == null ? null : String(row.plan_expira_at),
    trialExpiraAt:
      row.trial_expira_at == null ? null : String(row.trial_expira_at),
    // Nota: en el schema actual usamos `trial_expira_at`; `trial_expira` no existe en DB.
    trialExpira: null,
  });
}

/** Listados: recién publicados (~30 días). */
function esEmprendedorNuevo(createdAt: unknown): boolean {
  if (createdAt == null) return false;
  const d = new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  if (ageMs < 0) return false;
  const days = ageMs / 86_400_000;
  return days <= 30;
}

function computeEsFichaCompleta(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null
): boolean {
  const plan_activo = hydrated?.plan_activo ?? row.plan_activo;
  const plan_expira_at = hydrated?.plan_expira_at ?? row.plan_expira_at;
  const trial_expira_at =
    hydrated?.trial_expira_at ??
    (hydrated as any)?.trialExpiraAt ??
    row.trial_expira_at ??
    (row as any)?.trialExpiraAt;

  return tieneFichaCompleta({
    planActivo: isTrue(plan_activo),
    planExpiraAt: plan_expira_at == null ? null : String(plan_expira_at),
    trialExpiraAt: trial_expira_at == null ? null : String(trial_expira_at),
    trialExpira: null,
  });
}

function mapRpcRowToSearchItem(
  row: Record<string, unknown>,
  bloque: BloqueCliente,
  comunaCtx: { slug: string; nombre: string },
  comunaBaseById: Map<number, string>,
  hydratedById: Map<string, Record<string, unknown>>
) {
  const id = String(row.id ?? "");
  const hydrated = hydratedById.get(id) ?? null;
  const nivel = territorialLevelFromRpcRow(row);
  const comunaIdRow = Number(row.comuna_id ?? 0);
  const comunaBaseNombre =
    comunaIdRow > 0 ? s(comunaBaseById.get(comunaIdRow)) : "";
  const rankingFromRpc = row.ranking_score;
  const rankingScore = Number.isFinite(Number(rankingFromRpc))
    ? Number(rankingFromRpc)
    : nivel >= 1 && nivel <= 4
      ? 5 - nivel
      : 0;

  const out: Record<string, unknown> = {
    id,
    slug: String(row.slug ?? ""),
    nombre: String(row.nombre_emprendimiento ?? ""),
    frase:
      row.frase_negocio != null
        ? String(row.frase_negocio)
        : hydrated?.frase_negocio != null
          ? String(hydrated.frase_negocio)
          : "",
    descripcion:
      row.descripcion_libre != null
        ? String(row.descripcion_libre)
        : hydrated?.descripcion_libre != null
          ? String(hydrated.descripcion_libre)
          : "",
    // Imagen: algunas fuentes/RPCs legacy pueden no exponer `foto_principal_url`.
    // Intentamos variaciones comunes antes de caer al placeholder del frontend.
    fotoPrincipalUrl:
      row.foto_principal_url != null
        ? String(row.foto_principal_url)
        : hydrated?.foto_principal_url != null
          ? String(hydrated.foto_principal_url)
        : (row as any).fotoPrincipalUrl != null
          ? String((row as any).fotoPrincipalUrl)
          : (row as any).foto_url != null
            ? String((row as any).foto_url)
            : "",
    whatsappPrincipal:
      row.whatsapp_principal == null ? "" : String(row.whatsapp_principal),
    comunaId: Number(row.comuna_id ?? 0),
    comunaSlug: comunaCtx.slug,
    comunaNombre: comunaCtx.nombre,
    coberturaTipo: row.cobertura_tipo == null ? "" : String(row.cobertura_tipo),
    prioridad: nivel,
    rankingScore,
    score: nivel,
    bloque,
    comunaBaseNombre,
  };
  const esFichaCompleta = computeEsFichaCompleta(row, hydrated);
  out.esFichaCompleta = esFichaCompleta;
  out.estadoFicha = esFichaCompleta ? "ficha_completa" : "ficha_basica";
  if (process.env.NODE_ENV !== "production") {
    const slug = String(row.slug ?? "");
    if (slug.startsWith("test-score")) {
      (out as any).__debug = {
        hasHydrated: !!hydrated,
        hydrated_plan_activo: hydrated?.plan_activo ?? null,
        hydrated_trial_expira_at: hydrated?.trial_expira_at ?? null,
        hydrated_plan_expira_at: hydrated?.plan_expira_at ?? null,
        row_plan_activo: (row as any).plan_activo ?? null,
        row_trial_expira_at: (row as any).trial_expira_at ?? null,
        row_plan_expira_at: (row as any).plan_expira_at ?? null,
      };
    }
  }

  if (Array.isArray(row.subcategorias_slugs)) {
    out.subcategoriasSlugs = row.subcategorias_slugs;
  }
  if (Array.isArray(row.subcategorias_nombres)) {
    out.subcategoriasNombres = row.subcategorias_nombres;
  }
  out.categoriaNombre =
    row.categoria_nombre == null ? "" : String(row.categoria_nombre);

  const comunasArr = row.comunas_cobertura;
  if (Array.isArray(comunasArr)) {
    out.comunasCobertura = comunasArr.map((x) => String(x));
  } else {
    out.comunasCobertura = [];
  }
  const regionesArr = row.regiones_cobertura;
  if (Array.isArray(regionesArr)) {
    out.regionesCobertura = regionesArr.map((x) => String(x));
  } else {
    out.regionesCobertura = [];
  }

  const createdRaw =
    hydrated?.created_at ?? (row as { created_at?: unknown }).created_at;
  out.esNuevo = esEmprendedorNuevo(createdRaw);

  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const comunaSlug = s(searchParams.get("comuna"));
    const qRaw = s(searchParams.get("q"));
    const qNorm = normalizeText(searchParams.get("q"));

    if (!comunaSlug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna" },
        { status: 400 }
      );
    }

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id, slug, nombre, region_id, regiones(slug)")
      .eq("slug", comunaSlug)
      .single();

    if (comunaError || !comuna) {
      return NextResponse.json(
        { ok: false, error: "Comuna no encontrada" },
        { status: 404 }
      );
    }

    // Preferir RPC v2 (incluye foto_principal_url y subcategorías), con fallback a v1 si no existe.
    const regionSlug = String((comuna as any)?.regiones?.slug ?? "");
    let resultados: any[] = [];
    const { data: dataV2, error: errV2 } = await supabase.rpc(
      "buscar_emprendedores_por_cobertura_v2",
      {
        p_comuna_id: comuna.id,
        p_comuna_slug: comuna.slug,
        p_region_slug: regionSlug,
      }
    );
    if (!errV2 && Array.isArray(dataV2)) {
      resultados = dataV2 as any[];
    } else {
      const { data, error } = await supabase.rpc(
        "buscar_emprendedores_por_cobertura",
        {
          comuna_buscada_id: comuna.id,
          comuna_buscada_slug: comuna.slug,
        }
      );

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
      resultados = Array.isArray(data) ? (data as any[]) : [];
    }

    const subSlugParam = s(searchParams.get("subcategoria"));
    const subIdParam = s(searchParams.get("subcategoria_id"));
    let subcategoriaResolved = false;
    let resolvedSubcategoriaId: string | null = null;

    let subUuid: string | null = null;
    const subIdParsed = parseSubcategoriaIdParam(subIdParam);
    if (subIdParsed != null) {
      subUuid = String(subIdParsed);
    } else if (subSlugParam) {
      const { data: subRow, error: subErr } = await supabase
        .from("subcategorias")
        .select("id")
        .eq("slug", subSlugParam.toLowerCase())
        .maybeSingle();
      if (subErr) {
        return NextResponse.json(
          { ok: false, error: subErr.message },
          { status: 500 }
        );
      }
      if (subRow?.id) subUuid = String(subRow.id);
    }

    if (subUuid) {
      subcategoriaResolved = true;
      resolvedSubcategoriaId = subUuid;
      const resultadoIds = resultados
        .map((r: any) => r?.id)
        .filter((id: unknown) => id != null && String(id).length > 0);

      if (resultadoIds.length === 0) {
        resultados = [];
      } else {
        const { data: links, error: linkErr } = await supabase
          .from("emprendedor_subcategorias")
          .select("emprendedor_id")
          .eq("subcategoria_id", subUuid)
          .in("emprendedor_id", resultadoIds as string[]);

        if (linkErr) {
          return NextResponse.json(
            { ok: false, error: linkErr.message },
            { status: 500 }
          );
        }

        const allowed = new Set(
          (links ?? []).map((l: { emprendedor_id: string }) =>
            String(l.emprendedor_id)
          )
        );
        resultados = resultados.filter((item: any) =>
          allowed.has(String(item?.id))
        );
      }
    }

    const textNorm =
      qNorm ||
      (!subcategoriaResolved && subSlugParam
        ? normalizeText(subSlugParam)
        : "");

    if (textNorm) {
      resultados = resultados.filter((item: any) => {
        const nombre = normalizeText(item?.nombre_emprendimiento);
        const frase = normalizeText(item?.frase_negocio);
        const descripcion = normalizeText(item?.descripcion_libre);
        return (
          nombre.includes(textNorm) ||
          frase.includes(textNorm) ||
          descripcion.includes(textNorm)
        );
      });
    }

    // Hidratación: asegurar imagen + estado de ficha incluso si el RPC no trae campos.
    const hydratedById = new Map<string, Record<string, unknown>>();
    const ids = resultados
      .map((r: any) => String(r?.id ?? ""))
      .filter((v: string) => v.length > 0);
    if (ids.length > 0) {
      const { data: emps, error: empsErr } = await supabase
        .from("emprendedores")
        .select(
          "id,foto_principal_url,frase_negocio,descripcion_libre,plan_activo,plan_expira_at,trial_expira_at,created_at"
        )
        .in("id", ids.slice(0, 300));
      if (empsErr) {
        return NextResponse.json(
          { ok: false, error: empsErr.message },
          { status: 500 }
        );
      }
      for (const e of (emps ?? []) as any[]) {
        const id = String(e?.id ?? "");
        if (!id) continue;
        hydratedById.set(id, e as Record<string, unknown>);
      }
    }

    const comunaIdBuscada = Number(comuna.id ?? 0);
    const rows = resultados as Record<string, unknown>[];
    const baseExacta: Record<string, unknown>[] = [];
    const resto: Record<string, unknown>[] = [];

    for (const row of rows) {
      // PROTECCIÓN EXPLÍCITA: si comuna_base (comuna_id) == comuna buscada, NUNCA puede caer en "atienden".
      // Esto evita bugs por score/ranking incompleto o inconsistencia temporal del RPC.
      const cid = Number((row as any)?.comuna_id ?? 0);
      if (comunaIdBuscada > 0 && cid === comunaIdBuscada) {
        baseExacta.push(row);
      } else {
        resto.push(row);
      }
    }

    const { deMiComuna, atiendenMiComuna } = splitByTerritorialBucket(resto);
    const deMiComunaFinal = [...baseExacta, ...deMiComuna];

    const deMiComunaRot = rotateDeterministic(
      deMiComunaFinal,
      (row) => String((row as any)?.slug ?? (row as any)?.id ?? ""),
      5 * 60 * 1000
    );
    const atiendenMiComunaRot = rotateDeterministic(
      atiendenMiComuna,
      (row) => String((row as any)?.slug ?? (row as any)?.id ?? ""),
      5 * 60 * 1000
    );

    const comunaCtx = { slug: String(comuna.slug), nombre: String(comuna.nombre) };

    const comunaIds = new Set<number>();
    for (const row of resultados as Record<string, unknown>[]) {
      const cid = Number(row.comuna_id ?? 0);
      if (cid > 0) comunaIds.add(cid);
    }
    const comunaBaseById = new Map<number, string>();
    if (comunaIds.size > 0) {
      const { data: comunasNombre } = await supabase
        .from("comunas")
        .select("id, nombre")
        .in("id", [...comunaIds]);
      for (const c of comunasNombre ?? []) {
        const row = c as { id?: unknown; nombre?: unknown };
        const id = Number(row.id ?? 0);
        if (id > 0) comunaBaseById.set(id, s(row.nombre));
      }
    }

    const items = [
      ...deMiComunaRot.map((row: Record<string, unknown>) =>
        mapRpcRowToSearchItem(row, "de_tu_comuna", comunaCtx, comunaBaseById, hydratedById)
      ),
      ...atiendenMiComunaRot.map((row: Record<string, unknown>) =>
        mapRpcRowToSearchItem(row, "atienden_tu_comuna", comunaCtx, comunaBaseById, hydratedById)
      ),
    ];

    const total = items.length;

    return NextResponse.json({
      ok: true,
      items,
      total,
      deMiComuna: deMiComunaRot,
      atiendenMiComuna: atiendenMiComunaRot,
      meta: {
        comuna: comuna.slug,
        comunaSlug: comuna.slug,
        comunaNombre: comuna.nombre,
        q: qRaw,
        page: 1,
        limit: total,
        offset: 0,
        total,
        modo:
          textNorm || subcategoriaResolved ? "busqueda_con_texto" : "solo_comuna",
        subcategoriaResolved,
        subcategoriaId: resolvedSubcategoriaId,
        subcategoriaSlug: subSlugParam || null,
        totalDeMiComuna: deMiComunaRot.length,
        totalAtiendenMiComuna: atiendenMiComunaRot.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}