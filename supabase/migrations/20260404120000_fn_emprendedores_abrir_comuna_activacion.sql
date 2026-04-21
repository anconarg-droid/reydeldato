-- =============================================================================
-- Listado y conteo de emprendedores que "cuentan" para la pantalla /abrir-comuna:
-- misma noción territorial que la oferta en comuna (base + cobertura N:M + arrays
-- + regional vía pivote + nacional), sin filtrar por fotos ni ficha completa.
--
-- Nota: vw_apertura_comuna_v2 puede seguir usando otra definición (p. ej. rubros
-- con tope). Este par de funciones es la fuente explícita para el bloque visual
-- de /abrir-comuna cuando se desea coherencia con "quién atiende la comuna".
-- =============================================================================

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
        );
    $fn$;

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
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 4), 1), 50)
      ) sorted;
    $fn$;
  $sql$, comuna_ty);

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.count_emprendedores_abrir_comuna_activacion(%s, text, text) TO anon, authenticated, service_role',
    comuna_ty
  );
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.list_emprendedores_abrir_comuna_activacion(%s, text, text, int) TO anon, authenticated, service_role',
    comuna_ty
  );
  EXECUTE format(
    $cmt$
    COMMENT ON FUNCTION public.count_emprendedores_abrir_comuna_activacion(%s, text, text) IS
      'Cuenta emprendedores publicados que atienden la comuna (base, cobertura, regional, nacional). Usado en /abrir-comuna.';
    $cmt$,
    comuna_ty
  );
  EXECUTE format(
    $cmt$
    COMMENT ON FUNCTION public.list_emprendedores_abrir_comuna_activacion(%s, text, text, int) IS
      'IDs de emprendedores publicados que atienden la comuna, orden por created_at desc; mismo filtro que count_emprendedores_abrir_comuna_activacion.';
    $cmt$,
    comuna_ty
  );
END $$;
