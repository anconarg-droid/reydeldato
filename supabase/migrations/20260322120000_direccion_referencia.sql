-- Referencia opcional junto a la dirección (local físico).
-- Si ves PGRST204 / "Could not find direccion_referencia", ejecutá este archivo
-- en el SQL Editor de Supabase (o `supabase db push`) en el proyecto remoto.
ALTER TABLE public.postulaciones_emprendedores
  ADD COLUMN IF NOT EXISTS direccion_referencia text;

ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS direccion_referencia text;

COMMENT ON COLUMN public.postulaciones_emprendedores.direccion_referencia IS
  'Texto opcional (ej. entre calles, piso/local) para acompañar la dirección pública.';

COMMENT ON COLUMN public.emprendedores.direccion_referencia IS
  'Texto opcional (ej. entre calles, piso/local) para acompañar la dirección pública.';
