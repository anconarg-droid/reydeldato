-- Permite recomendaciones desde abrir-comuna sin rubro ni email obligatorios.
ALTER TABLE public.comuna_interes
  ALTER COLUMN nombre DROP NOT NULL,
  ALTER COLUMN rubro DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;
