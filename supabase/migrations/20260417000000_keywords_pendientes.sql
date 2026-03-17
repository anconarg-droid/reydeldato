-- Palabras detectadas en descripciones que no están en keyword_to_subcategory_map.
-- Sirve para análisis futuro (candidatas a agregar al diccionario o filtrar).
CREATE TABLE IF NOT EXISTS public.keywords_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_keyword text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keywords_pendientes_normalized
  ON public.keywords_pendientes(normalized_keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_pendientes_created_at
  ON public.keywords_pendientes(created_at DESC);

COMMENT ON TABLE public.keywords_pendientes IS
  'Términos extraídos de descripciones que no están en el diccionario válido. Para análisis y posible incorporación futura a keyword_to_subcategory_map.';
