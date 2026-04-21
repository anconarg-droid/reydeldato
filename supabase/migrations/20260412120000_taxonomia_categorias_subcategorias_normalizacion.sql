-- =============================================================================
-- Normalización de taxonomía (categorías + subcategorías) — transición segura
--
-- Qué hace (solo base de datos — REQUIERE ejecutar migración en Supabase):
--   1) Inserta/actualiza las 9 categorías oficiales (slug estable).
--   2) Inserta/actualiza subcategorías oficiales y reasigna categoria_id.
--   3) Elimina pivotes duplicados en emprendedor_subcategorias (mismo emprendedor
--      ya tenía el destino oficial).
--   4) Remapea emprendedor_subcategorias.subcategoria_id desde slugs legacy.
--   5) Remapea emprendedores.subcategoria_principal_id si la columna existe.
--   6) Remapea keyword_to_subcategory_map hacia subcategorías oficiales.
--   7) Desactiva rubros_apertura no listados; asegura los 15 rubros activos con meta.
--
-- No borra filas de public.categorias ni public.subcategorias legacy (solo pivotes
-- redundantes y ajustes de FK hacia IDs oficiales).
--
-- Qué NO es este archivo (solo código / PR aparte):
--   - Slugs de categoría en Next.js, seeds TS, textos de UI, Algolia, etc.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Merge slug legacy → slug oficial (subcategorias.slug destino)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS _tax_merge (
  from_slug text PRIMARY KEY,
  to_slug text NOT NULL
);

TRUNCATE _tax_merge;

INSERT INTO _tax_merge (from_slug, to_slug) VALUES
  ('gasfiter', 'gasfiteria'),
  ('calefont', 'gasfiteria'),
  ('destapes', 'gasfiteria'),
  ('destape', 'gasfiteria'),
  ('fugas-de-agua', 'gasfiteria'),
  ('fugas_de_agua', 'gasfiteria'),
  ('pizzas', 'comida-preparada'),
  ('comida-casera', 'comida-preparada'),
  ('comida_casera', 'comida-preparada'),
  ('maestro_general', 'maestro-obras-menores'),
  ('maestro-general', 'maestro-obras-menores'),
  ('maestro_general_obras', 'maestro-obras-menores'),
  ('pintura', 'pintor'),
  ('jardineria', 'jardinero'),
  ('fletes', 'fletes-mudanzas'),
  ('mudanzas', 'fletes-mudanzas'),
  ('mudanzas_fletes', 'fletes-mudanzas'),
  ('transporte_fletes', 'fletes-mudanzas'),
  ('lavado_autos', 'lavado-de-autos'),
  ('reparacion_celulares', 'reparacion-celulares'),
  ('reparacion_electrodomesticos', 'reparacion-electrodomesticos'),
  ('abogacia', 'abogado'),
  ('contabilidad', 'contador'),
  ('clases', 'clases_particulares'),
  ('peluqueria_canina', 'peluqueria-mascotas'),
  ('tienda_mascotas', 'alimentos-mascotas');

-- -----------------------------------------------------------------------------
-- B. Categorías oficiales
-- UNIQUE(nombre) y UNIQUE(slug): primero alinear slug por nombre; insertar solo
-- si no hay fila con ese nombre ni con ese slug.
-- -----------------------------------------------------------------------------
UPDATE public.categorias AS c
SET slug = v.slug
FROM (
  VALUES
    ('Hogar y construcción', 'hogar-y-construccion'),
    ('Automotriz', 'automotriz'),
    ('Alimentación', 'alimentacion'),
    ('Belleza y cuidado', 'belleza-y-cuidado'),
    ('Mascotas', 'mascotas'),
    ('Transporte y logística', 'transporte-y-logistica'),
    ('Tecnología y reparaciones', 'tecnologia-y-reparaciones'),
    ('Servicios profesionales', 'servicios-profesionales'),
    ('Educación y clases', 'educacion-y-clases')
) AS v(nombre, slug)
WHERE c.nombre = v.nombre
  AND c.slug IS DISTINCT FROM v.slug;

