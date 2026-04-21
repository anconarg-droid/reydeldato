-- =============================================================================
-- Reparación: vw_emprendedores_publico debe exponer (entre otras) columnas que
-- usa PostgREST / getEmprendedorPublicoBySlug:
-- - estado_publicacion — .eq("estado_publicacion", "publicado") (error 42703 si falta)
-- - comuna_id — COALESCE(e.comuna_id, e.comuna_base_id) AS comuna_id (42703 si falta)
-- Si la vista quedó vieja o se creó a mano sin estas columnas, recrear con este script.
-- Misma definición que 20260408140000_vw_emprendedores_publico.sql
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_emprendedores_publico AS
SELECT
  e.id,
  e.slug,

  COALESCE(NULLIF(trim(e.nombre_emprendimiento), ''), e.nombre) AS nombre_emprendimiento,
  COALESCE(e.nombre, NULLIF(trim(e.nombre_emprendimiento), '')) AS nombre,

  e.frase_negocio,
  e.descripcion_corta,
  e.descripcion_libre,
  e.descripcion_larga,
  e.foto_principal_url,

  COALESCE(NULLIF(trim(e.whatsapp_principal), ''), e.whatsapp) AS whatsapp_principal,
  e.instagram,
  COALESCE(NULLIF(trim(e.sitio_web), ''), NULLIF(trim(e.web), '')) AS sitio_web,
  COALESCE(NULLIF(trim(e.web), ''), NULLIF(trim(e.sitio_web), '')) AS web,

  e.estado_publicacion,
  e.created_at,
  e.updated_at,

  COALESCE(e.comuna_id, e.comuna_base_id) AS comuna_id,
  e.comuna_base_id,
  cb.slug AS comuna_base_slug,
  cb.nombre AS comuna_base_nombre,
  reg.slug AS region_slug,
  reg.nombre AS region_nombre,
  COALESCE(e.cobertura_tipo, e.nivel_cobertura) AS cobertura_tipo,
  e.nivel_cobertura,

  e.categoria_id,
  e.categoria_slug_final,
  cat.nombre AS categoria_nombre,
  e.subcategorias_slugs,
  (
    SELECT COALESCE(array_agg(s.nombre ORDER BY s.nombre), ARRAY[]::text[])
    FROM public.subcategorias s
    WHERE s.slug = ANY(COALESCE(e.subcategorias_slugs, ARRAY[]::text[]))
  ) AS subcategorias_nombres_arr,
  e.subcategoria_slug_final,

  e.keywords_finales,

  (
    SELECT COALESCE(array_agg(m.modalidad ORDER BY m.modalidad), ARRAY[]::text[])
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

  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'nombre_local', NULLIF(trim(l.nombre_local), ''),
          'direccion', trim(l.direccion),
          'referencia', COALESCE(NULLIF(trim(l.referencia), ''), ''),
          'comuna_nombre', COALESCE(c.nombre, ''),
          'comuna_slug', COALESCE(c.slug, ''),
          'es_principal', (l.es_principal IS TRUE)
        )
        ORDER BY (l.es_principal IS TRUE) DESC, l.id ASC
      ),
      '[]'::jsonb
    )
    FROM public.emprendedor_locales l
    LEFT JOIN public.comunas c ON c.id = l.comuna_id
    WHERE l.emprendedor_id = e.id
  ) AS locales
FROM public.emprendedores e
LEFT JOIN public.comunas cb ON cb.id = COALESCE(e.comuna_base_id, e.comuna_id)
LEFT JOIN public.regiones reg ON reg.id = cb.region_id
LEFT JOIN public.categorias cat ON cat.id = e.categoria_id OR cat.slug = e.categoria_slug_final;

GRANT SELECT ON public.vw_emprendedores_publico TO anon, authenticated;
