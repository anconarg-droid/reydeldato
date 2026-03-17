-- =============================================================================
-- reviewed_at en clasificacion_pendiente + tabla search_suggestions (base para
-- sugerencias de búsqueda tipo Google). Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. clasificacion_pendiente: reviewed_at
-- -----------------------------------------------------------------------------
ALTER TABLE public.clasificacion_pendiente
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.clasificacion_pendiente.reviewed_at IS
  'Momento en que un revisor resolvió el caso (complementa resuelto_at).';

-- -----------------------------------------------------------------------------
-- 2. search_suggestions: base para sugerencias de búsqueda (Algolia + Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  normalized_query text NOT NULL,
  source_type text NOT NULL DEFAULT 'seed'
    CHECK (source_type IN ('seed', 'keyword', 'popular_search', 'subcategoria', 'categoria')),
  subcategoria_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  usage_count integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_search_suggestions_normalized UNIQUE (normalized_query)
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_normalized ON public.search_suggestions(normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_activo ON public.search_suggestions(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_search_suggestions_source_type ON public.search_suggestions(source_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage_count ON public.search_suggestions(usage_count DESC);

COMMENT ON TABLE public.search_suggestions IS
  'Sugerencias de búsqueda: alimentada desde keyword_to_subcategory_map, subcategorias/categorias y futuras búsquedas populares. Base para autocompletado tipo Google.';

COMMENT ON COLUMN public.search_suggestions.query_text IS 'Texto mostrado al usuario (ej. "Panadería").';
COMMENT ON COLUMN public.search_suggestions.normalized_query IS 'Forma normalizada para matching (slug, sin tildes).';
COMMENT ON COLUMN public.search_suggestions.source_type IS 'Origen: seed, keyword (del diccionario), popular_search, subcategoria, categoria.';
