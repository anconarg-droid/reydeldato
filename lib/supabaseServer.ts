import { createClient } from "@supabase/supabase-js";

// Validación obligatoria de variables de entorno
function must(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

// Cliente ADMIN (server only)
// ⚠️ Usa SERVICE ROLE, NUNCA lo expongas al frontend
export const supabaseAdmin = createClient(
  must("SUPABASE_URL"),
  must("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);