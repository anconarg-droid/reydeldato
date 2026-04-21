import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";

/**
 * Resumen alineado con {@link tieneFichaCompleta} (misma regla que `isPerfilCompleto` / listados).
 *
 * # Regla comercial: perfil completo vs básico
 *
 * **Perfil completo** (`esFichaCompleta`, listados, `/emprendedor/[slug]`) = misma condición que
 * {@link trialVigenteOPlanPagoActivoDesdeBusqueda} / `fichaActivaPorNegocio`: **trial vigente** o **plan activo y vigente**
 * (`tieneFichaCompleta`). No se exige Instagram, sitio web, foto ni texto.
 *
 * **Perfil básico**: sin trial/plan vigente.
 */

export type EstadoFicha = "basica" | "mejorada";

export type CalcularEstadoFichaInput = {
  nombre_emprendimiento?: string | null;
  whatsapp_principal?: string | null;
  frase_negocio?: string | null;
  comuna_id?: number | null;
  cobertura_tipo?: string | null;

  descripcion_libre?: string | null;
  foto_principal_url?: string | null;
  galeria_count?: number | null;

  instagram?: string | null;
  sitio_web?: string | null;

  plan_activo?: boolean | null;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  trial_expira?: string | null;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * **mejorada** = trial o plan vigente ({@link tieneFichaCompleta}), misma base que `fichaActivaPorNegocio`.
 */
export function calcularEstadoFicha(input: CalcularEstadoFichaInput): EstadoFicha {
  const suscripcion = tieneFichaCompleta({
    planActivo: input.plan_activo,
    planExpiraAt: input.plan_expira_at ?? null,
    trialExpiraAt: input.trial_expira_at ?? null,
    trialExpira: input.trial_expira ?? null,
  });
  return suscripcion ? "mejorada" : "basica";
}

function pickPlanActivo(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null | undefined
): boolean {
  const h = hydrated ?? {};
  if (h.plan_activo === true) return true;
  return row.plan_activo === true;
}

function pickField(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  const h = hydrated ?? {};
  for (const k of keys) {
    const v = (h as Record<string, unknown>)[k];
    const t = s(v);
    if (t) return t;
  }
  for (const k of keys) {
    const v = row[k];
    const t = s(v);
    if (t) return t;
  }
  return "";
}

/**
 * Trial vigente (p. ej. primeros 90 días) o plan pagado vigente — {@link tieneFichaCompleta}.
 * No evalúa foto, redes, descripción ni WhatsApp.
 *
 * Listados: campo `fichaActivaPorNegocio` y filtro “Ver mejores opciones”.
 */
export function trialVigenteOPlanPagoActivoDesdeBusqueda(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null,
): boolean {
  const h = hydrated ?? {};
  const planExp = pickField(row, h, "plan_expira_at", "plan_expira");
  const trialAt = pickField(row, h, "trial_expira_at");
  const trialLegacy = pickField(row, h, "trial_expira");
  return tieneFichaCompleta({
    planActivo: pickPlanActivo(row, h),
    planExpiraAt: planExp || null,
    trialExpiraAt: trialAt || null,
    trialExpira: trialLegacy || null,
  });
}

function firstUrlFromGaleriaArray(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  for (const x of raw) {
    const t = s(x);
    if (t) return t;
  }
  return "";
}

/**
 * Foto para listados (RPC + hidratación): principal primero, luego primera URL de galería.
 */
export function fotoListadoEmprendedorBusqueda(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null
): string {
  const h = hydrated ?? {};
  const principal = pickField(row, h, "foto_principal_url");
  if (principal) return principal;
  return (
    firstUrlFromGaleriaArray(h.galeria_urls_arr) ||
    firstUrlFromGaleriaArray(row.galeria_urls_arr) ||
    firstUrlFromGaleriaArray(row.galeria_urls) ||
    firstUrlFromGaleriaArray(h.galeria_urls) ||
    ""
  );
}

/**
 * **Única fuente de verdad** para “perfil completo” en listados (variante `mejorada` vs `basica`):
 * `GET /api/buscar`, `GET /api/categoria/[slug]`, y cualquier mapeo server que deba coincidir con esos JSON.
 *
 * En el cliente, badge + filtro “Ver mejores perfiles” deben usar la misma regla vía
 * `isPerfilCompletoParaBusqueda` en `lib/isPerfilCompletoParaBusqueda.ts` (flags del API:
 * `esFichaCompleta`, `estadoFicha`, `fichaActivaPorNegocio`).
 *
 * @param row — fila principal (p. ej. RPC o registro índice); `pickField` también lee `hydrated` primero cuando aplica.
 * @param hydrated — fila de `emprendedores` u orígenes equivalentes; puede ser `null` si `row` ya está fusionada.
 * @param galeriaFilasPivot — ignorado; se mantiene la firma por compatibilidad con callers / auditoría.
 */
export function fichaPublicaEsMejoradaDesdeBusqueda(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null,
  galeriaFilasPivot = 0
): boolean {
  void galeriaFilasPivot;
  return trialVigenteOPlanPagoActivoDesdeBusqueda(row, hydrated);
}

/** Auditoría / scripts: métricas y motivo legible si la ficha no es "mejorada" en listados. */
export function explicarFichaListadoDesdeBusqueda(
  row: Record<string, unknown>,
  hydrated: Record<string, unknown> | null,
  galeriaFilasPivot = 0
): {
  completa: boolean;
  motivoBasica: string | null;
  metricas: {
    descripcionCaracteres: number;
    totalFotos: number;
    filasPivotGaleria: number;
    urlsEnArrayGaleria: number;
    tieneInstagram: boolean;
    tieneWeb: boolean;
  };
} {
  const h = hydrated ?? {};
  const galeriaRaw =
    h.galeria_urls_arr ??
    row.galeria_urls_arr ??
    row.galeria_urls ??
    h.galeria_urls;
  const fromArray = Array.isArray(galeriaRaw) ? galeriaRaw.length : 0;
  const pivot = Number.isFinite(galeriaFilasPivot)
    ? Math.max(0, Math.floor(galeriaFilasPivot))
    : 0;
  const galeria_count = Math.max(fromArray, pivot);

  const desc = pickField(row, h, "descripcion_libre", "descripcion_larga");
  const foto = pickField(row, h, "foto_principal_url");
  const ig = pickField(row, h, "instagram");
  const web = pickField(row, h, "sitio_web", "web");

  const descripcionCaracteres = s(desc).length;
  const totalFotos = (s(foto) ? 1 : 0) + galeria_count;
  const tieneInstagram = s(ig).length > 0;
  const tieneWeb = s(web).length > 0;

  const completa = fichaPublicaEsMejoradaDesdeBusqueda(
    row,
    hydrated,
    galeriaFilasPivot
  );

  let motivoBasica: string | null = null;
  if (!completa) {
    motivoBasica = "sin trial ni plan vigente";
  }

  return {
    completa,
    motivoBasica,
    metricas: {
      descripcionCaracteres,
      totalFotos,
      filasPivotGaleria: pivot,
      urlsEnArrayGaleria: fromArray,
      tieneInstagram,
      tieneWeb,
    },
  };
}

/** Ficha pública `/emprendedor/[slug]` (objeto ya cargado). `galeriaCount` ignorado para la regla. */
export function fichaPublicaEsMejoradaDesdeItem(
  item: Record<string, unknown>,
  galeriaCount: number
): boolean {
  void galeriaCount;
  return (
    calcularEstadoFicha({
      nombre_emprendimiento: pickField(item, null, "nombre_emprendimiento", "nombre"),
      whatsapp_principal: pickField(item, null, "whatsapp_principal", "whatsapp"),
      frase_negocio: pickField(item, null, "frase_negocio", "descripcion_corta"),
      comuna_id:
        Number(item.comuna_id ?? item.comuna_base_id ?? 0) || 0,
      cobertura_tipo: pickField(item, null, "cobertura_tipo", "nivel_cobertura"),
      descripcion_libre: pickField(item, null, "descripcion_libre", "descripcion_larga"),
      foto_principal_url: pickField(item, null, "foto_principal_url"),
      galeria_count: 0,
      instagram: pickField(item, null, "instagram"),
      sitio_web: pickField(item, null, "sitio_web", "web"),
      plan_activo: pickPlanActivo(item, null),
      plan_expira_at: pickField(item, null, "plan_expira_at", "plan_expira") || null,
      trial_expira_at: pickField(item, null, "trial_expira_at") || null,
      trial_expira: pickField(item, null, "trial_expira") || null,
    }) === "mejorada"
  );
}
