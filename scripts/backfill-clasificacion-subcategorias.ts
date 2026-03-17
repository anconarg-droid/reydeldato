/**
 * Backfill: asigna subcategorías a emprendimientos existentes usando texto libre + IA.
 * Ejecutar una vez para normalizar datos históricos.
 *
 * Uso (carga automática de .env.local):
 *   npx tsx scripts/backfill-clasificacion-subcategorias.ts
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local explícitamente (scripts fuera de Next.js no lo cargan por defecto)
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";
import { classifyAndAssignBusiness } from "../lib/classifyBusiness";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("Faltan variables de entorno (revisa .env.local):");
  missing.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Emprendimientos publicados (o todos si quieres incluir borradores/pendientes)
  const { data: rows, error } = await supabase
    .from("emprendedores")
    .select("id, nombre, descripcion_corta, descripcion_larga")
    .eq("estado_publicacion", "publicado");

  if (error) {
    console.error("Error listando emprendedores:", error.message);
    process.exit(1);
  }

  const list = (rows ?? []) as Array<{
    id: string;
    nombre: string;
    descripcion_corta: string;
    descripcion_larga: string | null;
  }>;
  console.log(`Emprendimientos a procesar: ${list.length}`);

  let ok = 0;
  let fail = 0;
  let noText = 0;
  const sinClasificacion: Array<{ id: string; nombre: string }> = [];

  for (let i = 0; i < list.length; i++) {
    const emp = list[i];
    const text = [emp.nombre, emp.descripcion_corta, emp.descripcion_larga].filter(Boolean).join(" ").trim();
    if (text.length < 5) {
      noText++;
      console.log(`[${i + 1}/${list.length}] ${emp.id} - sin texto suficiente, omitido`);
      continue;
    }

    const result = await classifyAndAssignBusiness(supabase, emp.id);
    if (result.ok && result.subcategoriasAssigned > 0) {
      ok++;
      console.log(
        `[${i + 1}/${list.length}] ${emp.id} - ${result.subcategoriasAssigned} subcategoría(s), principal: ${result.principalId ?? "—"}`
      );
    } else {
      fail++;
      if (result.needsManualReview || result.subcategoriasAssigned === 0) {
        sinClasificacion.push({ id: emp.id, nombre: emp.nombre || "(sin nombre)" });
      }
      console.log(`[${i + 1}/${list.length}] ${emp.id} - ${result.error ?? "sin subcategoría"}`);
    }

    // Evitar rate limit OpenAI
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nResumen:");
  console.log(`  OK: ${ok}`);
  console.log(`  Sin subcategoría / error: ${fail}`);
  console.log(`  Sin texto: ${noText}`);

  if (sinClasificacion.length > 0) {
    console.log("\n--- Sin clasificación automática (requieren selección manual) ---");
    sinClasificacion.forEach(({ id, nombre }) => console.log(`  id: ${id}  nombre: ${nombre}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