INSERT INTO public.categorias (nombre, slug)
SELECT v.nombre, v.slug
FROM (
  VALUES
    ('Hogar y construcción', 'hogar-y-construccion'),
    ('Automotriz', 'automotriz'),
    ('Alimentación', 'alimentacion'),
    ('Belleza y cuidado', 'belleza-y-cuidado'),
    ('Mascotas', 'mascotas'),
    ('Transporte y logística', 'transporte-y-logistica'),
    ('Tecnología y reparaciones', 'tecnologia-y-reparaciones'),
    ('Servicios profesionales', 'servicios-profesionales'),
    ('Educación y clases', 'educacion-y-clases')
) AS v(nombre, slug)
WHERE NOT EXISTS (SELECT 1 FROM public.categorias c WHERE c.nombre = v.nombre)
  AND NOT EXISTS (SELECT 1 FROM public.categorias c2 WHERE c2.slug = v.slug);

-- -----------------------------------------------------------------------------
-- C. Subcategorías oficiales
-- Sin asumir UNIQUE(slug): primero UPDATE por slug, luego INSERT faltantes.
-- -----------------------------------------------------------------------------

-- 1) Actualizar las existentes por slug
UPDATE public.subcategorias AS s
SET
  nombre = v.nombre,
  categoria_id = c.id
FROM (
  VALUES
    ('hogar-y-construccion', 'Gasfitería', 'gasfiteria'),
    ('hogar-y-construccion', 'Electricista', 'electricista'),
    ('hogar-y-construccion', 'Maestro obras menores', 'maestro-obras-menores'),
    ('hogar-y-construccion', 'Cerrajería', 'cerrajeria'),
    ('hogar-y-construccion', 'Ferretería', 'ferreteria'),
    ('hogar-y-construccion', 'Pintor', 'pintor'),
    ('hogar-y-construccion', 'Jardinero', 'jardinero'),
    ('automotriz', 'Mecánico', 'mecanico'),
    ('automotriz', 'Vulcanización', 'vulcanizacion'),
    ('automotriz', 'Lavado de autos', 'lavado-de-autos'),
    ('alimentacion', 'Panadería', 'panaderia'),
    ('alimentacion', 'Carnicería', 'carniceria'),
    ('alimentacion', 'Minimarket', 'minimarket'),
    ('alimentacion', 'Comida preparada', 'comida-preparada'),
    ('alimentacion', 'Agua purificada', 'agua-purificada'),
    ('alimentacion', 'Pastelería', 'pasteleria'),
    ('belleza-y-cuidado', 'Peluquería', 'peluqueria'),
    ('belleza-y-cuidado', 'Barbería', 'barberia'),
    ('mascotas', 'Veterinaria', 'veterinaria'),
    ('mascotas', 'Alimentos para mascotas', 'alimentos-mascotas'),
    ('mascotas', 'Peluquería mascotas', 'peluqueria-mascotas'),
    ('transporte-y-logistica', 'Fletes y mudanzas', 'fletes-mudanzas'),
    ('tecnologia-y-reparaciones', 'Reparación de celulares', 'reparacion-celulares'),
    ('tecnologia-y-reparaciones', 'Reparación de electrodomésticos', 'reparacion-electrodomesticos'),
    ('servicios-profesionales', 'Abogado', 'abogado'),
    ('servicios-profesionales', 'Contador', 'contador'),
    ('educacion-y-clases', 'Clases particulares', 'clases_particulares')
) AS v(cat_slug, nombre, slug)
JOIN public.categorias c ON c.slug = v.cat_slug
WHERE s.slug = v.slug;

