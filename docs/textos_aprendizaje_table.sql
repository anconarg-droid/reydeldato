-- Tabla para almacenar descripciones y palabras detectadas al publicar (aprendizaje futuro).
-- Ejecutar en Supabase SQL Editor si la tabla no existe.

CREATE TABLE IF NOT EXISTS public.textos_aprendizaje (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  descripcion text,
  palabras_detectadas text[],
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.textos_aprendizaje IS
  'Textos de descripción y palabras detectadas/editadas al publicar emprendimiento, para aprendizaje futuro.';
