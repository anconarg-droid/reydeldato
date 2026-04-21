import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { panelPlanesVisibleEnServidor } from "@/lib/panelPlanesVisibility";
import { getAppBaseUrlOrThrow } from "@/lib/transbankWebpayConfig";
import { procesarRetornoWebpayPlus } from "@/lib/pagosWebpayRetorno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function redirectPagoFallo(base: string, emprendedorId: string): NextResponse {
  const path = panelPlanesVisibleEnServidor() ? "/panel/planes" : "/panel";
  const u = new URL(path, base);
  if (emprendedorId) u.searchParams.set("id", emprendedorId);
  u.searchParams.set("pago", "fallo");
  return NextResponse.redirect(u);
}

function redirectPanelExito(base: string, emprendedorId: string): NextResponse {
  const u = new URL("/panel", base);
  if (emprendedorId) u.searchParams.set("id", emprendedorId);
  u.searchParams.set("pago", "exito");
  return NextResponse.redirect(u);
}

async function handleToken(tokenWs: string): Promise<NextResponse> {
  let base: string;
  try {
    base = getAppBaseUrlOrThrow();
  } catch {
    return new NextResponse("Configuración incompleta", { status: 503 });
  }

  const token = tokenWs.trim();
  await procesarRetornoWebpayPlus({
    supabase,
    tokenWs,
  });

  /** Fuente única de verdad para la redirección: fila en `pagos_emprendedores`. */
  let estadoDb: string | null = null;
  let emprendedorIdDb = "";
  if (token) {
    const { data, error } = await supabase
      .from("pagos_emprendedores")
      .select("estado, emprendedor_id")
      .eq("token_ws", token)
      .maybeSingle();
    if (!error && data) {
      const row = data as { estado?: string; emprendedor_id?: string };
      estadoDb = String(row.estado ?? "").trim() || null;
      emprendedorIdDb = String(row.emprendedor_id ?? "").trim();
    }
  }

  const pagado = estadoDb === "pagado";
  const res = pagado
    ? redirectPanelExito(base, emprendedorIdDb)
    : redirectPagoFallo(base, emprendedorIdDb);

  if (process.env.NODE_ENV === "development") {
    console.log("[api/pagos/retorno] redirect (solo BD)", {
      pagos_emprendedores_estado: estadoDb,
      emprendedor_id: emprendedorIdDb || "(vacío)",
      redirect_url: res.headers.get("location"),
    });
  }
  return res;
}

/** Transbank redirige con POST `application/x-www-form-urlencoded` y campo `token_ws`. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = String(form.get("token_ws") ?? "").trim();
    return handleToken(token);
  } catch {
    let base: string;
    try {
      base = getAppBaseUrlOrThrow();
    } catch {
      return new NextResponse("Error", { status: 500 });
    }
    return redirectPagoFallo(base, "");
  }
}

/** Útil en pruebas manuales: GET /api/pagos/retorno?token_ws=... */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token_ws") ?? "").trim();
  return handleToken(token);
}
