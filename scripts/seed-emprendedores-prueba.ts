import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

function argValue(flag: string): string | null {
  const idx = process.argv.findIndex((a) => a === flag);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return null;
  return v.trim() || null;
}

function reqConfig(name: string, envName: string, flag: string): string {
  const fromArg = argValue(flag);
  if (fromArg) return fromArg;
  const fromEnv = process.env[envName];
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  throw new Error(`Missing required config: ${name}. Provide env ${envName} or ${flag} <value>.`);
}

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function slugify(text: string): string {
  return s(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ComunaRow = { id: string; slug: string; nombre: string; region_id: string | null };
type RegionRow = { id: string; slug: string; nombre: string };

async function getComunaBySlug(
  supabase: SupabaseClient<any, "public", any>,
  slug: string
): Promise<ComunaRow> {
  const { data, error } = await supabase
    .from("comunas")
    .select("id, slug, nombre, region_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Comuna no encontrada: ${slug}. ${error?.message ?? ""}`.trim());
  }
  return data as ComunaRow;
}

async function getRegionById(
  supabase: SupabaseClient<any, "public", any>,
  id: string
): Promise<RegionRow> {
  const { data, error } = await supabase
    .from("regiones")
    .select("id, slug, nombre")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`Región no encontrada por id: ${id}. ${error?.message ?? ""}`.trim());
  }
  return data as RegionRow;
}

