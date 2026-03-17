-- =============================================================================
-- Múltiples locales físicos (0-3) y política WhatsApp (principal + secundario).
-- - Tabla emprendedor_locales
-- - Columnas whatsapp_principal / whatsapp_secundario en emprendedores
-- - Vista para detectar WhatsApp en más de 3 fichas (moderación futura)
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla emprendedor_locales (máximo 3 por emprendimiento, 1 principal)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emprendedor_locales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL,
  nombre_local text,
  direccion text NOT NULL,
  comuna_id uuid NOT NULL,
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emprendedor_locales_emprendedor_fkey
    FOREIGN KEY (emprendedor_id) REFERENCES public.emprendedores(id) ON DELETE CASCADE,
  CONSTRAINT emprendedor_locales_comuna_fkey
    FOREIGN KEY (comuna_id) REFERENCES public.comunas(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emprendedor_locales_principal
  ON public.emprendedor_locales (emprendedor_id) WHERE (es_principal = true);

CREATE INDEX IF NOT EXISTS idx_emprendedor_locales_emprendedor
  ON public.emprendedor_locales (emprendedor_id);

COMMENT ON TABLE public.emprendedor_locales IS 'Locales físicos del emprendimiento (0 a 3). Uno debe ser principal; su comuna alimenta comuna_base_id.';
COMMENT ON COLUMN public.emprendedor_locales.nombre_local IS 'Nombre opcional del local (ej. Sucursal Centro).';
COMMENT ON COLUMN public.emprendedor_locales.es_principal IS 'Solo un local por emprendimiento puede ser principal; su comuna_id se usa como comuna_base_id.';

-- -----------------------------------------------------------------------------
-- 2. Columnas WhatsApp en emprendedores (principal obligatorio, secundario opcional)
-- -----------------------------------------------------------------------------
ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS whatsapp_principal text,
  ADD COLUMN IF NOT EXISTS whatsapp_secundario text;

COMMENT ON COLUMN public.emprendedores.whatsapp_principal IS 'WhatsApp principal del emprendimiento (obligatorio).';
COMMENT ON COLUMN public.emprendedores.whatsapp_secundario IS 'WhatsApp secundario opcional; máximo 2 WhatsApp por emprendimiento.';

-- Backfill: si ya existe columna whatsapp y whatsapp_principal está vacío, copiar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emprendedores' AND column_name = 'whatsapp'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emprendedores' AND column_name = 'whatsapp_principal'
  ) THEN
    UPDATE public.emprendedores
    SET whatsapp_principal = whatsapp
    WHERE whatsapp_principal IS NULL AND whatsapp IS NOT NULL AND trim(whatsapp) <> '';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Vista: WhatsApp que aparece en más de 3 fichas (para moderación)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_whatsapp_mas_de_tres_fichas AS
WITH numeros AS (
  SELECT id, regexp_replace(trim(COALESCE(whatsapp_principal, whatsapp)), '\D', '', 'g') AS num
  FROM public.emprendedores
  WHERE estado_publicacion = 'publicado'
    AND trim(COALESCE(whatsapp_principal, whatsapp)) <> ''
    AND regexp_replace(trim(COALESCE(whatsapp_principal, whatsapp)), '\D', '', 'g') ~ '^\d{8,15}$'
  UNION ALL
  SELECT id, regexp_replace(trim(whatsapp_secundario), '\D', '', 'g') AS num
  FROM public.emprendedores
  WHERE estado_publicacion = 'publicado'
    AND whatsapp_secundario IS NOT NULL
    AND trim(whatsapp_secundario) <> ''
    AND regexp_replace(trim(whatsapp_secundario), '\D', '', 'g') ~ '^\d{8,15}$'
)
SELECT num AS whatsapp_normalizado, COUNT(DISTINCT id) AS cantidad_fichas
FROM numeros
WHERE num <> ''
GROUP BY num
HAVING COUNT(DISTINCT id) > 3;

COMMENT ON VIEW public.vw_whatsapp_mas_de_tres_fichas IS 'Números WhatsApp que aparecen en más de 3 emprendimientos publicados; para revisión/moderación.';
