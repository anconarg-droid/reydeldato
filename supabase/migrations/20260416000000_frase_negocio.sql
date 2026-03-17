-- Frase del negocio (opcional, paso 1 del formulario). Se muestra en la ficha debajo del nombre.
ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS frase_negocio text;

COMMENT ON COLUMN public.emprendedores.frase_negocio IS 'Frase corta opcional del negocio (ej. Pan amasado todos los días). Máx 120 caracteres. Se muestra en la ficha debajo del nombre.';