-- 2) Insertar solo las que no existan por slug
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, v.nombre, v.slug
FROM (
  VALUES
    ('hogar-y-construccion', 'Gasfitería', 'gasfiteria'),
    ('hogar-y-construccion', 'Electricista', 'electricista'),
    ('hogar-y-construccion', 'Maestro obras menores', 'maestro-obras-menores'),
    ('hogar-y-construccion', 'Cerrajería', 'cerrajeria'),
    ('hogar-y-construccion', 'Ferretería', 'ferreteria'),
    ('hogar-y-construccion', 'Pintor', 'pintor'),
    ('hogar-y-construccion', 'Jardinero', 'jardinero'),
    ('automotriz', 'Mecánico', 'mecanico'),
    ('automotriz', 'Vulcanización', 'vulcanizacion'),
    ('automotriz', 'Lavado de autos', 'lavado-de-autos'),
    ('alimentacion', 'Panadería', 'panaderia'),
    ('alimentacion', 'Carnicería', 'carniceria'),
    ('alimentacion', 'Minimarket', 'minimarket'),
    ('alimentacion', 'Comida preparada', 'comida-preparada'),
    ('alimentacion', 'Agua purificada', 'agua-purificada'),
    ('alimentacion', 'Pastelería', 'pasteleria'),
    ('belleza-y-cuidado', 'Peluquería', 'peluqueria'),
    ('belleza-y-cuidado', 'Barbería', 'barberia'),
    ('mascotas', 'Veterinaria', 'veterinaria'),
    ('mascotas', 'Alimentos para mascotas', 'alimentos-mascotas'),
    ('mascotas', 'Peluquería mascotas', 'peluqueria-mascotas'),
    ('transporte-y-logistica', 'Fletes y mudanzas', 'fletes-mudanzas'),
    ('tecnologia-y-reparaciones', 'Reparación de celulares', 'reparacion-celulares'),
    ('tecnologia-y-reparaciones', 'Reparación de electrodomésticos', 'reparacion-electrodomesticos'),
    ('servicios-profesionales', 'Abogado', 'abogado'),
    ('servicios-profesionales', 'Contador', 'contador'),
    ('educacion-y-clases', 'Clases particulares', 'clases_particulares')
) AS v(cat_slug, nombre, slug)
JOIN public.categorias c ON c.slug = v.cat_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subcategorias s
  WHERE s.slug = v.slug
);

-- -----------------------------------------------------------------------------
-- D. Pivote emprendedor_subcategorias: quitar duplicados luego de remapear
--     (si ya existe fila con subcategoria_id destino, borrar la fila legacy)
-- -----------------------------------------------------------------------------
DELETE FROM public.emprendedor_subcategorias AS es
USING public.subcategorias AS s_from
JOIN _tax_merge AS m ON m.from_slug = s_from.slug
JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
WHERE es.subcategoria_id = s_from.id
  AND EXISTS (
    SELECT 1
    FROM public.emprendedor_subcategorias AS es2
    WHERE es2.emprendedor_id = es.emprendedor_id
      AND es2.subcategoria_id = s_to.id
  );

UPDATE public.emprendedor_subcategorias AS es
SET subcategoria_id = s_to.id
FROM public.subcategorias AS s_from
JOIN _tax_merge AS m ON m.from_slug = s_from.slug
JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
WHERE es.subcategoria_id = s_from.id;

-- -----------------------------------------------------------------------------
-- E. emprendedores.subcategoria_principal_id
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'emprendedores'
      AND column_name = 'subcategoria_principal_id'
  ) THEN
    UPDATE public.emprendedores AS e
    SET subcategoria_principal_id = s_to.id
    FROM public.subcategorias AS s_from
    JOIN _tax_merge AS m ON m.from_slug = s_from.slug
    JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
    WHERE e.subcategoria_principal_id = s_from.id;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- F. keyword_to_subcategory_map (sin borrar keywords; remapea a sub oficial)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.keyword_to_subcategory_map') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.keyword_to_subcategory_map AS km
  USING public.subcategorias AS s_from
  JOIN _tax_merge AS m ON m.from_slug = s_from.slug
  JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
  WHERE km.subcategoria_id = s_from.id
    AND EXISTS (
      SELECT 1
      FROM public.keyword_to_subcategory_map AS km2
      WHERE km2.normalized_keyword = km.normalized_keyword
        AND km2.subcategoria_id = s_to.id
    );

  UPDATE public.keyword_to_subcategory_map AS km
  SET subcategoria_id = s_to.id
  FROM public.subcategorias AS s_from
  JOIN _tax_merge AS m ON m.from_slug = s_from.slug
  JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
  WHERE km.subcategoria_id = s_from.id;
