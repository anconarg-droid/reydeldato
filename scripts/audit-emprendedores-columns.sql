-- Ejecutar en Supabase SQL Editor: columnas actuales de public.emprendedores
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'emprendedores'
ORDER BY ordinal_position;
