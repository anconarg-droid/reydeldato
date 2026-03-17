-- Sistema de aprendizaje de keywords: palabras detectadas en descripciones que no están en el diccionario.
-- Permite aprobar (y agregar al diccionario) o bloquear. No se sugieren hasta estar aprobadas.
CREATE TABLE IF NOT EXISTS public.keywords_detectadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  veces_detectada int NOT NULL DEFAULT 0,
  veces_usada_busqueda int NOT NULL DEFAULT 0,
  fecha_primera timestamptz NOT NULL DEFAULT now(),
  fecha_ultima timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'bloqueada')),
  subcategoria_id uuid REFERENCES public.subcategorias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_keywords_detectadas_keyword UNIQUE (keyword)
);

CREATE INDEX IF NOT EXISTS idx_keywords_detectadas_keyword ON public.keywords_detectadas(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_detectadas_estado ON public.keywords_detectadas(estado);
CREATE INDEX IF NOT EXISTS idx_keywords_detectadas_veces_detectada ON public.keywords_detectadas(veces_detectada DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_detectadas_fecha_ultima ON public.keywords_detectadas(fecha_ultima DESC);

COMMENT ON TABLE public.keywords_detectadas IS
  'Palabras detectadas en descripciones que no están en keyword_to_subcategory_map. Aprendizaje automático: pendiente → aprobada (se agrega al diccionario) o bloqueada.';
COMMENT ON COLUMN public.keywords_detectadas.veces_usada_busqueda IS 'Incrementar cuando un usuario use esta keyword en búsqueda (futuro).';

-- Función: al aprobar una keyword, insertarla en el diccionario principal (si no existe).
CREATE OR REPLACE FUNCTION public.aprobar_keyword_detectada(
  p_id uuid,
  p_subcategoria_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keyword text;
  v_normalized text;
BEGIN
  SELECT k.keyword INTO v_keyword
  FROM public.keywords_detectadas k
  WHERE k.id = p_id AND k.estado = 'pendiente';
  IF v_keyword IS NULL THEN
    RAISE EXCEPTION 'Keyword no encontrada o no está en pendiente';
  END IF;
  v_normalized := lower(trim(v_keyword));
  UPDATE public.keywords_detectadas
  SET estado = 'aprobada', subcategoria_id = p_subcategoria_id, updated_at = now()
  WHERE id = p_id;
  INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo, updated_at)
  VALUES (v_keyword, v_normalized, p_subcategoria_id, 0.85, true, now())
  ON CONFLICT (normalized_keyword) DO UPDATE SET
    keyword = EXCLUDED.keyword,
    subcategoria_id = EXCLUDED.subcategoria_id,
    activo = true,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.aprobar_keyword_detectada IS 'Cambia estado a aprobada e inserta/actualiza en keyword_to_subcategory_map.';

-- Upsert: insertar nuevas keywords detectadas o incrementar veces_detectada y fecha_ultima (solo si estado = pendiente).
CREATE OR REPLACE FUNCTION public.upsert_keywords_detectadas(p_keywords text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  k text;
BEGIN
  FOREACH k IN ARRAY p_keywords
  LOOP
    k := lower(trim(k));
    IF length(k) >= 2 AND length(k) <= 40 THEN
      INSERT INTO public.keywords_detectadas (keyword, veces_detectada, fecha_primera, fecha_ultima, updated_at)
      VALUES (k, 1, now(), now(), now())
      ON CONFLICT (keyword) DO UPDATE SET
        veces_detectada = public.keywords_detectadas.veces_detectada + 1,
        fecha_ultima = now(),
        updated_at = now()
      WHERE public.keywords_detectadas.estado = 'pendiente';
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.upsert_keywords_detectadas IS 'Registra o incrementa palabras detectadas que no están en el diccionario. Solo incrementa si estado = pendiente.';