async function main() {
  const supabaseUrl = reqConfig("Supabase URL", "NEXT_PUBLIC_SUPABASE_URL", "--url");
  const supabaseServiceKey = reqConfig("Supabase service role key", "SUPABASE_SERVICE_ROLE_KEY", "--serviceKey");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Tomar una categoría/subcategoría válida para que vistas y fichas queden completas.
  const { data: categoriaRow, error: catErr } = await supabase
    .from("categorias")
    .select("id, slug, nombre")
    .order("nombre", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (catErr || !categoriaRow) throw new Error(`No pude obtener categorías. ${catErr?.message ?? ""}`.trim());

  const { data: subRow, error: subErr } = await supabase
    .from("subcategorias")
    .select("id, slug, nombre, categoria_id")
    .eq("categoria_id", (categoriaRow as any).id)
    .order("nombre", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (subErr || !subRow) throw new Error(`No pude obtener subcategorías. ${subErr?.message ?? ""}`.trim());

  const comunaCalera = await getComunaBySlug(supabase, "calera-de-tango");
  const comunaMaipu = await getComunaBySlug(supabase, "maipu");
  const comunaIsla = await getComunaBySlug(supabase, "isla-de-maipo");
  const comunaCerrillos = await getComunaBySlug(supabase, "cerrillos");
  const comunaPadreHurtado = await getComunaBySlug(supabase, "padre-hurtado");

  if (!comunaMaipu.region_id) throw new Error("Maipú no tiene region_id.");
  const regionRM = await getRegionById(supabase, comunaMaipu.region_id);

  const now = Date.now();
  const common = {
    descripcion_corta: "Emprendimiento de prueba (seed).",
    descripcion_larga: "Registro de prueba creado automáticamente para desarrollo y QA.",
    foto_principal_url: "/placeholder-emprendedor.jpg",
    instagram: null,
    sitio_web: null,
    web: null,
    mostrar_responsable: true,
    modalidades_atencion: ["domicilio"],
    keywords: ["prueba", "seed", "qa"],
    keywords_finales: ["prueba", "seed", "qa"],
    keywords_usuario: ["prueba", "seed", "qa"],
    keywords_usuario_json: ["prueba", "seed", "qa"],
    estado: "ok",
    estado_publicacion: "publicado",
    form_completo: true,
    origen_registro: "seed_script",
    categoria_id: (categoriaRow as any).id as string,
    subcategorias_slugs: [(subRow as any).slug as string],
    categoria_slug_final: (categoriaRow as any).slug as string,
    subcategoria_slug_final: (subRow as any).slug as string,
  };

  const seeds = [
    {
      key: "solo_mi_comuna_calera",
      nombre: "Prueba Solo Comuna (Calera de Tango)",
      comuna_base: comunaCalera,
      nivel_cobertura: "solo_mi_comuna",
      cobertura: "solo_mi_comuna",
      coverage_keys: [comunaCalera.slug],
      coverage_labels: [comunaCalera.nombre],
      comunas_cobertura: [] as ComunaRow[],
      regiones_cobertura: [] as RegionRow[],
    },
    {
      key: "varias_comunas_maipu",
      nombre: "Prueba Varias Comunas (Maipú)",
      comuna_base: comunaMaipu,
      nivel_cobertura: "varias_comunas",
      cobertura: "varias_comunas",
      coverage_keys: [comunaIsla.slug, comunaCerrillos.slug, comunaPadreHurtado.slug],
      coverage_labels: [comunaIsla.nombre, comunaCerrillos.nombre, comunaPadreHurtado.nombre],
      comunas_cobertura: [comunaIsla, comunaCerrillos, comunaPadreHurtado],
      regiones_cobertura: [] as RegionRow[],
    },
    {
      key: "regional_rm",
      nombre: "Prueba Regional (RM)",
      comuna_base: comunaMaipu,
      nivel_cobertura: "regional",
      cobertura: "regional",
      coverage_keys: [regionRM.slug],
      coverage_labels: [regionRM.nombre],
      comunas_cobertura: [] as ComunaRow[],
      regiones_cobertura: [regionRM],
    },
    {
      key: "nacional",
      nombre: "Prueba Nacional (Todo Chile)",
      comuna_base: comunaMaipu,
      nivel_cobertura: "nacional",
      cobertura: "nacional",
      coverage_keys: ["nacional"],
      coverage_labels: ["Nacional"],
      comunas_cobertura: [] as ComunaRow[],
      regiones_cobertura: [] as RegionRow[],
    },
  ] as const;

  const created: Array<{ key: string; id: string; slug: string; nombre: string }> = [];

  for (const seed of seeds) {
    const slug = `${slugify(seed.nombre)}-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const whatsapp = `+56990${Math.floor(100000 + Math.random() * 899999)}`; // formato simple
    const email = `seed-${seed.key}-${now}@example.com`;

    const insertPayload: Record<string, unknown> = {
      ...common,
      slug,
      nombre: seed.nombre,
      responsable_nombre: "Seed QA",
      whatsapp,
      email,
      comuna_base_id: seed.comuna_base.id,
      direccion: null,
      nivel_cobertura: seed.nivel_cobertura,
      cobertura: seed.cobertura,
      coverage_keys: seed.coverage_keys,
      coverage_labels: seed.coverage_labels,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("emprendedores")
      .insert(insertPayload)
      .select("id, slug, nombre")
      .single();

    if (insErr || !inserted) {
      throw new Error(`Error insertando emprendedor (${seed.key}): ${insErr?.message ?? "unknown"}`);
    }

    const emprendedorId = (inserted as any).id as string;

    const { error: subRelErr } = await supabase.from("emprendedor_subcategorias").insert({
      emprendedor_id: emprendedorId,
      subcategoria_id: (subRow as any).id as string,
    });
    if (subRelErr) {
      throw new Error(`Error insertando emprendedor_subcategorias (${seed.key}): ${subRelErr.message}`);
    }

    if (seed.comunas_cobertura.length) {
      const rows = seed.comunas_cobertura.map((c) => ({
        emprendedor_id: emprendedorId,
        comuna_id: c.id,
      }));
      const { error: relErr } = await supabase.from("emprendedor_comunas_cobertura").insert(rows);
      if (relErr) {
        throw new Error(`Error insertando comunas cobertura (${seed.key}): ${relErr.message}`);
      }
    }

    if (seed.regiones_cobertura.length) {
      const rows = seed.regiones_cobertura.map((r) => ({
        emprendedor_id: emprendedorId,
        region_id: r.id,
      }));
      const { error: relErr } = await supabase.from("emprendedor_regiones_cobertura").insert(rows);
      if (relErr) {
        throw new Error(`Error insertando regiones cobertura (${seed.key}): ${relErr.message}`);
      }
    }

    created.push({
      key: seed.key,
      id: emprendedorId,
      slug: (inserted as any).slug as string,
      nombre: (inserted as any).nombre as string,
    });
  }

  console.log("✅ Emprendedores de prueba creados:");
  for (const c of created) {
    console.log(`- ${c.key}: ${c.nombre} | id=${c.id} | slug=${c.slug}`);
  }
}

main().catch((err) => {
  console.error("❌ seed-emprendedores-prueba failed:", err);
  process.exit(1);
});

