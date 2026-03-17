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
    const contactoRaw = s(body.contacto);

    if (!comuna_slug || !comuna_nombre) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna." },
        { status: 400 }
      );
    }

    if (!contactoRaw) {
      return NextResponse.json(
        { ok: false, error: "Falta contacto." },
        { status: 400 }
      );
    }

    let contacto = contactoRaw;
    let tipo_contacto: "whatsapp" | "email" = "whatsapp";

    if (contactoRaw.includes("@")) {
      if (!isValidEmail(contactoRaw)) {
        return NextResponse.json(
          { ok: false, error: "Email inválido." },
          { status: 400 }
        );
      }
      contacto = contactoRaw.toLowerCase();
      tipo_contacto = "email";
    } else {
      contacto = normalizeWhatsapp(contactoRaw);
      if (!(contacto.length === 11 && contacto.startsWith("56"))) {
        return NextResponse.json(
          { ok: false, error: "WhatsApp inválido." },
          { status: 400 }
        );
      }
      tipo_contacto = "whatsapp";
    }

    const { error } = await supabase
      .from("comunas_pre_registro_vecinos")
      .insert({
        comuna_slug,
        comuna_nombre,
        contacto,
        tipo_contacto,
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