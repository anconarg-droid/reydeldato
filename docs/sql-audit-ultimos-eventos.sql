-- =============================================================================
-- Rey del Dato – Auditoría de eventos de tracking (Supabase)
-- Ejecutar en SQL Editor de Supabase para revisar últimos eventos guardados.
-- =============================================================================

-- 1) Últimos 200 eventos (todos los tipos)
SELECT
  id,
  emprendedor_id,
  tipo_evento,
  canal,
  metadata,
  created_at
FROM public.emprendedor_eventos
ORDER BY created_at DESC
LIMIT 200;

-- 2) Solo visitas a la home (reydeldato.cl/)
SELECT
  id,
  tipo_evento,
  canal,
  metadata->>'session_id' AS session_id,
  created_at
FROM public.emprendedor_eventos
WHERE tipo_evento = 'page_view_home'
ORDER BY created_at DESC
LIMIT 100;

-- 3) Conteo por tipo de evento (últimos 7 días)
SELECT
  tipo_evento,
  COUNT(*) AS total
FROM public.emprendedor_eventos
WHERE created_at >= now() - interval '7 days'
GROUP BY tipo_evento
ORDER BY total DESC;

-- 4) Confirmar si la home está registrando visitas (debe devolver filas si hay tráfico)
SELECT COUNT(*) AS total_page_view_home
FROM public.emprendedor_eventos
WHERE tipo_evento = 'page_view_home';
