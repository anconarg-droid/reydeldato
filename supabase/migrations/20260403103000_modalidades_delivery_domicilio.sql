-- =============================================================================
-- Modalidades canónicas: local_fisico | delivery | domicilio | online
-- - Migra presencial_terreno (y presencial si quedara) → domicilio
-- - Actualiza CHECK en columna TEXT/varchar
--
-- Compatibilidad: la app sigue aceptando en API presencial / presencial_terreno
-- y los normaliza a domicilio al escribir.
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
    RAISE NOTICE 'Omitido: no existe columna modalidad';
    RETURN;
  END IF;

  IF col_data_type IN ('text', 'character varying') THEN
    ALTER TABLE public.emprendedor_modalidades
      DROP CONSTRAINT IF EXISTS emprendedor_modalidades_modalidad_check;

    UPDATE public.emprendedor_modalidades
    SET modalidad = 'domicilio'
    WHERE modalidad IN ('presencial_terreno', 'presencial');

    UPDATE public.emprendedor_modalidades
    SET modalidad = 'local_fisico'
    WHERE modalidad = 'local';

    ALTER TABLE public.emprendedor_modalidades
      ADD CONSTRAINT emprendedor_modalidades_modalidad_check CHECK (
        modalidad IN ('local_fisico', 'delivery', 'domicilio', 'online')
      );

    RAISE NOTICE
      'emprendedor_modalidades: CHECK actualizado a local_fisico|delivery|domicilio|online (tipo %).',
      col_data_type;
    RETURN;
  END IF;

  IF col_data_type = 'USER-DEFINED' AND col_udt_name = 'modalidad_atencion' THEN
    ALTER TABLE public.emprendedor_modalidades
      DROP CONSTRAINT IF EXISTS emprendedor_modalidades_modalidad_check;

    RAISE NOTICE
      'Columna modalidad es enum modalidad_atencion: agregar valores delivery y domicilio con '
      'ALTER TYPE ... ADD VALUE IF NOT EXISTS; luego migrar filas presencial_terreno → domicilio '
      'con cast explícito según labels reales del enum en este proyecto.';
    RETURN;
  END IF;

  RAISE NOTICE
    'emprendedor_modalidades.modalidad tipo % (udt=%): sin cambio automático.',
    col_data_type,
    col_udt_name;
END $$;
