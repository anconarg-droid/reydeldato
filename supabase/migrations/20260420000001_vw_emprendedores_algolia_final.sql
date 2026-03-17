-- =============================================================================
-- Vista oficial para indexación Algolia (emprendedores)
-- Fuente de verdad: *_final (no usar *_detectada ni productos_detectados como principal)
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_emprendedores_algolia_final AS
SELECT
  e.id,
  e.slug,
  e.nombre,
  e.descripcion_corta,
  e.descripcion_larga,
  e.foto_principal_url,
  e.whatsapp,
  e.instagram,
  e.sitio_web,
  e.email,

  e.estado_publicacion,
  (e.estado_publicacion = 'publicado') AS publicado,

  e.nivel_cobertura,

  -- Comuna base + región (público)
  cb.slug AS comuna_base_slug,
  cb.nombre AS comuna_base_nombre,
  reg.nombre AS region_nombre,

  -- Taxonomía oficial para indexación (solo *_final como fuente)
  e.categoria_slug_final AS categoria_slug,
  cat.nombre AS categoria_nombre,

  e.subcategoria_slug_final AS subcategoria_slug,
  subp.nombre AS subcategoria_nombre,

  -- Exponer también la lista interna (para compatibilidad de features públicas existentes)
  e.subcategorias_slugs AS subcategorias_slugs_arr,
  (
    SELECT COALESCE(array_agg(s.nombre ORDER BY s.nombre), ARRAY[]::text[])
    FROM public.subcategorias s
    WHERE s.slug = ANY(COALESCE(e.subcategorias_slugs, ARRAY[]::text[]))
  ) AS subcategorias_nombres_arr,

  -- Keywords oficiales (finales)
  e.keywords_finales AS keywords,

  -- Cobertura por comunas (público)
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

  -- Cobertura por regiones (público; útil para filtros)
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

  -- Texto consolidado para búsquedas server-side, normalizado (sin tildes, minúsculas)
  LOWER(
    translate(
      TRIM(
        COALESCE(e.nombre, '') || ' ' ||
        COALESCE(e.descripcion_corta, '') || ' ' ||
        COALESCE(e.descripcion_larga, '') || ' ' ||
        COALESCE(cat.nombre, '') || ' ' ||
        COALESCE(cb.nombre, '')
      ),
      'áéíóúÁÉÍÓÚÑ',
      'aeiouaeiounn'
    )
  ) AS search_text

FROM public.emprendedores e
LEFT JOIN public.comunas cb ON cb.id = e.comuna_base_id
LEFT JOIN public.regiones reg ON reg.id = cb.region_id
LEFT JOIN public.categorias cat ON cat.slug = e.categoria_slug_final
LEFT JOIN public.subcategorias subp ON subp.slug = e.subcategoria_slug_final;

