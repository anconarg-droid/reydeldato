import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeWhatsapp(input: string) {
  const clean = input.replace(/\D/g, "");
  if (clean.length === 9 && clean.startsWith("9")) return `56${clean}`;
  if (clean.length === 11 && clean.startsWith("56")) return clean;
  return clean;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const comuna_slug = s(body.comuna_slug);
    const comuna_nombre = s(body.comuna_nombre);

    const nombre_contacto = s(body.nombre_contacto);
    const nombre_emprendimiento = s(body.nombre_emprendimiento);
    const categoria_referencial = s(body.categoria_referencial);
    const descripcion_corta = s(body.descripcion_corta);
    const whatsapp = normalizeWhatsapp(s(body.whatsapp));
    const instagram = s(body.instagram);
    const email = s(body.email).toLowerCase();

    if (!comuna_slug || !comuna_nombre) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna." },
        { status: 400 }
      );
    }

    if (!nombre_contacto) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre de contacto." },
        { status: 400 }
      );
    }

    if (!nombre_emprendimiento) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre del emprendimiento." },
        { status: 400 }
      );
    }

    if (!(whatsapp.length === 11 && whatsapp.startsWith("56"))) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp inválido." },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("comunas_pre_registro_emprendedores")
      .insert({
        comuna_slug,
        comuna_nombre,
        nombre_contacto,
        nombre_emprendimiento,
        categoria_referencial: categoria_referencial || null,
        descripcion_corta: descripcion_corta || null,
        whatsapp,
        instagram: instagram || null,
        email: email || null,
      });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}