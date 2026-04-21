/**
 * Registra un evento en analytics_events y actualiza emprendedor_stats y site_stats_daily.
 * Usar desde API routes (service role).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const ANALYTICS_EVENT_TYPES = [
  "page_view_home",
  "page_view_search",
  "page_view_comuna",
  "page_view_profile",
  /** Búsqueda disparada desde la home (query + comuna opcional). */
  "search",
  "search_result_impression",
  /** Clic en “Ver ficha / detalle” desde tarjeta de listado (no confundir con page_view_profile). */
  "card_view_click",
  /** Clic en “Ver detalles” desde tarjeta en home (metadata.source típico: card_home). */
  "profile_click",
  /** Conversión real: borrador creado en /publicar */
  "draft_created",
  /** Inicio de publicación (CTA "Publica tu negocio"). */
  "start_publicacion",
  "whatsapp_click",
  "instagram_click",
  "website_click",
  "email_click",
  "share_click",
  "waze_click",
  "maps_click",
  /** CTA “Publica tu emprendimiento” u homólogos desde la home. */
  "cta_publicar_click",
  /** Envío del formulario de recomendar emprendimiento (home embebida). */
  "submit_recomendacion",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

const EVENT_TYPES_SET = new Set<string>(ANALYTICS_EVENT_TYPES);

export function isValidEventType(t: string): t is AnalyticsEventType {
  return EVENT_TYPES_SET.has(t);
}

/** True si el evento incrementa columnas en `emprendedor_stats` (solo debe contarse con ficha pública). */
export function analyticsEventUsesEmprendedorStats(event_type: string): boolean {
  return Boolean(EMPRENDEDOR_STATS_COLUMNS[event_type as AnalyticsEventType]);
}

/** Eventos que actualizan emprendedor_stats (requieren emprendedor_id) */
const EMPRENDEDOR_STATS_COLUMNS: Partial<Record<AnalyticsEventType, keyof EmprendedorStatsRow>> = {
  page_view_profile: "page_view_profile",
  search_result_impression: "search_result_impression",
  whatsapp_click: "whatsapp_click",
  instagram_click: "instagram_click",
  website_click: "website_click",
  email_click: "email_click",
  share_click: "share_click",
};

/** Eventos que actualizan site_stats_daily */
const SITE_STATS_DAILY_COLUMNS: Partial<Record<AnalyticsEventType, keyof SiteStatsDailyRow>> = {
  page_view_home: "page_view_home",
  page_view_search: "page_view_search",
  page_view_comuna: "page_view_comuna",
  page_view_profile: "page_view_profile",
  search_result_impression: "search_result_impression",
};

type EmprendedorStatsRow = {
  page_view_profile: number;
  search_result_impression: number;
  whatsapp_click: number;
  instagram_click: number;
  website_click: number;
  email_click: number;
  share_click: number;
};

type SiteStatsDailyRow = {
  page_view_home: number;
  page_view_search: number;
  page_view_comuna: number;
  page_view_profile: number;
  search_result_impression: number;
};

function todayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export type RecordEventPayload = {
  event_type: string;
  emprendedor_id?: string | null;
  slug?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Inserta en analytics_events y actualiza emprendedor_stats y site_stats_daily.
 */
export async function recordEvent(
  supabase: SupabaseClient,
  payload: RecordEventPayload
): Promise<{ ok: boolean; error?: string }> {
  const { event_type, emprendedor_id, session_id, metadata } = payload;
  const slug = payload.slug ?? (metadata && typeof metadata === "object" && "slug" in metadata ? String((metadata as any).slug ?? "") : "");

  if (!event_type || !isValidEventType(event_type)) {
    return { ok: false, error: "event_type inválido o faltante" };
  }

  const meta = metadata && typeof metadata === "object" ? metadata : {};
  const sessionId = payload.session_id ?? (meta && "session_id" in meta ? String((meta as any).session_id ?? "") : null);

  const insertPayload = {
    event_type,
    emprendedor_id: emprendedor_id || null,
    session_id: sessionId || null,
    metadata: { ...meta, slug: slug || null },
  };

  const { error: insertError } = await supabase.from("analytics_events").insert(insertPayload);
  if (insertError) {
    console.error("analytics_events insert error:", insertError);
    return { ok: false, error: insertError.message };
  }

  const colEmp = EMPRENDEDOR_STATS_COLUMNS[event_type as AnalyticsEventType];
  if (colEmp && emprendedor_id) {
    const { error: rpcErr } = await supabase.rpc("increment_emprendedor_stat", {
      p_emprendedor_id: emprendedor_id,
      p_column: colEmp,
    });
    if (rpcErr) {
      const ok = await incrementEmprendedorStatManually(supabase, emprendedor_id, colEmp);
      if (!ok) console.error("emprendedor_stats update error:", rpcErr);
    }
  }

  const colSite = SITE_STATS_DAILY_COLUMNS[event_type as AnalyticsEventType];
  if (colSite) {
    const today = todayDate();
    const { error: rpcErr } = await supabase.rpc("increment_site_stat_daily", {
      p_stat_date: today,
      p_column: colSite,
    });
    if (rpcErr) {
      const ok = await incrementSiteStatDailyManually(supabase, today, colSite);
      if (!ok) console.error("site_stats_daily update error:", rpcErr);
    }
  }

  return { ok: true };
}

async function incrementEmprendedorStatManually(
  supabase: SupabaseClient,
  emprendedor_id: string,
  column: string
): Promise<boolean> {
  const { data: row, error: fetchErr } = await supabase
    .from("emprendedor_stats")
    .select(column)
    .eq("emprendedor_id", emprendedor_id)
    .maybeSingle();

  if (fetchErr) return false;

  const current = (row && (row as any)[column]) ?? 0;
  const { error: upsertErr } = await supabase.from("emprendedor_stats").upsert(
    {
      emprendedor_id,
      [column]: current + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "emprendedor_id" }
  );
  return !upsertErr;
}

async function incrementSiteStatDailyManually(
  supabase: SupabaseClient,
  stat_date: string,
  column: string
): Promise<boolean> {
  const { data: row, error: fetchErr } = await supabase
    .from("site_stats_daily")
    .select(column)
    .eq("stat_date", stat_date)
    .maybeSingle();

  if (fetchErr) return false;

  const current = (row && (row as any)[column]) ?? 0;
  const { error: upsertErr } = await supabase.from("site_stats_daily").upsert(
    { stat_date, [column]: current + 1 },
    { onConflict: "stat_date" }
  );
  return !upsertErr;
}
