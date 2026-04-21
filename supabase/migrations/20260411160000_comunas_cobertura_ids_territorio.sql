-- =============================================================================
-- Cobertura "varias_comunas": IDs de comuna alineados a public.comunas.id
--
-- Problema: emprendedores.comunas_cobertura es text[] de slugs; las funciones de
-- apertura / territorio comparan p_comuna_id (mismo tipo que comunas.id) con
-- ese array → errores o huecos si se mezcla con enteros en texto.
--
-- Solución:
--   - comunas_cobertura_ids: array del MISMO tipo que comunas.id (backfill desde slugs).
--   - Predicado canónico: p_comuna_id = ANY(e.comunas_cobertura_ids)
--   - comunas_cobertura (text[]) se mantiene en transición (LEGACY); lecturas nuevas
--     deben preferir IDs en SQL; el slug queda para UI / búsqueda / compatibilidad.
--
-- REQUIERE EJECUCIÓN EN SUPABASE (migración). Luego verificaciones listadas al final.
-- =============================================================================

DO $$
DECLARE
  comuna_ty text;
  arr_ty text;
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

  arr_ty := comuna_ty || '[]';

  EXECUTE format(
    'ALTER TABLE public.emprendedores ADD COLUMN IF NOT EXISTS comunas_cobertura_ids %s NOT NULL DEFAULT ''{}''::%s',
    arr_ty,
    arr_ty
  );

  COMMENT ON COLUMN public.emprendedores.comunas_cobertura IS
    'LEGACY: slugs de comunas adicionales para cobertura_tipo = varias_comunas. Preferir comunas_cobertura_ids en lógica territorial.';

  COMMENT ON COLUMN public.emprendedores.comunas_cobertura_ids IS
    'IDs de comunas (mismo tipo que public.comunas.id) donde el negocio declara cobertura en varias_comunas. Fuente de verdad para ANY(p_comuna_id).';
END $$;

-- Backfill: slug o texto numérico → comunas.id (tipo de array = tipo de comunas.id)
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

  EXECUTE format($bf$
    UPDATE public.emprendedores e
    SET comunas_cobertura_ids = sq.ids
    FROM (
      SELECT
        e2.id AS emp_id,
        COALESCE(agg.ids, ARRAY[]::%s[]) AS ids
      FROM public.emprendedores e2
      LEFT JOIN LATERAL (
        SELECT
          array_agg(DISTINCT c.id ORDER BY c.id) AS ids
        FROM unnest(COALESCE(e2.comunas_cobertura, ARRAY[]::text[])) AS u(raw)
        INNER JOIN public.comunas c
          ON lower(trim(c.slug::text)) = lower(trim(u.raw))
          OR trim(c.id::text) = trim(u.raw)
      ) agg ON true
    ) sq
    WHERE e.id = sq.emp_id
  $bf$, comuna_ty);
END $$;

-- Índice opcional para filtros (GIN)
CREATE INDEX IF NOT EXISTS idx_emprendedores_comunas_cobertura_ids
  ON public.emprendedores USING GIN (comunas_cobertura_ids);

-- -----------------------------------------------------------------------------
-- Funciones de conteo / listado de apertura (misma firma dinámica que antes)
-- Comuna "local" del emprendedor: public.emprendedores.comuna_id.
-- -----------------------------------------------------------------------------
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

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.count_emprendedores_abrir_comuna_activacion(
      p_comuna_id %1$s,
      p_comuna_slug text,
      p_region_slug text
    )
    RETURNS bigint
    LANGUAGE sql
    STABLE
    SET search_path = public
    AS $fn$
      SELECT COUNT(DISTINCT e.id)::bigint
      FROM public.emprendedores e
      WHERE e.estado_publicacion = 'publicado'
        AND (
          e.comuna_id = p_comuna_id
          OR EXISTS (
            SELECT 1
            FROM public.emprendedor_comunas_cobertura ecc
            WHERE ecc.emprendedor_id = e.id
              AND ecc.comuna_id = p_comuna_id
          )
          OR lower(e.cobertura_tipo::text) = 'nacional'
          OR (
            lower(e.cobertura_tipo::text) IN ('varias_regiones', 'regional')
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
            AND (
              p_comuna_id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%2$s[]))
              OR (
                COALESCE(btrim(p_comuna_slug), '') <> ''
                AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
              )
            )
          )
        );
    $fn$;
  $sql$, comuna_ty, comuna_ty);

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.list_emprendedores_abrir_comuna_activacion(
      p_comuna_id %1$s,
      p_comuna_slug text,
      p_region_slug text,
      p_limit int DEFAULT 4
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
            e.comuna_id = p_comuna_id
            OR EXISTS (
              SELECT 1
              FROM public.emprendedor_comunas_cobertura ecc
              WHERE ecc.emprendedor_id = e.id
                AND ecc.comuna_id = p_comuna_id
            )
            OR lower(e.cobertura_tipo::text) = 'nacional'
            OR (
              lower(e.cobertura_tipo::text) IN ('varias_regiones', 'regional')
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
              AND (
                p_comuna_id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%2$s[]))
                OR (
                  COALESCE(btrim(p_comuna_slug), '') <> ''
                  AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
                )
              )
            )
          )
        ORDER BY e.created_at DESC NULLS LAST
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 4), 1), 50)
      ) sorted;
    $fn$;
  $sql$, comuna_ty, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.count_emprendedores_abrir_comuna_activacion(%s, text, text) TO anon, authenticated, service_role',
    comuna_ty
  );
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.list_emprendedores_abrir_comuna_activacion(%s, text, text, int) TO anon, authenticated, service_role',
    comuna_ty
  );
