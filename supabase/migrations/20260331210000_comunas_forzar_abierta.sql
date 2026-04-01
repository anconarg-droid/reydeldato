-- Override de apertura pública (demo/dev) vs apertura real por mínimos (vistas v2).
-- comuna_publica_abierta (en app) = forzar_abierta OR abierta_por_minimos(vw_apertura_comuna_v2)

ALTER TABLE public.comunas
  ADD COLUMN IF NOT EXISTS forzar_abierta boolean NOT NULL DEFAULT false;

ALTER TABLE public.comunas
  ADD COLUMN IF NOT EXISTS motivo_apertura_override text NULL;

COMMENT ON COLUMN public.comunas.forzar_abierta IS
  'Si true, la comuna se trata como abierta en producto aunque vw_apertura_comuna_v2 no marque mínimos cumplidos (demo/pruebas).';

COMMENT ON COLUMN public.comunas.motivo_apertura_override IS
  'Nota interna opcional (equipo) sobre por qué se forzó la apertura.';

-- Opcional (demo): marcar una comuna como abierta en producto sin cumplir mínimos en la vista v2.
-- UPDATE public.comunas
-- SET forzar_abierta = true, motivo_apertura_override = 'Demo / QA'
-- WHERE slug = 'maipu';
