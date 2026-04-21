-- Esquemas legacy: varias columnas de emprendedores quedaron en varchar(100).
-- Insert al aprobar (URLs de storage, nombres largos, descripciones) rompe con 22001.
-- Sube a text solo donde el tipo actual es character varying(100).

DO $$
DECLARE
  cols text[] := ARRAY[
    'nombre',
    'nombre_emprendimiento',
    'nombre_responsable',
    'slug',
    'foto_principal_url',
    'sitio_web',
    'instagram',
    'direccion',
    'direccion_referencia',
    'email',
    'whatsapp',
    'whatsapp_principal',
    'whatsapp_secundario',
    'frase_negocio',
    'descripcion_libre'
  ];
  c text;
BEGIN
  FOREACH c IN ARRAY cols
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'emprendedores'
        AND column_name = c
        AND data_type = 'character varying'
        AND character_maximum_length = 100
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.emprendedores ALTER COLUMN %I TYPE text USING %I::text',
        c,
        c
      );
    END IF;
  END LOOP;
END $$;
