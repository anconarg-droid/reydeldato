-- =============================================================================
-- Ficha pública: exponer nombre del responsable cuando está autorizado
-- =============================================================================
-- `nombre_responsable` solo se devuelve si `mostrar_responsable_publico` es true
-- (misma regla que el panel al guardar). Sin esto, la vista no incluía la columna
-- y `getEmprendedorPublicoBySlug` / FichaHero no podían mostrar "Atendido por …".
-- Basado en 20260430250000_emprendedor_locales_lat_lng_y_vw_publico.sql
-- =============================================================================

DROP VIEW IF EXISTS public.vw_emprendedores_publico;

CREATE VIEW public.vw_emprendedores_publico AS
SELECT
  e.id,
  e.slug,

  NULLIF(trim(e.nombre_emprendimiento), '') AS nombre_emprendimiento,
  NULLIF(trim(e.nombre_emprendimiento), '') AS nombre,

  e.frase_negocio,
  e.frase_negocio AS descripcion_corta,
  e.descripcion_libre,
  e.descripcion_libre AS descripcion_larga,
  e.foto_principal_url,

  NULLIF(trim(e.whatsapp_principal), '') AS whatsapp_principal,
  NULLIF(trim(e.whatsapp_secundario), '') AS whatsapp_secundario,
  e.instagram,
  NULLIF(trim(e.sitio_web), '') AS sitio_web,
  NULLIF(trim(e.sitio_web), '') AS web,

  CASE
    WHEN e.mostrar_responsable_publico IS TRUE
    THEN NULLIF(trim(e.nombre_responsable), '')
    ELSE NULL
  END AS nombre_responsable,

  e.estado_publicacion,
  e.created_at,
  e.updated_at,

  e.comuna_id,
  e.comuna_id AS comuna_base_id,
  cb.slug AS comuna_base_slug,
  cb.nombre AS comuna_base_nombre,
  reg.slug AS region_slug,
  reg.nombre AS region_nombre,
  e.cobertura_tipo,
  e.cobertura_tipo AS nivel_cobertura,

  e.categoria_id,
  e.categoria_slug_final,
  cat.nombre AS categoria_nombre,
  CASE
    WHEN NULLIF(trim(e.subcategoria_slug_final), '') IS NULL THEN ARRAY[]::text[]
    ELSE ARRAY[trim(e.subcategoria_slug_final)]
  END AS subcategorias_slugs,
  (
    SELECT COALESCE(array_agg(s.nombre ORDER BY s.nombre), ARRAY[]::text[])
    FROM public.subcategorias s
    WHERE s.slug = ANY(
      CASE
        WHEN NULLIF(trim(e.subcategoria_slug_final), '') IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[trim(e.subcategoria_slug_final)]
      END
    )
  ) AS subcategorias_nombres_arr,
  e.subcategoria_slug_final,

  e.keywords_finales,

  (
    SELECT COALESCE(
      array_agg(m.modalidad::text ORDER BY m.modalidad::text),
      ARRAY[]::text[]
    )
    FROM public.emprendedor_modalidades m
    WHERE m.emprendedor_id = e.id
  ) AS modalidades_atencion_arr,

  (
    SELECT COALESCE(array_agg(g.imagen_url ORDER BY g.imagen_url), ARRAY[]::text[])
    FROM public.emprendedor_galeria g
    WHERE g.emprendedor_id = e.id
  ) AS galeria_urls_arr,

  (
    SELECT COALESCE(array_agg(c.nombre ORDER BY c.nombre), ARRAY[]::text[])
    FROM public.emprendedor_comunas_cobertura ecc
    JOIN public.comunas c ON c.id = ecc.comuna_id
    WHERE ecc.emprendedor_id = e.id
  ) AS comunas_cobertura_nombres_arr,
  (
    SELECT COALESCE(array_agg(c.slug ORDER BY c.slug), ARRAY[]::text[])
    FROM public.emprendedor_comunas_cobertura ecc
    JOIN public.comunas c ON c.id = ecc.comuna_id
    WHERE ecc.emprendedor_id = e.id
  ) AS comunas_cobertura_slugs_arr,
  (
    SELECT COALESCE(array_agg(r.nombre ORDER BY r.nombre), ARRAY[]::text[])
    FROM public.emprendedor_regiones_cobertura erc
    JOIN public.regiones r ON r.id = erc.region_id
    WHERE erc.emprendedor_id = e.id
  ) AS regiones_cobertura_nombres_arr,
  (
    SELECT COALESCE(array_agg(r.slug ORDER BY r.slug), ARRAY[]::text[])
    FROM public.emprendedor_regiones_cobertura erc
    JOIN public.regiones r ON r.id = erc.region_id
    WHERE erc.emprendedor_id = e.id
  ) AS regiones_cobertura_slugs_arr,

  e.comunas_cobertura,
  e.regiones_cobertura,

  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'nombre_local', NULLIF(trim(l.nombre_local), ''),
          'direccion', trim(l.direccion),
          'referencia', COALESCE(NULLIF(trim(l.referencia), ''), ''),
          'comuna_nombre', COALESCE(c.nombre, ''),
          'comuna_slug', COALESCE(c.slug, ''),
          'es_principal', (l.es_principal IS TRUE),
          'lat', l.lat,
          'lng', l.lng
        )
        ORDER BY (l.es_principal IS TRUE) DESC, l.id ASC
      ),
      '[]'::jsonb
    )
    FROM public.emprendedor_locales l
    LEFT JOIN public.comunas c ON c.id = l.comuna_id
    WHERE l.emprendedor_id = e.id
  ) AS locales,

  e.tipo_actividad,
  e.sector_slug,
  e.tags_slugs,
  e.clasificacion_confianza,
  e.palabras_clave AS keywords,
  e.palabras_clave,

  e.plan,
  e.plan_activo,
  e.plan_expira_at,
  e.trial_expira_at,

  NULL::text AS plan_tipo,
  NULL::text AS plan_periodicidad,
  NULL::timestamptz AS plan_inicia_at,
  NULL::timestamptz AS trial_inicia_at,

  e.destacado

FROM public.emprendedores e
LEFT JOIN public.comunas cb ON cb.id = e.comuna_id
LEFT JOIN public.regiones reg ON reg.id = cb.region_id
LEFT JOIN public.categorias cat ON cat.id = e.categoria_id OR cat.slug = e.categoria_slug_final;

GRANT SELECT ON public.vw_emprendedores_publico TO anon, authenticated;
