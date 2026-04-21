-- =============================================================================
-- Seguridad: la vista de Algolia incluye email (NO debe ser pública)
-- =============================================================================
-- `vw_emprendedores_algolia_final` se usa para indexación / backend (service_role),
-- pero incluye columnas sensibles (p. ej. email).
--
-- Por defecto, las vistas pueden quedar accesibles según grants previos. Forzamos:
-- - Revocar a anon/authenticated
-- - Conceder solo a service_role
-- =============================================================================

REVOKE ALL ON public.vw_emprendedores_algolia_final FROM anon, authenticated;
GRANT SELECT ON public.vw_emprendedores_algolia_final TO service_role;