END $$;

-- -----------------------------------------------------------------------------
-- Vista admin apertura × rubro
-- -----------------------------------------------------------------------------
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

  EXECUTE format($sql$
    CREATE OR REPLACE VIEW public.vw_admin_apertura_rubro_por_comuna AS
    SELECT
      c.slug AS comuna_slug,
      c.nombre AS comuna_nombre,
      ra.subcategoria_slug,
      COALESCE(ra.nombre_visible, sc.nombre, ra.subcategoria_slug)::text AS subcategoria_nombre,
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
          e.comuna_id = c.id
          OR EXISTS (
            SELECT 1
            FROM public.emprendedor_comunas_cobertura ecc
            WHERE ecc.emprendedor_id = e.id
              AND ecc.comuna_id = c.id
          )
          OR lower(e.cobertura_tipo::text) = 'nacional'
          OR (
            lower(e.cobertura_tipo::text) IN ('varias_regiones', 'regional')
            AND EXISTS (
              SELECT 1
              FROM public.emprendedor_regiones_cobertura err
              INNER JOIN public.comunas cx ON cx.id = c.id AND err.region_id = cx.region_id
              WHERE err.emprendedor_id = e.id
            )
          )
          OR (
            COALESCE(e.cobertura_tipo::text, '') = 'varias_comunas'
            AND (
              c.id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%1$s[]))
              OR (
                COALESCE(btrim(c.slug::text), '') <> ''
                AND c.slug::text = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
              )
            )
          )
        )
    ) cnt ON true;
  $sql$, comuna_ty);

  COMMENT ON VIEW public.vw_admin_apertura_rubro_por_comuna IS
    'Admin: por comuna y rubro de apertura. varias_comunas: comunas_cobertura_ids (canónico) + comunas_cobertura slugs (legacy).';
END $$;

-- -----------------------------------------------------------------------------
-- RPC admin listado IDs
-- -----------------------------------------------------------------------------
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
            e.comuna_id = p_comuna_id
            OR EXISTS (
              SELECT 1
              FROM public.emprendedor_comunas_cobertura ecc
              WHERE ecc.emprendedor_id = e.id
                AND ecc.comuna_id = p_comuna_id
            )
            OR lower(e.cobertura_tipo::text) = 'nacional'
            OR (
              lower(e.cobertura_tipo::text) IN ('varias_regiones', 'regional')
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
              AND (
                p_comuna_id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%2$s[]))
                OR (
                  COALESCE(btrim(p_comuna_slug), '') <> ''
                  AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
                )
              )
            )
          )
        ORDER BY e.created_at DESC NULLS LAST
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 800)
      ) sorted;
    $fn$;
  $sql$, comuna_ty, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.list_emprendedores_abrir_comuna_activacion_admin(%s, text, text, int) TO service_role',
    comuna_ty
  );
END $$;