END $$;

-- -----------------------------------------------------------------------------
-- G. rubros_apertura: solo 15 rubros activos (resto activo = false)
--     Remapeo legacy→oficial sin violar UNIQUE(subcategoria_slug); luego metas + INSERT.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  has_nv boolean;
  has_nom boolean;
  rubros_15 text[] := ARRAY[
    'gasfiteria', 'electricista', 'maestro-obras-menores', 'cerrajeria', 'ferreteria',
    'mecanico', 'vulcanizacion', 'panaderia', 'carniceria', 'minimarket',
    'comida-preparada', 'agua-purificada', 'veterinaria', 'peluqueria', 'fletes-mudanzas'
  ];
BEGIN
  IF to_regclass('public.rubros_apertura') IS NULL THEN
    RAISE EXCEPTION 'Falta tabla public.rubros_apertura';
  END IF;

  -- Remapeo legacy → oficial: si ya existe fila con slug destino, desactivar legacy;
  -- si no existe destino, renombrar la fila legacy (evita UNIQUE(subcategoria_slug)).
  UPDATE public.rubros_apertura AS ra
  SET activo = false
  FROM _tax_merge AS m
  WHERE ra.subcategoria_slug = m.from_slug
    AND EXISTS (
      SELECT 1
      FROM public.rubros_apertura AS ra2
      WHERE ra2.subcategoria_slug = m.to_slug
    );

  UPDATE public.rubros_apertura AS ra
  SET subcategoria_slug = m.to_slug
  FROM _tax_merge AS m
  WHERE ra.subcategoria_slug = m.from_slug
    AND NOT EXISTS (
      SELECT 1
      FROM public.rubros_apertura AS ra2
      WHERE ra2.subcategoria_slug = m.to_slug
    );

  -- Si quedaron varias filas con el mismo slug, dejar activa solo la de id mínimo
  UPDATE public.rubros_apertura AS r
  SET activo = false
  FROM (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY subcategoria_slug ORDER BY id) AS rn
      FROM public.rubros_apertura
    ) t
    WHERE t.rn > 1
  ) dup
  WHERE r.id = dup.id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rubros_apertura' AND column_name = 'nombre_visible'
  ) INTO has_nv;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rubros_apertura' AND column_name = 'nombre'
  ) INTO has_nom;

  UPDATE public.rubros_apertura AS ra
  SET activo = false
  WHERE NOT (ra.subcategoria_slug = ANY (rubros_15));

  IF has_nv THEN
    UPDATE public.rubros_apertura AS ra
    SET maximo_contable = v.mx, activo = true, nombre_visible = v.nom
    FROM (
      VALUES
        ('gasfiteria', 4, 'Gasfitería'),
        ('electricista', 2, 'Electricista'),
        ('maestro-obras-menores', 3, 'Maestro obras menores'),
        ('cerrajeria', 1, 'Cerrajería'),
        ('ferreteria', 1, 'Ferretería'),
        ('mecanico', 3, 'Mecánico'),
        ('vulcanizacion', 2, 'Vulcanización'),
        ('panaderia', 2, 'Panadería'),
        ('carniceria', 2, 'Carnicería'),
        ('minimarket', 2, 'Minimarket'),
        ('comida-preparada', 3, 'Comida preparada'),
        ('agua-purificada', 1, 'Agua purificada'),
        ('veterinaria', 1, 'Veterinaria'),
        ('peluqueria', 2, 'Peluquería'),
        ('fletes-mudanzas', 1, 'Fletes y mudanzas')
    ) AS v(slug, mx, nom)
    WHERE ra.subcategoria_slug = v.slug
      AND ra.id = (
        SELECT MIN(r2.id) FROM public.rubros_apertura r2 WHERE r2.subcategoria_slug = v.slug
      );

    INSERT INTO public.rubros_apertura (subcategoria_slug, maximo_contable, activo, nombre_visible)
    SELECT v.slug, v.mx, true, v.nom
    FROM (
      VALUES
        ('gasfiteria', 4, 'Gasfitería'),
        ('electricista', 2, 'Electricista'),
        ('maestro-obras-menores', 3, 'Maestro obras menores'),
        ('cerrajeria', 1, 'Cerrajería'),
        ('ferreteria', 1, 'Ferretería'),
        ('mecanico', 3, 'Mecánico'),
        ('vulcanizacion', 2, 'Vulcanización'),
        ('panaderia', 2, 'Panadería'),
        ('carniceria', 2, 'Carnicería'),
        ('minimarket', 2, 'Minimarket'),
        ('comida-preparada', 3, 'Comida preparada'),
        ('agua-purificada', 1, 'Agua purificada'),
        ('veterinaria', 1, 'Veterinaria'),
        ('peluqueria', 2, 'Peluquería'),
        ('fletes-mudanzas', 1, 'Fletes y mudanzas')
    ) AS v(slug, mx, nom)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rubros_apertura r WHERE r.subcategoria_slug = v.slug
    );
  ELSIF has_nom THEN
    UPDATE public.rubros_apertura AS ra
    SET maximo_contable = v.mx, activo = true, nombre = v.nom
    FROM (
      VALUES
        ('gasfiteria', 4, 'Gasfitería'),
        ('electricista', 2, 'Electricista'),
        ('maestro-obras-menores', 3, 'Maestro obras menores'),
        ('cerrajeria', 1, 'Cerrajería'),
        ('ferreteria', 1, 'Ferretería'),
        ('mecanico', 3, 'Mecánico'),
        ('vulcanizacion', 2, 'Vulcanización'),
        ('panaderia', 2, 'Panadería'),
        ('carniceria', 2, 'Carnicería'),
        ('minimarket', 2, 'Minimarket'),
        ('comida-preparada', 3, 'Comida preparada'),
        ('agua-purificada', 1, 'Agua purificada'),
        ('veterinaria', 1, 'Veterinaria'),
        ('peluqueria', 2, 'Peluquería'),
        ('fletes-mudanzas', 1, 'Fletes y mudanzas')
    ) AS v(slug, mx, nom)
    WHERE ra.subcategoria_slug = v.slug
      AND ra.id = (
        SELECT MIN(r2.id) FROM public.rubros_apertura r2 WHERE r2.subcategoria_slug = v.slug
      );

    INSERT INTO public.rubros_apertura (subcategoria_slug, maximo_contable, activo, nombre)
    SELECT v.slug, v.mx, true, v.nom
    FROM (
      VALUES
        ('gasfiteria', 4, 'Gasfitería'),
        ('electricista', 2, 'Electricista'),
        ('maestro-obras-menores', 3, 'Maestro obras menores'),
        ('cerrajeria', 1, 'Cerrajería'),
        ('ferreteria', 1, 'Ferretería'),
        ('mecanico', 3, 'Mecánico'),
        ('vulcanizacion', 2, 'Vulcanización'),
        ('panaderia', 2, 'Panadería'),
        ('carniceria', 2, 'Carnicería'),
        ('minimarket', 2, 'Minimarket'),
        ('comida-preparada', 3, 'Comida preparada'),
        ('agua-purificada', 1, 'Agua purificada'),
        ('veterinaria', 1, 'Veterinaria'),
        ('peluqueria', 2, 'Peluquería'),
        ('fletes-mudanzas', 1, 'Fletes y mudanzas')
    ) AS v(slug, mx, nom)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rubros_apertura r WHERE r.subcategoria_slug = v.slug
    );
  ELSE
    RAISE EXCEPTION 'rubros_apertura: se requiere columna nombre_visible o nombre';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- G2. Postulaciones: subcategoria_final → ID oficial (si existe la columna)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'postulaciones_emprendedores'
      AND column_name = 'subcategoria_final'
  ) THEN
    UPDATE public.postulaciones_emprendedores AS p
    SET subcategoria_final = s_to.id
    FROM public.subcategorias AS s_from
    JOIN _tax_merge AS m ON m.from_slug = s_from.slug
    JOIN public.subcategorias AS s_to ON s_to.slug = m.to_slug
    WHERE p.subcategoria_final = s_from.id;
  END IF;
