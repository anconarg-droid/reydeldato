-- =============================================================================
-- Alinea emprendedor_modalidades con valores canónicos de aplicación:
-- local_fisico | presencial_terreno | online
--
-- - Si modalidad es TEXT (+ CHECK): renombra legacy local/presencial y renueva CHECK.
-- - Si modalidad es ENUM modalidad_atencion: NO usa literales 'local'/'presencial'
--   (invalidan el parseo en Postgres). Solo quita CHECK redundante si existía.
-- =============================================================================

DO $$
DECLARE
  col_data_type text;
  col_udt_name  text;
  tbl_exists    boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'emprendedor_modalidades'
      AND c.relkind = 'r'
  )
  INTO tbl_exists;

  IF NOT tbl_exists THEN
    RAISE NOTICE 'Omitido: no existe public.emprendedor_modalidades';
    RETURN;
  END IF;

  SELECT c.data_type, c.udt_name
  INTO col_data_type, col_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'emprendedor_modalidades'
    AND c.column_name = 'modalidad';

  IF col_data_type IS NULL THEN
    RAISE NOTICE 'Omitido: no existe columna modalidad en emprendedor_modalidades';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Rama TEXT (o varchar): comparar y actualizar 'local' / 'presencial' es válido.
  -- ---------------------------------------------------------------------------
  IF col_data_type IN ('text', 'character varying') THEN
    DELETE FROM public.emprendedor_modalidades a
    USING public.emprendedor_modalidades b
    WHERE a.emprendedor_id = b.emprendedor_id
      AND a.modalidad = 'local'
      AND b.modalidad = 'local_fisico';

    DELETE FROM public.emprendedor_modalidades a
    USING public.emprendedor_modalidades b
    WHERE a.emprendedor_id = b.emprendedor_id
      AND a.modalidad = 'presencial'
      AND b.modalidad = 'presencial_terreno';

    UPDATE public.emprendedor_modalidades
    SET modalidad = 'local_fisico'
    WHERE modalidad = 'local';

    UPDATE public.emprendedor_modalidades
    SET modalidad = 'presencial_terreno'
    WHERE modalidad = 'presencial';

    ALTER TABLE public.emprendedor_modalidades
      DROP CONSTRAINT IF EXISTS emprendedor_modalidades_modalidad_check;

    ALTER TABLE public.emprendedor_modalidades
      ADD CONSTRAINT emprendedor_modalidades_modalidad_check CHECK (
        modalidad IN ('local_fisico', 'presencial_terreno', 'online')
      );

    RAISE NOTICE
      'emprendedor_modalidades.modalidad es %: migración legacy + CHECK aplicados.',
      col_data_type;
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Rama ENUM: no comparar con 'local' ni 'presencial' (no son labels del enum).
  -- El tipo modalidad_atencion ya restringe valores; el API ya inserta bien.
  -- ---------------------------------------------------------------------------
  IF col_data_type = 'USER-DEFINED' AND col_udt_name = 'modalidad_atencion' THEN
    ALTER TABLE public.emprendedor_modalidades
      DROP CONSTRAINT IF EXISTS emprendedor_modalidades_modalidad_check;

    RAISE NOTICE
      'emprendedor_modalidades.modalidad es enum modalidad_atencion: omitidos UPDATE/DELETE con local/presencial. '
      'Si hubo datos erróneos, corregir manualmente o con casts explícitos a enum. '
      'CHECK emprendedor_modalidades_modalidad_check eliminado si existía (redundante con el enum).';
    RETURN;
  END IF;

  RAISE NOTICE
    'emprendedor_modalidades.modalidad tiene tipo % (udt=%): sin migración automática; revisar manualmente.',
    col_data_type,
    col_udt_name;
END $$;
