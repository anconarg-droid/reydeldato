-- Migración: columnas para captura y clasificación automática de emprendimientos
-- Ejecutar en Supabase (public.emprendedores).

ALTER TABLE public.emprendedores
  ADD COLUMN IF NOT EXISTS descripcion_negocio text,
  ADD COLUMN IF NOT EXISTS keywords_usuario text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keywords_ia text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estado_clasificacion text DEFAULT 'pendiente_revision',
  ADD COLUMN IF NOT EXISTS motivo_revision_manual text;

COMMENT ON COLUMN public.emprendedores.descripcion_negocio IS 'Texto libre: describe qué hace el emprendimiento (fuente para IA).';
COMMENT ON COLUMN public.emprendedores.keywords_usuario IS 'Palabras clave ingresadas por el usuario (máx 10).';
COMMENT ON COLUMN public.emprendedores.keywords_ia IS 'Keywords detectadas por la IA.';
COMMENT ON COLUMN public.emprendedores.estado_clasificacion IS 'automatica | pendiente_revision | corregida_manual';
COMMENT ON COLUMN public.emprendedores.motivo_revision_manual IS 'Motivo cuando se requiere o se hizo revisión manual de categoría/subcategoría.';
