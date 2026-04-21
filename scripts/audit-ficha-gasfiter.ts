/**
 * Auditoría: /api/buscar (Maipú + q) vs búsqueda global (misma regla que /resultados?q= sin comuna).
 * Uso: npx tsx scripts/audit-ficha-gasfiter.ts
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeText } from "../lib/search/normalizeText";
import {
  explicarFichaListadoDesdeBusqueda,
  fichaPublicaEsMejoradaDesdeBusqueda,
} from "../lib/estadoFicha";
import {
  countGaleriaPivotByEmprendedorIds,
  normalizeEmprendedorId,
} from "../lib/emprendedorGaleriaPivot";
import { searchEmprendedoresGlobalText } from "../lib/resultadosGlobalSupabase";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

async function mirrorBuscarMaipuGasfiter() {
  if (!url || !service) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, service);
  const comunaSlug = "maipu";
  const qRaw = "gasfiter";
  const textNorm = normalizeText(qRaw);

  const { data: comuna, error: comunaError } = await supabase
    .from("comunas")
    .select("id, slug, nombre, region_id, regiones(slug)")
    .eq("slug", comunaSlug)
    .single();

  if (comunaError || !comuna) {
    throw new Error(`Comuna ${comunaSlug}: ${comunaError?.message ?? "no encontrada"}`);
  }

  const regionSlug = String((comuna as { regiones?: { slug?: string } }).regiones?.slug ?? "");
  const { data: dataV2, error: errV2 } = await supabase.rpc(
    "buscar_emprendedores_por_cobertura_v2",
    {
      p_comuna_id: (comuna as { id: number }).id,
      p_comuna_slug: (comuna as { slug: string }).slug,
      p_region_slug: regionSlug,
    }
  );

  let resultados: Record<string, unknown>[] = [];
  if (!errV2 && Array.isArray(dataV2)) {
    resultados = dataV2 as Record<string, unknown>[];
  } else {
    const { data, error } = await supabase.rpc("buscar_emprendedores_por_cobertura", {
      comuna_buscada_id: (comuna as { id: number }).id,
      comuna_buscada_slug: (comuna as { slug: string }).slug,
    });
    if (error) throw new Error(error.message);
    resultados = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  }

  if (textNorm) {
    resultados = resultados.filter((item) => {
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

  const ids = resultados
    .map((r) => s(r.id))
    .filter((v) => v.length > 0);
  const idSlice = ids.slice(0, 300);

  const hydratedById = new Map<string, Record<string, unknown>>();
  let galeriaPivotByEmpId = new Map<string, number>();

  if (idSlice.length > 0) {
    const [empsRes, pivotMap] = await Promise.all([
      supabase.from("emprendedores").select("*").in("id", idSlice),
      countGaleriaPivotByEmprendedorIds(supabase, idSlice),
    ]);
    galeriaPivotByEmpId = pivotMap;
    if (empsRes.error) throw new Error(empsRes.error.message);
    for (const e of (empsRes.data ?? []) as Record<string, unknown>[]) {
      const key = normalizeEmprendedorId(e.id);
      if (key) hydratedById.set(key, e);
    }
  }

  const rows: {
    slug: string;
    completa: boolean;
    motivo: string | null;
    metricas: ReturnType<typeof explicarFichaListadoDesdeBusqueda>["metricas"];
  }[] = [];

  for (const row of resultados) {
    const idKey = normalizeEmprendedorId(row.id);
    const hydrated = idKey ? hydratedById.get(idKey) ?? null : null;
    const pivot = idKey ? galeriaPivotByEmpId.get(idKey) ?? 0 : 0;
    const expl = explicarFichaListadoDesdeBusqueda(row, hydrated, pivot);
    const apiCompleta = fichaPublicaEsMejoradaDesdeBusqueda(row, hydrated, pivot);
    if (apiCompleta !== expl.completa) {
      throw new Error("Inconsistencia explicar vs fichaPublicaEsMejorada");
    }
    rows.push({
      slug: s(row.slug),
      completa: expl.completa,
      motivo: expl.motivoBasica,
      metricas: expl.metricas,
    });
  }

  return { fuente: "mirror /api/buscar maipu + q=gasfiter", rows };
}

async function globalGasfiter() {
  const q = normalizeText("gasfiter");
  const { items, error } = await searchEmprendedoresGlobalText(q, 48);
  if (error) throw new Error(error);
  if (!url || !service) throw new Error("Faltan env para batch explicar global");
  const supabase = createClient(url, service);
  const slugs = items.map((it) => it.slug).filter(Boolean);
  const { data: empRows } = await supabase.from("emprendedores").select("*").in("slug", slugs);
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const r of (empRows ?? []) as Record<string, unknown>[]) {
    bySlug.set(s(r.slug), r);
  }
  const pivotMap = await countGaleriaPivotByEmprendedorIds(
    supabase,
    (empRows ?? []).map((r) => (r as Record<string, unknown>).id)
  );

  const rows: {
    slug: string;
    completa: boolean;
    motivo: string | null;
    metricas: ReturnType<typeof explicarFichaListadoDesdeBusqueda>["metricas"];
  }[] = [];

  for (const it of items) {
    const row = bySlug.get(it.slug);
    if (!row) {
      rows.push({
        slug: it.slug,
        completa: it.esFichaCompleta,
        motivo: "no se encontró fila emprendedores por slug (desinc.)",
        metricas: {
          descripcionCaracteres: 0,
          totalFotos: 0,
          filasPivotGaleria: 0,
          urlsEnArrayGaleria: 0,
          tieneInstagram: false,
          tieneWeb: false,
        },
      });
      continue;
    }
    const k = normalizeEmprendedorId(row.id);
    const pivot = pivotMap.get(k) ?? 0;
    const expl = explicarFichaListadoDesdeBusqueda(row, null, pivot);
    if (expl.completa !== it.esFichaCompleta) {
      console.warn(
        `Aviso: slug ${it.slug} esFichaCompleta API global=${it.esFichaCompleta} vs recalculo=${expl.completa}`
      );
    }
    rows.push({
      slug: it.slug,
      completa: expl.completa,
      motivo: expl.motivoBasica,
      metricas: expl.metricas,
    });
  }

  return {
    fuente: "/resultados?q=gasfiter (searchEmprendedoresGlobalText + recalculo explicar)",
    rows,
  };
}

async function probeGaleriaRlsAnon() {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { anon: "sin anon key" };
  const pub = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await pub.from("emprendedor_galeria").select("id").limit(1);
  if (error) {
    return {
      anon: "lectura emprendedor_galeria",
      ok: false,
      mensaje: error.message,
      nota: "Si falla, searchEmprendedoresGlobalText (anon) puede subcontar galería vs /api/buscar (service).",
    };
  }
  return {
    anon: "lectura emprendedor_galeria",
    ok: true,
    muestra: data?.length ?? 0,
    nota: "Anon puede leer al menos una fila (o tabla vacía sin error).",
  };
}

async function main() {
  console.log("=== 1) Mirror Maipú + gasfiter (misma lógica que GET /api/buscar) ===\n");
  const a = await mirrorBuscarMaipuGasfiter();
  printRows(a);

  console.log("\n=== 2) Búsqueda global gasfiter (misma lógica que /resultados sin comuna) ===\n");
  const b = await globalGasfiter();
  printRows(b);

  console.log("\n=== 5) Permisos anon sobre emprendedor_galeria ===\n");
  console.log(JSON.stringify(await probeGaleriaRlsAnon(), null, 2));
}

function printRows(x: {
  fuente: string;
  rows: {
    slug: string;
    completa: boolean;
    motivo: string | null;
    metricas: ReturnType<typeof explicarFichaListadoDesdeBusqueda>["metricas"] | null;
  }[];
}) {
  console.log(x.fuente);
  const completos = x.rows.filter((r) => r.completa);
  const basicos = x.rows.filter((r) => !r.completa);
  console.log(`Total: ${x.rows.length} | completos: ${completos.length} | básicos: ${basicos.length}`);
  console.log("\n--- Completos ---");
  for (const r of completos) {
    console.log(
      `  ${r.slug}${r.metricas ? ` | fotos=${r.metricas.totalFotos} desc=${r.metricas.descripcionCaracteres} pivot=${r.metricas.filasPivotGaleria}` : ""}`
    );
  }
  console.log("\n--- Básicos (motivo) ---");
  for (const r of basicos) {
    console.log(`  ${r.slug} | ${r.motivo ?? "—"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