-- -----------------------------------------------------------------------------
-- Buscador v2: mismo tipo de parámetro que comunas.id (reemplaza smallint fijo)
-- -----------------------------------------------------------------------------
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

  EXECUTE 'DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_cobertura_v2(smallint, text, text)';
  EXECUTE format('DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_cobertura_v2(%s, text, text)', comuna_ty);

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_cobertura_v2(
      p_comuna_id %1$s,
      p_comuna_slug text,
      p_region_slug text
    )
    RETURNS TABLE (
      id uuid,
      nombre_emprendimiento text,
      slug text,
      comuna_id %1$s,
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
      subcategorias_nombres text[],
      categoria_nombre text
    )
    LANGUAGE sql
    STABLE
    SET search_path = public
    AS $fn$
      SELECT
        e.id,
        e.nombre_emprendimiento,
        e.slug,
        e.comuna_id::%1$s AS comuna_id,
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
            WHEN e.comuna_id::%1$s = p_comuna_id THEN 4
            WHEN e.cobertura_tipo = 'varias_comunas'
              AND (
                p_comuna_id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%1$s[]))
                OR (
                  p_comuna_slug IS NOT NULL
                  AND p_comuna_slug <> ''
                  AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
                )
              )
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
        COALESCE(sc.sub_nombres, ARRAY[]::text[]) AS subcategorias_nombres,
        COALESCE(cat.nombre, '') AS categoria_nombre
      FROM public.emprendedores e
      LEFT JOIN public.categorias cat ON cat.id = e.categoria_id
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
          e.comuna_id::%1$s = p_comuna_id
          OR (
            e.cobertura_tipo = 'varias_comunas'
            AND (
              p_comuna_id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%1$s[]))
              OR (
                p_comuna_slug IS NOT NULL
                AND p_comuna_slug <> ''
                AND p_comuna_slug = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
              )
            )
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
    $fn$;
  $sql$, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.buscar_emprendedores_por_cobertura_v2(%s, text, text) TO anon, authenticated, service_role',
    comuna_ty
  );
END $$;

