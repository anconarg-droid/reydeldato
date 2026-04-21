import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  adminPublishEmprendedorFicha,
  triggerReindexEmprendedorAlgolia,
} from "@/app/api/_lib/adminPublishEmprendedorFicha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = s(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del emprendimiento." },
        { status: 400 }
      );
    }

    const result = await adminPublishEmprendedorFicha(supabase, id);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          reason: result.reason,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        { status: result.status }
      );
    }

    const reindexAlgolia = await triggerReindexEmprendedorAlgolia(result.id);

    return NextResponse.json({
      ok: true,
      publicacion: { ok: true, estado_publicacion: "publicado" as const },
      item: {
        id: result.id,
        nombre: result.nombre,
        estado_publicacion: "publicado",
      },
      reindexAlgolia,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al aprobar.",
      },
      { status: 500 }
    );
  }
}
