-- Nueva versión del RPC territorial del buscador (no rompe la v1).
-- Agrega subcategorías estructuradas (slugs/nombres) vía join + agregación.
--
-- Firma esperada (según referencia del proyecto):
--   p_comuna_id   smallint
--   p_comuna_slug text
--   p_region_slug text
--
-- Reglas ranking_score:
--   base comuna                = 4
--   comunas_cobertura incluye  = 3
--   regiones_cobertura incluye = 2
--   nacional                   = 1
--   else                       = 0
--
-- Filtros:
--   solo emprendimientos con estado_publicacion = 'publicado'
--
-- Orden:
--   ranking_score desc
--   clasificacion_confianza desc nulls last
--   created_at desc

DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_cobertura_v2(smallint, text, text);

CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_cobertura_v2(
  p_comuna_id smallint,
  p_comuna_slug text,
  p_region_slug text
)
RETURNS TABLE (
  id uuid,
  nombre_emprendimiento text,
  slug text,
  comuna_id smallint,
  cobertura_tipo cobertura_tipo,
  comunas_cobertura text[],
  regiones_cobertura text[],
  foto_principal_url text,
  frase_negocio text,
  descripcion_libre text,
  instagram text,
  sitio_web text,
  whatsapp_principal text,
  clasificacion_confianza numeric,
  ranking_score integer,
  subcategorias_slugs text[],
  subcategorias_nombres text[]
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nombre_emprendimiento,
    e.slug,
    e.comuna_id::smallint AS comuna_id,
    e.cobertura_tipo AS cobertura_tipo,
    e.comunas_cobertura,
    e.regiones_cobertura,
    e.foto_principal_url,
    e.frase_negocio,
    e.descripcion_libre,
    e.instagram,
    e.sitio_web,
    e.whatsapp_principal,
    e.clasificacion_confianza::numeric AS clasificacion_confianza,
    (
      CASE
        WHEN e.comuna_id::smallint = p_comuna_id THEN 4
        WHEN e.cobertura_tipo = 'varias_comunas'
          AND p_comuna_slug IS NOT NULL
          AND p_comuna_slug <> ''
          AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
          THEN 3
        WHEN e.cobertura_tipo = 'varias_regiones'
          AND p_region_slug IS NOT NULL
          AND p_region_slug <> ''
          AND p_region_slug = ANY (COALESCE(e.regiones_cobertura, ARRAY[]::text[]))
          THEN 2
        WHEN e.cobertura_tipo = 'nacional' THEN 1
        ELSE 0
      END
    )::integer AS ranking_score,
    COALESCE(sc.sub_slugs, ARRAY[]::text[]) AS subcategorias_slugs,
    COALESCE(sc.sub_nombres, ARRAY[]::text[]) AS subcategorias_nombres
  FROM public.emprendedores e
  -- Agregación lateral para evitar duplicar filas por join N:N.
  LEFT JOIN LATERAL (
    SELECT
      ARRAY_AGG(DISTINCT s.slug ORDER BY s.slug) AS sub_slugs,
      ARRAY_AGG(DISTINCT s.nombre ORDER BY s.nombre) AS sub_nombres
    FROM public.emprendedor_subcategorias es
    JOIN public.subcategorias s ON s.id = es.subcategoria_id
    WHERE es.emprendedor_id = e.id
  ) sc ON true
  WHERE
    e.estado_publicacion = 'publicado'
    AND (
      -- Misma lógica territorial que v1: solo devolver filas con score 1..4 (no incluir 0)
      e.comuna_id::smallint = p_comuna_id
      OR (
        e.cobertura_tipo = 'varias_comunas'
        AND p_comuna_slug IS NOT NULL
        AND p_comuna_slug <> ''
        AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
      )
      OR (
        e.cobertura_tipo = 'varias_regiones'
        AND p_region_slug IS NOT NULL
        AND p_region_slug <> ''
        AND p_region_slug = ANY (COALESCE(e.regiones_cobertura, ARRAY[]::text[]))
      )
      OR e.cobertura_tipo = 'nacional'
    )
  ORDER BY
    ranking_score DESC,
    e.clasificacion_confianza DESC NULLS LAST,
    e.created_at DESC;
$$;

COMMENT ON FUNCTION public.buscar_emprendedores_por_cobertura_v2(smallint, text, text) IS
  'V2: Lista emprendedores publicados con ranking territorial (4 base, 3 comunas_cobertura, 2 regiones_cobertura, 1 nacional) y agrega subcategorías (slugs/nombres) agregadas.';

GRANT EXECUTE ON FUNCTION public.buscar_emprendedores_por_cobertura_v2(smallint, text, text) TO anon, authenticated, service_role;

