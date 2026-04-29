import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RPC_CONTAR_APERTURA_REAL_POR_COMUNA,
  VW_APERTURA_COMUNA_V2,
} from "@/lib/aperturaComunaContrato";

/** PostgREST / Supabase: el objeto error a veces no se ve en console (parece `{}`). */
export function serializeSupabaseError(err: unknown): string {
  if (err == null) return "null";
  if (err instanceof Error) return err.message;
  const o = err as Record<string, unknown>;
  const parts = [
    o.message,
    o.code,
    o.details,
    o.hint,
  ]
    .map((x) => (x != null ? String(x) : ""))
    .filter(Boolean);
  if (parts.length) return parts.join(" | ");
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export type AperturaComunaV2Row = {
  porcentaje_apertura?: unknown;
  total_requerido?: unknown;
  total_cumplido?: unknown;
  abierta?: unknown;
  forzar_abierta?: unknown;
  comuna_abierta?: unknown;
};

/**
 * Misma fila que `vw_apertura_comuna_v2`: primero SELECT a la vista; si falla (permisos, schema),
 * fallback a `contar_apertura_real_por_comuna` (mismos números en SQL).
 */
export async function loadAperturaComunaV2Resumen(
  supabase: SupabaseClient,
  comunaSlug: string
): Promise<{ data: AperturaComunaV2Row | null; warn: string | null }> {
  const slug = String(comunaSlug || "").trim().toLowerCase();
  if (!slug) return { data: null, warn: null };

  const view = await supabase
    .from(VW_APERTURA_COMUNA_V2)
    .select(
      "porcentaje_apertura, total_requerido, total_cumplido, abierta, forzar_abierta, comuna_abierta"
    )
    .eq("comuna_slug", slug)
    .maybeSingle();

  if (!view.error && view.data) {
    return { data: view.data as AperturaComunaV2Row, warn: null };
  }

  if (view.error && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn(
      "[apertura] vista",
      VW_APERTURA_COMUNA_V2,
      serializeSupabaseError(view.error)
    );
  }

  const rpc = await supabase.rpc(RPC_CONTAR_APERTURA_REAL_POR_COMUNA, {
    p_comuna_slug: slug,
  });

  if (rpc.error) {
    const msg = serializeSupabaseError(rpc.error);
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[apertura] rpc", RPC_CONTAR_APERTURA_REAL_POR_COMUNA, msg);
    }
    return { data: null, warn: msg };
  }

  const raw = rpc.data;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") {
    return { data: null, warn: "rpc_sin_fila" };
  }

  const r = row as Record<string, unknown>;
  return {
    data: {
      porcentaje_apertura: r.porcentaje_apertura,
      total_requerido: r.total_rubros_meta,
      total_cumplido: r.rubros_cumplidos,
      abierta: r.abierta,
      forzar_abierta: r.forzar_abierta,
      comuna_abierta: r.comuna_abierta,
    },
    warn: null,
  };
}
