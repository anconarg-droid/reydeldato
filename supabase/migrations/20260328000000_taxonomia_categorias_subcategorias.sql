-- =============================================================================
-- Taxonomía para clasificación interna (no selector al usuario).
-- 1. Tabla categorias si no existe
-- 2. Seed ~16 categorías principales
-- 3. Seed ~subcategorías oficiales (por categoría)
-- 4. Sinónimos/keywords → subcategoría (keyword_to_subcategory_map)
-- La clasificación usa: descripcion_negocio + keywords_usuario + nombre → diccionario → subcategoria_principal_id
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla categorias (si no existe)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_categorias_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_categorias_slug ON public.categorias(slug);
COMMENT ON TABLE public.categorias IS 'Categorías principales de la taxonomía interna (~16). No se muestran como selector al usuario.';

-- -----------------------------------------------------------------------------
-- 2. Seed categorías principales (~16)
-- -----------------------------------------------------------------------------
INSERT INTO public.categorias (nombre, slug)
VALUES
  ('Alimentación', 'alimentacion'),
  ('Hogar y construcción', 'hogar_construccion'),
  ('Vehículos y transporte', 'vehiculos_transporte'),
  ('Salud y belleza', 'salud_belleza'),
  ('Educación y formación', 'educacion_formacion'),
  ('Servicios profesionales', 'servicios_profesionales'),
  ('Comercio y retail', 'comercio_retail'),
  ('Gastronomía y eventos', 'gastronomia_eventos'),
  ('Cuidado de mascotas', 'cuidado_mascotas'),
  ('Eventos y recreación', 'eventos_recreacion'),
  ('Tecnología y comunicaciones', 'tecnologia_comunicaciones'),
  ('Deportes y actividad física', 'deportes'),
  ('Arte y cultura', 'arte_cultura'),
  ('Finanzas y seguros', 'finanzas_seguros'),
  ('Reparaciones y mantención', 'reparaciones_mantencion'),
  ('Otros', 'otros')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Seed subcategorías (por categoría). Se pueden ampliar hasta 200–300.
