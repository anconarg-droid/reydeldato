-- Migración opcional: columnas para ranking justo en búsqueda.
-- Ejecutar solo si no existen en la tabla emprendedores.
-- La columna impresiones_busqueda ya se usa en /api/track-impression; si falla el SELECT en /api/buscar, añadirla aquí.
-- created_at suele existir por defecto en Supabase.

-- Columna para rotación justa (quienes menos se han mostrado aparecen antes):
ALTER TABLE emprendedores
  ADD COLUMN IF NOT EXISTS impresiones_busqueda integer NOT NULL DEFAULT 0;

-- Índice opcional para futuras consultas que ordenen por esta columna:
-- CREATE INDEX IF NOT EXISTS idx_emprendedores_impresiones_busqueda ON emprendedores(impresiones_busqueda);

-- created_at: si la tabla emprendedores no tiene created_at, descomentar y ajustar:
-- ALTER TABLE emprendedores
--   ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Comentarios para documentación:
COMMENT ON COLUMN emprendedores.impresiones_busqueda IS 'Veces que el emprendimiento ha aparecido en resultados de búsqueda; se usa para ordenar por igualdad de exposición (menos mostrados primero).';
