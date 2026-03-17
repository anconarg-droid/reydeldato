/**
 * Obtiene el ID del usuario autenticado que realiza una acción en el panel
 * (ej. corrección manual de clasificación), para guardar en reviewed_by.
 * No bloquea si no hay auth; devuelve null.
 */

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Intenta obtener el ID del usuario desde la petición.
 * - Si existe cabecera Authorization: Bearer <jwt>, valida el token con Supabase Auth
 *   y devuelve el user.id si es válido.
 * - Si no hay token o no está configurado SUPABASE_ANON_KEY, devuelve null.
 */
export async function getPanelReviewerId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const client = createClient(url, anonKey);
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(token);
    if (userError || !user?.id) return null;
    return user.id;
  } catch {
    return null;
  }
}
