-- Idempotente: asegura lectura vía PostgREST (anon) a la vista recreada en migraciones anteriores.
GRANT SELECT ON public.vw_apertura_comuna_v2 TO anon, authenticated, service_role;
