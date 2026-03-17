-- Interés por comunas aún no habilitadas (seleccionadas en formulario de publicación).
-- Para expansión futura: saber qué comunas interesan a emprendedores.
CREATE TABLE IF NOT EXISTS public.comuna_expansion_interes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comuna_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comuna_expansion_interes_slug ON public.comuna_expansion_interes(comuna_slug);
CREATE INDEX IF NOT EXISTS idx_comuna_expansion_interes_created ON public.comuna_expansion_interes(created_at DESC);

COMMENT ON TABLE public.comuna_expansion_interes IS 'Comunas seleccionadas en el formulario de publicación que aún no están habilitadas. Para análisis de expansión.';