-- -----------------------------------------------------------------------------
-- RPC moderación por comuna (prioridad 5)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_comuna(
  p_comuna_slug text,
  p_q text default null
)
RETURNS TABLE (
  id uuid,
  nombre_emprendimiento text,
  slug text,
  comuna_id int,
  comuna_slug text,
  comuna_nombre text,
  cobertura_tipo text,
  frase_negocio text,
  foto_principal_url text,
  whatsapp_principal text,
  tipo_ficha text,
  prioridad int,
  bloque_visible text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH comuna_target AS (
    SELECT
      c.id AS comuna_id,
      c.slug AS comuna_slug,
      c.nombre AS comuna_nombre,
      r.slug AS region_slug
    FROM public.comunas c
    JOIN public.regiones r ON r.id = c.region_id
    WHERE c.slug = p_comuna_slug
  ),
  base AS (
    SELECT
      e.id,
      e.nombre_emprendimiento,
      e.slug,
      e.comuna_id::int AS comuna_id,
      cb.slug AS comuna_slug,
      cb.nombre AS comuna_nombre,
      e.cobertura_tipo::text AS cobertura_tipo,
      e.frase_negocio,
      e.foto_principal_url,
      e.whatsapp_principal,
      CASE
        WHEN COALESCE(e.plan_activo, false) IS TRUE THEN 'completa'
        WHEN e.plan_expira_at IS NOT NULL AND e.plan_expira_at > now() THEN 'completa'
        WHEN e.trial_expira_at IS NOT NULL AND e.trial_expira_at > now() THEN 'completa'
        ELSE 'basica'
      END AS tipo_ficha,
      CASE
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'solo_comuna' THEN 1
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_comunas' THEN 2
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'varias_regiones' THEN 3
        WHEN e.comuna_id = ct.comuna_id AND e.cobertura_tipo = 'nacional' THEN 4

        WHEN e.cobertura_tipo = 'varias_comunas'
          AND (
            ct.comuna_id = ANY (e.comunas_cobertura_ids)
            OR ct.comuna_slug = ANY (COALESCE(e.comunas_cobertura, '{}'::text[]))
          ) THEN 5

        WHEN e.cobertura_tipo = 'varias_regiones'
          AND ct.region_slug = ANY (COALESCE(e.regiones_cobertura, '{}'::text[])) THEN 6

        WHEN e.cobertura_tipo = 'nacional' THEN 7
        ELSE 8
      END AS prioridad
    FROM public.emprendedores e
    JOIN public.comunas cb ON cb.id = e.comuna_id
    CROSS JOIN comuna_target ct
    WHERE
      e.estado_publicacion = 'publicado'
      AND (
        p_q IS NULL
        OR p_q = ''
        OR LOWER(COALESCE(e.nombre_emprendimiento, '')) LIKE '%' || LOWER(p_q) || '%'
        OR LOWER(COALESCE(e.frase_negocio, '')) LIKE '%' || LOWER(p_q) || '%'
      )
  )
  SELECT
    b.id,
    b.nombre_emprendimiento,
    b.slug,
    b.comuna_id,
    b.comuna_slug,
    b.comuna_nombre,
    b.cobertura_tipo,
    b.frase_negocio,
    b.foto_principal_url,
    b.whatsapp_principal,
    b.tipo_ficha,
    b.prioridad,
    CASE
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 1 AND 4 THEN 'de_tu_comuna'
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 5 AND 7 THEN 'atienden_tu_comuna'
      ELSE 'lista_general'
    END AS bloque_visible
  FROM base b
  WHERE b.prioridad < 8
  ORDER BY
    CASE
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 1 AND 4 THEN 1
      WHEN p_q IS NOT NULL AND p_q <> '' AND b.prioridad BETWEEN 5 AND 7 THEN 2
      ELSE 1
    END,
    b.prioridad ASC,
    md5(
      COALESCE(b.id::text, '') ||
      floor(extract(epoch from now()) / 300)::text
    );
$$;

COMMENT ON FUNCTION public.buscar_emprendedores_por_comuna(text, text) IS
  'Lista emprendedores publicados; varias_comunas usa comunas_cobertura_ids + legacy slugs.';

-- -----------------------------------------------------------------------------
-- Base para grupos de apertura: conteo por rubro_apertura en una comuna (IDs en varias_comunas)
-- -----------------------------------------------------------------------------
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

  EXECUTE format($sql$
    CREATE OR REPLACE FUNCTION public.contar_grupos_apertura_por_comuna(p_comuna_id %1$s)
    RETURNS TABLE (
      subcategoria_slug text,
      subcategoria_nombre text,
      minimo_requerido int,
      emprendedores_distintos bigint,
      contado_para_meta int,
      faltantes int
    )
    LANGUAGE sql
    STABLE
    SET search_path = public
    AS $fn$
      SELECT
        ra.subcategoria_slug,
        COALESCE(ra.nombre_visible, sc.nombre, ra.subcategoria_slug)::text AS subcategoria_nombre,
        ra.maximo_contable AS minimo_requerido,
        COALESCE(cnt.n, 0)::bigint AS emprendedores_distintos,
        LEAST(COALESCE(cnt.n, 0), ra.maximo_contable::bigint)::int AS contado_para_meta,
        GREATEST(ra.maximo_contable::bigint - LEAST(COALESCE(cnt.n, 0), ra.maximo_contable::bigint), 0)::int AS faltantes
      FROM public.rubros_apertura ra
      LEFT JOIN public.subcategorias sc ON sc.slug = ra.subcategoria_slug
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT e.id) AS n
        FROM public.emprendedores e
        INNER JOIN public.emprendedor_subcategorias es ON es.emprendedor_id = e.id
        INNER JOIN public.subcategorias s_sub ON s_sub.id = es.subcategoria_id AND s_sub.slug = ra.subcategoria_slug
        INNER JOIN public.comunas c ON c.id = p_comuna_id
        WHERE e.estado_publicacion = 'publicado'
          AND (
            e.comuna_id = c.id
            OR EXISTS (
              SELECT 1
              FROM public.emprendedor_comunas_cobertura ecc
              WHERE ecc.emprendedor_id = e.id
                AND ecc.comuna_id = c.id
            )
            OR lower(e.cobertura_tipo::text) = 'nacional'
            OR (
              lower(e.cobertura_tipo::text) IN ('varias_regiones', 'regional')
              AND EXISTS (
                SELECT 1
                FROM public.emprendedor_regiones_cobertura err
                INNER JOIN public.comunas cx ON cx.id = c.id AND err.region_id = cx.region_id
                WHERE err.emprendedor_id = e.id
              )
            )
            OR (
              COALESCE(e.cobertura_tipo::text, '') = 'varias_comunas'
              AND (
                c.id = ANY (COALESCE(e.comunas_cobertura_ids, ARRAY[]::%1$s[]))
                OR (
                  COALESCE(btrim(c.slug::text), '') <> ''
                  AND c.slug::text = ANY (COALESCE(e.comunas_cobertura, ARRAY[]::text[]))
                )
              )
            )
          )
      ) cnt ON true
      WHERE ra.activo = true
      ORDER BY ra.subcategoria_slug;
    $fn$;
  $sql$, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.contar_grupos_apertura_por_comuna(%s) TO service_role',
    comuna_ty
  );

  EXECUTE format(
    'COMMENT ON FUNCTION public.contar_grupos_apertura_por_comuna(%s) IS %L',
    comuna_ty,
    'Por comuna: filas de rubros_apertura con conteo territorial (varias_comunas vía comunas_cobertura_ids). Hasta que exista tabla grupos_apertura_*, esto equivale al desglose por subcategoría de rubro.'
  );
END $$;
