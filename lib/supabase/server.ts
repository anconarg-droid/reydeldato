import { createClient } from "@supabase/supabase-js";

/**
 * Cliente "normal" (anon) para Server Components / helpers.
 * Úsalo cuando NO necesitas saltarte RLS.
 */
export function createSupabaseServerPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}