import { NextResponse } from "next/server";

/** Ruta reservada; evita build roto por archivo vacío. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Este endpoint no está en uso." },
    { status: 410 }
  );
}
