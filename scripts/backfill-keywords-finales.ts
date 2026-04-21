/**
 * Regenera `emprendedores.keywords_finales` con la misma lógica que la aprobación
 * (`filtrarKeywordsPorSubcategoria`: dedupe, filtro suave, unigramas desde bigramas).
 *
 * Uso:
 *   npx tsx scripts/backfill-keywords-finales.ts
 *
 * Dry-run (solo imprime cambios, no escribe):
 *   BACKFILL_DRY_RUN=1 npx tsx scripts/backfill-keywords-finales.ts
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

const DRY = String(process.env.BACKFILL_DRY_RUN ?? "").trim() === "1";

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

async function main() {
  const { data: rows, error } = await supabase
    .from("emprendedores")
    .select("id, slug, subcategoria_slug_final, keywords_finales")
    .eq("estado_publicacion", "publicado")
    .not("keywords_finales", "is", null);

  if (error) {
    console.error("Error listando emprendedores:", error.message);
    process.exit(1);
  }

  const list = (rows ?? []) as Array<{
    id: string;
    slug: string | null;
    subcategoria_slug_final: string | null;
    keywords_finales: unknown;
  }>;

  console.log(`Filas con keywords_finales no nulas: ${list.length}`);
  if (DRY) console.log("Modo DRY-RUN: no se escribirá en BD.\n");

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const antes = arrStr(r.keywords_finales);
    if (antes.length === 0) {
      unchanged++;
      continue;
    }

    const subSlug = String(r.subcategoria_slug_final ?? "").trim();
    const despues = filtrarKeywordsPorSubcategoria(subSlug, antes);

    if (firmaKw(antes) === firmaKw(despues)) {
      unchanged++;
      continue;
    }

    const label = r.slug || r.id;
    console.log(`[${i + 1}/${list.length}] ${label}`);
    console.log(`  antes:   ${JSON.stringify(antes)}`);
    console.log(`  después: ${JSON.stringify(despues)}`);

    if (DRY) {
      updated++;
      continue;
    }

    const { error: upErr } = await supabase
      .from("emprendedores")
      .update({
        keywords_finales: despues.length ? despues : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    if (upErr) {
      failed++;
      console.error(`  ERROR: ${upErr.message}`);
    } else {
      updated++;
    }
  }

  console.log("\nResumen:");
  console.log(`  actualizados o dry-run con cambio: ${updated}`);
  console.log(`  sin cambios (misma firma): ${unchanged}`);
  console.log(`  errores: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
