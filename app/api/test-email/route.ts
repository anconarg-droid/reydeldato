import { NextResponse } from "next/server";
import { enviarCorreoTest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prueba Resend en local. En producción solo corre si RESEND_ENABLE_TEST_EMAIL=1.
 */
export async function GET() {
  const allowInProd = process.env.RESEND_ENABLE_TEST_EMAIL === "1";
  if (process.env.NODE_ENV === "production" && !allowInProd) {
    return NextResponse.json(
      { ok: false, error: "Ruta de prueba deshabilitada en producción." },
      { status: 403 }
    );
  }

  await enviarCorreoTest();

  return NextResponse.json({ ok: true });
}
