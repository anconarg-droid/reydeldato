// app/api/reindex/route.ts
import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // importante: Algolia + service role en server

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

async function handler(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";

  const REINDEX_SECRET = requiredEnv("REINDEX_SECRET");
  if (secret !== REINDEX_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized (secret incorrecto)" },
      { status: 401 }
    );
  }

  // --- ENV ---
  const SUPABASE_URL = requiredEnv("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const ALGOLIA_APP_ID = requiredEnv("ALGOLIA_APP_ID");
  const ALGOLIA_ADMIN_KEY = requiredEnv("ALGOLIA_ADMIN_KEY");
  // si no existe, cae al default "emprendedores"
  const ALGOLIA_INDEX =
    process.env.ALGOLIA_INDEX_EMPRENDEDORES_PUBLICOS || "emprendedores";

  // --- CLIENTS (server) ---
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = algolia.initIndex(ALGOLIA_INDEX);

  // --- TRAER SOLO PUBLICADOS ---
  // OJO: esto requiere que exista la columna `publicado` boolean en la tabla.
  const { data, error } = await supabase
    .from("emprendedores")
    .select(
      [
        "id",
        "nombre",
        "slug",
        "descripcion",
        "descripcion_corta",
        "descripcion_larga",
        "comuna_base_id",
        "nivel_cobertura",
        "coverage_keys",
        "coverage_labels",
        "categoria_id",
        "whatsapp",
        "email",
        "instagram",
        "sitio_web",
        "logo_path",
        "created_at",
      ].join(",")
    )
    .eq("publicado", true);

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Supabase error: ${error.message}` },
      { status: 500 }
    );
  }

  const rows = data || [];

  // --- MAPEAR A OBJETOS ALGOLIA ---
  const objects = rows.map((r: any) => {
    const nombre = (r?.nombre || "").toString();
    const desc =
      (r?.descripcion_larga ||
        r?.descripcion_corta ||
        r?.descripcion ||
        "")?.toString() || "";

    const search_text = [
      nombre,
      desc,
      (r?.coverage_labels || []).join(" "),
      (r?.coverage_keys || []).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      objectID: r.id, // clave en Algolia
      id: r.id,
      nombre,
      slug: r.slug,
      descripcion_corta: r.descripcion_corta,
      descripcion_larga: r.descripcion_larga,
      descripcion: r.descripcion,

      comuna_base_id: r.comuna_base_id,
      nivel_cobertura: r.nivel_cobertura,
      coverage_keys: r.coverage_keys || [],
      coverage_labels: r.coverage_labels || [],

      categoria_id: r.categoria_id,

      whatsapp: r.whatsapp,
      email: r.email,
      instagram: r.instagram,
      sitio_web: r.sitio_web,
      logo_path: r.logo_path,

      created_at: r.created_at,

      search_text,
    };
  });

  // --- SUBIR A ALGOLIA ---
  // Si quieres “limpiar y reemplazar”, descomenta el clearObjects.
  // await index.clearObjects();

  const res = await index.saveObjects(objects, {
    autoGenerateObjectIDIfNotExist: false,
  });

  return NextResponse.json({
    ok: true,
    index: ALGOLIA_INDEX,
    total_indexados: objects.length,
    taskID: res.taskID,
  });
}

// ✅ Soporta GET (navegador)
export async function GET(req: Request) {
  return handler(req);
}

// ✅ Soporta POST (si después lo llamas desde código)
export async function POST(req: Request) {
  return handler(req);
}