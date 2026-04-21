import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  countGaleriaPivotByEmprendedorIds,
  normalizeEmprendedorId,
} from "@/lib/emprendedorGaleriaPivot";
import { fichaPublicaEsMejoradaDesdeBusqueda } from "@/lib/estadoFicha";

function createSupabaseStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseStaticClient();
  const baseUrl = "https://reydeldato.cl";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/buscar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/publicar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const { data: comunas } = await supabase
    .from("comunas")
    .select("slug");

  const comunaPages: MetadataRoute.Sitemap =
    (comunas ?? []).map((item: any) => ({
      url: `${baseUrl}/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const { data: emprendedoresRaw } = await supabase
    .from("vw_emprendedores_publico")
    .select(
      "id, slug, comuna_base_slug, subcategorias_slugs, updated_at, nombre_emprendimiento, whatsapp_principal, frase_negocio, comuna_id, cobertura_tipo, descripcion_libre, foto_principal_url, instagram, sitio_web, web, estado_publicacion, created_at"
    )
    .eq("estado_publicacion", "publicado");

  const todos = emprendedoresRaw ?? [];
  const pivotMap = await countGaleriaPivotByEmprendedorIds(
    supabase,
    todos.map((t: { id?: unknown }) => t.id)
  );
  const emprendedoresFichaPublica = todos.filter((item: unknown) => {
    const r = item as Record<string, unknown>;
    const k = normalizeEmprendedorId(r.id);
    return fichaPublicaEsMejoradaDesdeBusqueda(
      r,
      null,
      pivotMap.get(k) ?? 0
    );
  });

  const fichaPages: MetadataRoute.Sitemap = emprendedoresFichaPublica.map(
    (item: any) => ({
      url: `${baseUrl}/emprendedor/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  const pairSet = new Set<string>();

  for (const item of todos) {
    const comuna = item.comuna_base_slug;
    const subs = Array.isArray(item.subcategorias_slugs)
      ? item.subcategorias_slugs
      : [];

    if (!comuna) continue;

    for (const sub of subs) {
      if (!sub) continue;
      pairSet.add(`${comuna}|||${sub}`);
    }
  }

  const seoPages: MetadataRoute.Sitemap = Array.from(pairSet).map((value) => {
    const [comuna, subcategoria] = value.split("|||");

    return {
      url: `${baseUrl}/${comuna}/${subcategoria}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    };
  });

  return [
    ...staticPages,
    ...comunaPages,
    ...seoPages,
    ...fichaPages,
  ];
}