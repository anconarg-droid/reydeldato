import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerWithKey(params: {
  supabaseUrl: string;
  supabaseKey: string;
}) {
  return createClient(params.supabaseUrl, params.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}