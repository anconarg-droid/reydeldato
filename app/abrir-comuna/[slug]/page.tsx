import { createClient } from "@supabase/supabase-js";
import AbrirComunaClient from "./AbrirComunaClient";

export const dynamic = "force-dynamic";

function prettySlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function AbrirComunaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const comunaNombre = prettySlug(slug);

  const [
    { data: resumen },
    { data: ultimosEmp },
    { data: ultimosVec },
    { data: activos },
  ] = await Promise.all([
    supabase
      .from("vw_comunas_por_abrir")
      .select("*")
      .eq("comuna_slug", slug)
      .maybeSingle(),

    supabase
      .from("comunas_pre_registro_emprendedores")
      .select(
        "id,nombre_contacto,nombre_emprendimiento,categoria_referencial,descripcion_corta,created_at"
      )
      .eq("comuna_slug", slug)
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("comunas_pre_registro_vecinos")
      .select("id,contacto,tipo_contacto,created_at")
      .eq("comuna_slug", slug)
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("comunas_activas")
      .select("comuna_slug, comuna_nombre, activa")
      .eq("comuna_slug", slug)
      .eq("activa", true)
      .maybeSingle(),
  ]);

  const comunaActiva = !!activos;

  return (
    <AbrirComunaClient
      slug={slug}
      comunaNombre={resumen?.comuna_nombre || comunaNombre}
      comunaActiva={comunaActiva}
      resumen={
        resumen || {
          comuna_slug: slug,
          comuna_nombre: comunaNombre,
          total_emprendedores: 0,
          total_vecinos: 0,
          total_interesados: 0,
          avance_porcentaje: 0,
          estado_apertura: "sin_movimiento",
          faltan_emprendedores_meta: 40,
          ultimo_registro_at: null,
        }
      }
      ultimosEmprendedores={ultimosEmp || []}
      ultimosVecinos={ultimosVec || []}
    />
  );
}