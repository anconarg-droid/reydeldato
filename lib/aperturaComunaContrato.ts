/**
 * Contrato único de “apertura por comuna” en producto y admin.
 *
 * **Resumen (porcentaje, total cumplido / requerido)**  
 * Todo debe leer la misma vista de Supabase:
 * - `VW_APERTURA_COMUNA_V2` → `total_requerido` = rubros activos en `rubros_apertura`;
 *   `total_cumplido` = rubros con mínimo cumplido vía `contar_grupos_apertura_por_comuna`
 *   (faltantes = 0). `abierta` solo si todos los rubros activos cumplen.
 * - `contar_apertura_real_por_comuna(slug)` devuelve la misma fila agregada (diagnóstico).
 *
 * Usos en esta app:
 * - Cards “Comunas en preparación” → `GET /api/comunas/estado`
 * - `/abrir-comuna/[slug]`, `app/[comuna]/page.tsx`, `loadComunaAperturaPublica`
 * - Admin listado `loadAdminAperturaComunasResumen` / detalle `loadAdminAperturaComunaDetalle` (bloque agregado)
 *
 * **Desglose por rubro (admin)**  
 * `VW_ADMIN_APERTURA_RUBRO_POR_COMUNA` replica en SQL la misma noción territorial que el conteo
 * (comentarios en migración `vw_admin_apertura_rubro_por_comuna`). Listado de IDs: `RPC_LIST_EMPRENDEDORES_APERTURA_ADMIN`.
 *
 * **Por qué dos comunas de la misma región pueden verse con distinto %**  
 * El conteo por comuna incluye a todos los emprendedores que “atienden” esa comuna: base, pivots,
 * `varias_comunas`, cobertura regional (misma `region_id` vía `emprendedor_regiones_cobertura`) y nacional.
 * Un negocio regional RM suma **+1 al total de cada comuna cuya `comunas.region_id` coincide con el pivote**;
 * encima, cada comuna tiene además negocios **solo locales**, distintos entre sí. Por eso el porcentaje
 * no es idéntico entre comunas RM aunque compartan el bloque regional.
 *
 * Si una ficha `varias_regiones` + RM **no** incrementa una comuna RM concreta, suele ser dato en BD
 * (`emprendedor_regiones_cobertura`, `comunas.region_id`, `cobertura_tipo`/`nivel_cobertura`), no dos rutas TS.
 */

export const VW_APERTURA_COMUNA_V2 = "vw_apertura_comuna_v2" as const;

export const VW_FALTANTES_COMUNA_V2 = "vw_faltantes_comuna_v2" as const;

/** Conteo territorial de oferta (listados / activación); no define por sí solo “comuna abierta”. */
export const FN_COUNT_EMPRENDEDORES_APERTURA = "count_emprendedores_abrir_comuna_activacion" as const;

/** Desglose por rubro de apertura (misma regla que el resumen en `VW_APERTURA_COMUNA_V2`). */
export const FN_CONTAR_GRUPOS_APERTURA_POR_COMUNA = "contar_grupos_apertura_por_comuna" as const;

/** RPC de diagnóstico: misma fila agregada que la vista (slug → rubros cumplidos / meta). */
export const RPC_CONTAR_APERTURA_REAL_POR_COMUNA = "contar_apertura_real_por_comuna" as const;

/** Listado admin (service_role); mismo filtro territorial que el count. */
export const RPC_LIST_EMPRENDEDORES_APERTURA_ADMIN =
  "list_emprendedores_abrir_comuna_activacion_admin" as const;

export const VW_ADMIN_APERTURA_RUBRO_POR_COMUNA = "vw_admin_apertura_rubro_por_comuna" as const;
