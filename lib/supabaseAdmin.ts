// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
}) {
  const { supabaseUrl, serviceRoleKey } = params;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin params.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Cliente admin desde variables de entorno del servidor.
 * Solo usar en Server Components, Route Handlers o server actions (nunca en cliente).
 */
export function getSupabaseAdminFromEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    );
  }
  return getSupabaseAdmin({ supabaseUrl, serviceRoleKey });
}
