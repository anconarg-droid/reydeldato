import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DESCRIPCION_LENGTH = 25;
const SUGERIR_MIN = 3;
const SUGERIR_MAX = 8;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

const SYSTEM_PROMPT = `Eres un asistente para una plataforma chilena de emprendimientos "Rey del Dato".

Tu tarea: a partir de la descripción del negocio (y opcionalmente el nombre), genera entre 3 y 8 palabras clave en español que definan el negocio. Son para que los clientes encuentren el emprendimiento en búsquedas.

Reglas:
- Responde ÚNICAMENTE con un JSON válido: { "keywords": ["palabra1", "palabra2", ...] }
- Entre 3 y 8 elementos en "keywords".
- Usa términos concretos: productos, servicios o rubros (ej: pan, repostería, gasfiter, mecánico, peluquería canina).
- En minúsculas, sin tildes en los slugs no necesarias, una o dos palabras por keyword.
- No incluyas palabras genéricas como "calidad", "servicio", "empresa", "mejor".
- No incluyas el nombre del negocio ni ubicaciones como palabras clave a menos que sean relevantes para el rubro.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const descripcionNegocio = s((body as Record<string, unknown>).descripcion_negocio);
    const nombreEmprendimiento = s((body as Record<string, unknown>).nombre_emprendimiento);

    if (!descripcionNegocio || descripcionNegocio.length < MIN_DESCRIPCION_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: "La descripción del negocio debe tener al menos 25 caracteres para sugerir palabras clave.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Configuración del servicio no disponible." },
        { status: 500 }
      );
    }

    const userContent =
      nombreEmprendimiento.length > 0
        ? `Nombre del negocio: "${nombreEmprendimiento}"\n\nDescripción: "${descripcionNegocio}"`
        : `Descripción del negocio: "${descripcionNegocio}"`;

    const completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!completionRes.ok) {
      const text = await completionRes.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "No se pudieron generar sugerencias." },
        { status: 502 }
      );
    }

    const completionJson = (await completionRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = completionJson?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { ok: false, error: "Respuesta inválida del servicio." },
        { status: 502 }
      );
    }

    let parsed: { keywords?: unknown };
    try {
      parsed = JSON.parse(content) as { keywords?: unknown };
    } catch {
      return NextResponse.json(
        { ok: false, error: "No se pudieron interpretar las sugerencias." },
        { status: 502 }
      );
    }

    const raw = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    const keywords = [
      ...new Set(
        raw.map((k) => normalizeKeyword(String(k))).filter(Boolean)
      ),
    ].slice(0, SUGERIR_MAX);

    if (keywords.length < SUGERIR_MIN) {
      return NextResponse.json(
        { ok: true, keywords: keywords.length ? keywords : ["negocio", "emprendimiento", "servicio"] },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, keywords }, { status: 200 });
  } catch (err) {
    console.error("[sugerir-keywords]", err);
    return NextResponse.json(
      { ok: false, error: "Error al generar sugerencias." },
      { status: 500 }
    );
  }
}
