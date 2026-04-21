-- =============================================================================
-- Admin: desglose de apertura por comuna × rubro (rubros_apertura).
-- Misma noción territorial que count_emprendedores_abrir_comuna_activacion:
-- base, comuna_id legacy, pivot comunas, comunas_cobertura[], regional, nacional.
-- No altera funciones ni vistas públicas de producto; solo añade vista + RPC admin.
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_admin_apertura_rubro_por_comuna AS
SELECT
  c.slug AS comuna_slug,
  c.nombre AS comuna_nombre,
  ra.subcategoria_slug,
  COALESCE(ra.nombre, sc.nombre, ra.subcategoria_slug)::text AS subcategoria_nombre,
  ra.prioridad,
  ra.maximo_contable AS minimo_requerido,
  COALESCE(cnt.n, 0)::bigint AS empresas_con_este_rubro,
  LEAST(COALESCE(cnt.n, 0), ra.maximo_contable::bigint)::int AS contado_para_meta,
  GREATEST(ra.maximo_contable::bigint - LEAST(COALESCE(cnt.n, 0), ra.maximo_contable::bigint), 0)::int AS faltantes
FROM public.comunas c
INNER JOIN public.rubros_apertura ra ON ra.activo = true
LEFT JOIN public.subcategorias sc ON sc.slug = ra.subcategoria_slug
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT e.id) AS n
  FROM public.emprendedores e
  INNER JOIN public.emprendedor_subcategorias es ON es.emprendedor_id = e.id
  INNER JOIN public.subcategorias s_sub ON s_sub.id = es.subcategoria_id AND s_sub.slug = ra.subcategoria_slug
  WHERE e.estado_publicacion = 'publicado'
    AND (
      e.comuna_base_id = c.id
      OR e.comuna_id = c.id
      OR EXISTS (
        SELECT 1
        FROM public.emprendedor_comunas_cobertura ecc
        WHERE ecc.emprendedor_id = e.id
          AND ecc.comuna_id = c.id
      )
      OR lower(COALESCE(e.cobertura_tipo::text, e.nivel_cobertura::text)) = 'nacional'
      OR (
        lower(COALESCE(e.cobertura_tipo::text, e.nivel_cobertura::text)) IN ('varias_regiones', 'regional')
        AND EXISTS (
          SELECT 1
          FROM public.emprendedor_regiones_cobertura err
          INNER JOIN public.comunas cx ON cx.id = c.id AND err.region_id = cx.region_id
          WHERE err.emprendedor_id = e.id
        )
      )
      OR (
        COALESCE(e.cobertura_tipo::text, '') = 'varias_comunas'
        AND COALESCE(btrim(c.slug::text), '') <> ''
        AND c.slug::text = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
      )
    )
) cnt ON true;

COMMENT ON VIEW public.vw_admin_apertura_rubro_por_comuna IS
  'Admin: por comuna y rubro de apertura, cuántos emprendedores publicados cuentan (con tope a meta) y faltantes. Territorialidad alineada a count_emprendedores_abrir_comuna_activacion.';

GRANT SELECT ON public.vw_admin_apertura_rubro_por_comuna TO service_role;

-- Listado amplio para panel admin (no exponer a anon).
DO $$
DECLARE
  comuna_ty text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO comuna_ty
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'comunas'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF comuna_ty IS NULL THEN
    RAISE EXCEPTION 'Migración: no se encontró public.comunas.id';
  END IF;

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.list_emprendedores_abrir_comuna_activacion_admin(
      p_comuna_id %1$s,
      p_comuna_slug text,
      p_region_slug text,
      p_limit int DEFAULT 400
    )
    RETURNS TABLE (emprendedor_id uuid)
    LANGUAGE sql
    STABLE
    SET search_path = public
    AS $fn$
      SELECT sorted.id AS emprendedor_id
      FROM (
        SELECT e.id, e.created_at
        FROM public.emprendedores e
        WHERE e.estado_publicacion = 'publicado'
          AND (
            e.comuna_base_id = p_comuna_id
            OR e.comuna_id = p_comuna_id
            OR EXISTS (
              SELECT 1
              FROM public.emprendedor_comunas_cobertura ecc
              WHERE ecc.emprendedor_id = e.id
                AND ecc.comuna_id = p_comuna_id
            )
            OR lower(COALESCE(e.cobertura_tipo::text, e.nivel_cobertura::text)) = 'nacional'
            OR (
              lower(COALESCE(e.cobertura_tipo::text, e.nivel_cobertura::text)) IN ('varias_regiones', 'regional')
              AND EXISTS (
                SELECT 1
                FROM public.emprendedor_regiones_cobertura err
                JOIN public.comunas c ON c.id = p_comuna_id
                  AND err.region_id = c.region_id
                WHERE err.emprendedor_id = e.id
              )
            )
            OR (
              COALESCE(e.cobertura_tipo::text, '') = 'varias_comunas'
              AND COALESCE(btrim(p_comuna_slug), '') <> ''
              AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
            )
          )
        ORDER BY e.created_at DESC NULLS LAST
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 800)
      ) sorted;
    $fn$;
  $sql$, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.list_emprendedores_abrir_comuna_activacion_admin(%s, text, text, int) TO service_role',
    comuna_ty
  );
  EXECUTE format(
    $cmt$
    COMMENT ON FUNCTION public.list_emprendedores_abrir_comuna_activacion_admin(%s, text, text, int) IS
      'IDs de emprendedores que cuentan para apertura de la comuna (mismo filtro que count_emprendedores_abrir_comuna_activacion). Solo service_role; tope 800.';
    $cmt$,
    comuna_ty
  );
END $$;
