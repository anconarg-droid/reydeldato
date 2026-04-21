-- =============================================================================
-- Alinear rubros_apertura con la subcategoría publicada real "Fletes y mudanzas".
--
-- Contexto: la taxonomía oficial (p. ej. 20260329000002) define:
--   ('vehiculos_transporte', 'Fletes y mudanzas', 'fletes')
-- Los emprendedores publicados quedan en emprendedor_subcategorias → subcategorias.slug = 'fletes'.
-- Si rubros_apertura sigue con subcategoria_slug = 'mudanzas' (legado de transporte_fletes),
-- vw_admin_apertura_rubro_por_comuna y el admin no cuentan esos emprendedores en la fila "Mudanzas".
--
-- Esta migración no toca emprendedores; solo corrige la clave de rubro de apertura.
-- =============================================================================

-- Caso A: Solo existe rubro activo con slug legacy 'mudanzas' y en catálogo existe 'fletes'.
--         → apuntar el rubro al slug canónico publicado.
UPDATE public.rubros_apertura ra
SET
  subcategoria_slug = 'fletes',
  nombre = COALESCE(NULLIF(trim(ra.nombre), ''), 'Fletes y mudanzas')
WHERE ra.subcategoria_slug = 'mudanzas'
  AND ra.activo = true
  AND EXISTS (SELECT 1 FROM public.subcategorias s WHERE s.slug = 'fletes')
  AND NOT EXISTS (
    SELECT 1
    FROM public.rubros_apertura x
    WHERE x.activo = true
      AND x.subcategoria_slug = 'fletes'
      AND x.id IS DISTINCT FROM ra.id
  );

-- Caso B: Ya hay rubro activo 'fletes' y otro activo 'mudanzas' (duplicado conceptual).
--         → desactivar la fila legacy para un solo conteo canónico.
UPDATE public.rubros_apertura ra
SET activo = false
WHERE ra.subcategoria_slug = 'mudanzas'
  AND ra.activo = true
  AND EXISTS (
    SELECT 1
    FROM public.rubros_apertura x
    WHERE x.activo = true
      AND x.subcategoria_slug = 'fletes'
      AND x.id IS DISTINCT FROM ra.id
  );
