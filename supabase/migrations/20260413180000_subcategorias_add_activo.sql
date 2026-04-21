-- =============================================================================
-- subcategorias.activo: ocultar legacy en catálogo sin borrar filas
-- =============================================================================

ALTER TABLE public.subcategorias
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.subcategorias.activo IS
  'false = subcategoría legacy u oculta en selectores públicos; la fila se conserva por FK/pivotes.';

CREATE INDEX IF NOT EXISTS idx_subcategorias_activo
  ON public.subcategorias (activo)
  WHERE activo = true;