END $$;

-- =============================================================================
-- Verificación post-migración (copiar y ejecutar en SQL editor)
-- =============================================================================
-- -- 1) Categorías oficiales
-- SELECT slug, nombre FROM public.categorias
-- WHERE slug IN (
--   'hogar-y-construccion','automotriz','alimentacion','belleza-y-cuidado','mascotas',
--   'transporte-y-logistica','tecnologia-y-reparaciones','servicios-profesionales','educacion-y-clases'
-- ) ORDER BY slug;
--
-- -- 2) Subcategorías oficiales y categoría padre
-- SELECT s.slug, s.nombre, c.slug AS categoria_slug
-- FROM public.subcategorias s
-- JOIN public.categorias c ON c.id = s.categoria_id
-- WHERE s.slug IN (
--   'gasfiteria','electricista','maestro-obras-menores','cerrajeria','ferreteria','pintor','jardinero',
--   'mecanico','vulcanizacion','lavado-de-autos','panaderia','carniceria','minimarket','comida-preparada',
--   'agua-purificada','pasteleria','peluqueria','barberia','veterinaria','alimentos-mascotas','peluqueria-mascotas',
--   'fletes-mudanzas','reparacion-celulares','reparacion-electrodomesticos','abogado','contador','clases_particulares'
-- ) ORDER BY s.slug;
--
-- -- 3) Pivotes aún apuntando a slugs mergeados (debería ser 0 filas)
-- SELECT es.id, e.slug AS emprendedor_slug, sf.slug AS sub_slug
-- FROM public.emprendedor_subcategorias es
-- JOIN public.subcategorias sf ON sf.id = es.subcategoria_id
-- JOIN public.emprendedores e ON e.id = es.emprendedor_id
-- WHERE sf.slug IN (SELECT from_slug FROM _tax_merge);
--   -- Nota: _tax_merge es TEMP; tras cerrar sesión no existe. Para auditoría fija:
-- SELECT es.id, e.slug, sf.slug
-- FROM public.emprendedor_subcategorias es
-- JOIN public.subcategorias sf ON sf.id = es.subcategoria_id
-- JOIN public.emprendedores e ON e.id = es.emprendedor_id
-- WHERE sf.slug IN (
--   'gasfiter','calefont','pizzas','comida_casera','fletes','mudanzas','abogacia','contabilidad','clases'
-- );
--
-- -- 4) Duplicados (emprendedor_id, subcategoria_id) — debe ser 0
-- SELECT emprendedor_id, subcategoria_id, COUNT(*) AS n
-- FROM public.emprendedor_subcategorias
-- GROUP BY 1, 2 HAVING COUNT(*) > 1;
--
-- -- 5) Rubros de apertura activos (exactamente 15 filas activas con estas claves)
-- SELECT subcategoria_slug, maximo_contable, activo
-- FROM public.rubros_apertura
-- WHERE activo = true
-- ORDER BY subcategoria_slug;