-- Si subcategorias ya tiene datos, ON CONFLICT (slug) DO NOTHING evita duplicados.
-- -----------------------------------------------------------------------------
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Panadería', 'panaderia' FROM public.categorias c WHERE c.slug = 'alimentacion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Pastelería y repostería', 'pasteleria' FROM public.categorias c WHERE c.slug = 'alimentacion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Empanadas', 'empanadas' FROM public.categorias c WHERE c.slug = 'alimentacion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Comida casera y delivery', 'comida_casera' FROM public.categorias c WHERE c.slug = 'alimentacion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Gasfitería', 'gasfiter' FROM public.categorias c WHERE c.slug = 'hogar_construccion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Electricidad', 'electricista' FROM public.categorias c WHERE c.slug = 'hogar_construccion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Muebles a medida', 'muebles_a_medida' FROM public.categorias c WHERE c.slug = 'hogar_construccion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Vulcanización', 'vulcanizacion' FROM public.categorias c WHERE c.slug = 'vehiculos_transporte' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Mecánico automotriz', 'mecanico' FROM public.categorias c WHERE c.slug = 'vehiculos_transporte' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Fletes y mudanzas', 'fletes' FROM public.categorias c WHERE c.slug = 'vehiculos_transporte' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Veterinaria', 'veterinaria' FROM public.categorias c WHERE c.slug = 'cuidado_mascotas' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Ferretería', 'ferreteria' FROM public.categorias c WHERE c.slug = 'comercio_retail' LIMIT 1
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, 'Clases y capacitación', 'clases' FROM public.categorias c WHERE c.slug = 'educacion_formacion' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Más subcategorías (ampliar según necesidad hasta 200–300)
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Pizzas', 'pizzas' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Café y snacks', 'cafe_snacks' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Carnicería', 'carniceria' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Verdulería', 'verduleria' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Albañilería', 'albanileria' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Pintura', 'pintura' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Carpintería', 'carpinteria' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Limpieza de hogar', 'limpieza_hogar' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Jardinería', 'jardineria' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Peluquería', 'peluqueria' FROM public.categorias WHERE slug = 'salud_belleza' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Barbería', 'barberia' FROM public.categorias WHERE slug = 'salud_belleza' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Manicure y uñas', 'manicure' FROM public.categorias WHERE slug = 'salud_belleza' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Gimnasio y entrenamiento', 'gimnasio' FROM public.categorias WHERE slug = 'deportes' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Fotografía', 'fotografia' FROM public.categorias WHERE slug = 'arte_cultura' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Diseño gráfico', 'diseno_grafico' FROM public.categorias WHERE slug = 'arte_cultura' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Contabilidad', 'contabilidad' FROM public.categorias WHERE slug = 'servicios_profesionales' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Abogacía', 'abogacia' FROM public.categorias WHERE slug = 'servicios_profesionales' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Seguros', 'seguros' FROM public.categorias WHERE slug = 'finanzas_seguros' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Farmacia', 'farmacia' FROM public.categorias WHERE slug = 'comercio_retail' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Óptica', 'optica' FROM public.categorias WHERE slug = 'comercio_retail' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Cevichería', 'cevicheria' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Rotisería', 'rotiseria' FROM public.categorias WHERE slug = 'alimentacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Instalación de gas', 'instalacion_gas' FROM public.categorias WHERE slug = 'hogar_construccion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Lubricentro', 'lubricentro' FROM public.categorias WHERE slug = 'vehiculos_transporte' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Salón de eventos', 'salon_eventos' FROM public.categorias WHERE slug = 'eventos_recreacion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Reparación de celulares', 'reparacion_celulares' FROM public.categorias WHERE slug = 'tecnologia_comunicaciones' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Lavado de autos', 'lavado_autos' FROM public.categorias WHERE slug = 'reparaciones_mantencion' LIMIT 1 ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Sinónimos/keywords → subcategoría (para clasificación automática)
-- Ejemplos: vulca→vulcanizacion, plomero→gasfiter, melamina→muebles_a_medida
-- La clasificación usa descripcion_negocio + keywords_usuario + nombre y compara con este diccionario.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  sid uuid;
BEGIN
  -- vulca → vulcanizacion
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'vulcanizacion' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('vulca', 'vulca', sid, 0.9, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- plomero → gasfiter
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'gasfiter' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('plomero', 'plomero', sid, 0.95, true),
           ('plomería', 'plomeria', sid, 0.95, true),
           ('gasfiter', 'gasfiter', sid, 1.0, true),
           ('gasfitero', 'gasfitero', sid, 0.95, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- melamina → muebles_a_medida
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'muebles_a_medida' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('melamina', 'melamina', sid, 0.9, true),
           ('muebles a medida', 'muebles-a-medida', sid, 0.95, true),
           ('mueblería', 'muebleria', sid, 0.85, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  -- Otros sinónimos útiles
  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'vulcanizacion' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('vulcanización', 'vulcanizacion', sid, 1.0, true),
           ('vulcanizador', 'vulcanizador', sid, 0.9, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'panaderia' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('panadería', 'panaderia', sid, 1.0, true),
           ('panadero', 'panadero', sid, 0.95, true),
           ('pan', 'pan', sid, 0.85, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'pasteleria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('pastelería', 'pasteleria', sid, 1.0, true),
           ('tortas', 'tortas', sid, 0.95, true),
           ('repostería', 'reposteria', sid, 0.95, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'electricista' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('electricista', 'electricista', sid, 1.0, true),
           ('electricidad', 'electricidad', sid, 0.9, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'mecanico' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('mecánico', 'mecanico', sid, 1.0, true),
           ('taller mecánico', 'taller-mecanico', sid, 0.95, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'fletes' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('fletes', 'fletes', sid, 1.0, true),
           ('flete', 'flete', sid, 0.95, true),
           ('mudanza', 'mudanza', sid, 0.9, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'empanadas' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('empanadas', 'empanadas', sid, 1.0, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'clases' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('clases', 'clases', sid, 1.0, true),
           ('clases particulares', 'clases-particulares', sid, 0.95, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'veterinaria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('veterinaria', 'veterinaria', sid, 1.0, true),
           ('veterinario', 'veterinario', sid, 0.95, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;

  SELECT id INTO sid FROM public.subcategorias WHERE slug = 'ferreteria' LIMIT 1;
  IF sid IS NOT NULL THEN
    INSERT INTO public.keyword_to_subcategory_map (keyword, normalized_keyword, subcategoria_id, confidence_default, activo)
    VALUES ('ferretería', 'ferreteria', sid, 1.0, true)
    ON CONFLICT (normalized_keyword) DO UPDATE SET keyword = EXCLUDED.keyword, subcategoria_id = EXCLUDED.subcategoria_id, updated_at = now();
  END IF;
END $$;

COMMENT ON TABLE public.keyword_to_subcategory_map IS 'Diccionario de sinónimos/keywords → subcategoría para clasificación automática. No se muestra al usuario.';
