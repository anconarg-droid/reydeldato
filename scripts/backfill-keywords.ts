/**
 * Backfill: regenera `emprendedores.keywords_finales` con la lógica actual
 * (`filtrarKeywordsPorSubcategoria`: limpieza suave, dedupe, expansión de unigramas desde bigramas).
 *
 * Procesa en lotes (lectura paginada); un UPDATE por fila solo cuando el resultado cambia.
 * No modifica otras columnas ni el esquema.
 *
 * Uso:
 *   npx tsx scripts/backfill-keywords.ts
 *
 * Opcional:
 *   BACKFILL_BATCH_SIZE=150   (default 200)
 *   BACKFILL_DRY_RUN=1        (calcula y cuenta, no escribe en BD)
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { filtrarKeywordsPorSubcategoria } from "../lib/keywordsValidation";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("Faltan variables de entorno (revisa .env.local):");
  missing.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

const BATCH_SIZE = Math.max(
  1,
  Math.min(500, Number.parseInt(String(process.env.BACKFILL_BATCH_SIZE ?? "200"), 10) || 200)
);
const DRY_RUN = String(process.env.BACKFILL_DRY_RUN ?? "").trim() === "1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function firmaKw(a: string[]): string {
  return [...a].map((x) => x.toLowerCase()).sort().join("|");
}

/**
 * Misma semántica que en aprobación: limpieza + expansión de unigramas + fallback por subcategoría.
 */
function limpiarKeywords(
  subcategoriaSlugFinal: string | null | undefined,
  keywordsFinales: unknown
): string[] {
  const sub = String(subcategoriaSlugFinal ?? "").trim();
  const arr = arrStr(keywordsFinales);
  return filtrarKeywordsPorSubcategoria(sub, arr);
}

function keywordsCambiaron(db: unknown, nuevas: string[]): boolean {
  const antes = arrStr(db);
  const despues = nuevas.length > 0 ? nuevas : [];
  return firmaKw(antes) !== firmaKw(despues);
}

type Ejemplo = { id: string; antes: string; despues: string };

async function main() {
  console.log("backfill-keywords");
  console.log(`  batch_size=${BATCH_SIZE}  dry_run=${DRY_RUN ? "yes" : "no"}\n`);

  let totalProcesados = 0;
  let totalActualizados = 0;
  let fallos = 0;
  const ejemplos: Ejemplo[] = [];

  let offset = 0;

  for (;;) {
    const { data: batch, error } = await supabase
      .from("emprendedores")
      .select("id, subcategoria_slug_final, keywords_finales")
      .eq("estado_publicacion", "publicado")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Error leyendo lote:", error.message);
      process.exit(1);
    }

    const rows = (batch ?? []) as Array<{
      id: string;
      subcategoria_slug_final: string | null;
      keywords_finales: unknown;
    }>;

    if (rows.length === 0) break;

    for (const row of rows) {
      totalProcesados++;

      const nuevas = limpiarKeywords(row.subcategoria_slug_final, row.keywords_finales);
      if (!keywordsCambiaron(row.keywords_finales, nuevas)) {
        continue;
      }

      const payload = nuevas.length > 0 ? nuevas : null;
      const antesStr = JSON.stringify(
        row.keywords_finales == null ? null : arrStr(row.keywords_finales)
      );
      const despuesStr = JSON.stringify(nuevas.length > 0 ? nuevas : null);

      if (ejemplos.length < 3) {
        ejemplos.push({
          id: row.id,
          antes: antesStr,
          despues: despuesStr,
        });
      }

      if (DRY_RUN) {
        totalActualizados++;
        continue;
      }

      const { error: upErr } = await supabase
        .from("emprendedores")
        .update({ keywords_finales: payload })
        .eq("id", row.id);

      if (upErr) {
        fallos++;
        console.error(`[error] id=${row.id} ${upErr.message}`);
      } else {
        totalActualizados++;
      }
    }

    offset += rows.length;
    if (rows.length < BATCH_SIZE) break;
  }

  console.log("—".repeat(60));
  console.log("Resumen");
  console.log(`  total procesados:   ${totalProcesados}`);
  console.log(`  total actualizados: ${totalActualizados}${DRY_RUN ? " (dry-run, no escritos)" : ""}`);
  console.log(`  errores:            ${fallos}`);
  console.log("—".repeat(60));
  console.log("Ejemplos antes / después (hasta 3 primeros cambios):");
  if (ejemplos.length === 0) {
    console.log("  (ningún cambio detectado en esta corrida)");
  } else {
    for (const e of ejemplos) {
      console.log(`  id: ${e.id}`);
      console.log(`    antes:   ${e.antes}`);
      console.log(`    después: ${e.despues}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
