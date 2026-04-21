-- Expone WhatsApp desde whatsapp_principal (obligatorio) con fallback a e.whatsapp legacy.
-- Misma definición que 20260420000001 salvo la columna `whatsapp`.

CREATE OR REPLACE VIEW public.vw_emprendedores_algolia_final AS
SELECT
  e.id,
  e.slug,
  e.nombre,
  e.descripcion_corta,
  e.descripcion_larga,
  e.foto_principal_url,
  COALESCE(NULLIF(trim(e.whatsapp_principal), ''), NULLIF(trim(e.whatsapp), '')) AS whatsapp,
  e.instagram,
  e.sitio_web,
  e.email,

  e.estado_publicacion,
  (e.estado_publicacion = 'publicado') AS publicado,

  e.nivel_cobertura,
  e.nivel_cobertura AS cobertura_tipo,

  cb.slug AS comuna_base_slug,
  cb.nombre AS comuna_base_nombre,
  reg.nombre AS region_nombre,
  reg.slug AS region_slug,

  e.categoria_slug_final AS categoria_slug,
  cat.nombre AS categoria_nombre,

  e.subcategoria_slug_final AS subcategoria_slug,
  subp.nombre AS subcategoria_nombre,

  e.subcategorias_slugs AS subcategorias_slugs_arr,
  (
    SELECT COALESCE(array_agg(s.nombre ORDER BY s.nombre), ARRAY[]::text[])
    FROM public.subcategorias s
    WHERE s.slug = ANY(COALESCE(e.subcategorias_slugs, ARRAY[]::text[]))
  ) AS subcategorias_nombres_arr,

  e.keywords_finales AS keywords,

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
    SELECT COALESCE(array_agg(c.slug ORDER BY c.slug), ARRAY[]::text[])
    FROM public.emprendedor_comunas_cobertura ecc
    JOIN public.comunas c ON c.id = ecc.comuna_id
    WHERE ecc.emprendedor_id = e.id
  ) AS cobertura_comunas,

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

  LOWER(
    translate(
      CONCAT_WS(
        ' ',
        e.nombre,
        e.descripcion_corta,
        e.descripcion_larga,
        cat.nombre,
        subp.nombre,
        cb.nombre,
        array_to_string(COALESCE(e.keywords_finales, ARRAY[]::text[]), ' ')
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
