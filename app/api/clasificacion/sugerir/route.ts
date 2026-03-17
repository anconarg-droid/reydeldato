import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const IS_DEV = process.env.NODE_ENV !== "production";

type OpenAIResponse = {
  tipo_actividad?: string;
  sector_slug?: string;
  tags_slugs?: string[];
  keywords?: string[];
  confianza?: number;
};

type ClasificacionSugerida = {
  tipo_actividad: "venta" | "servicio" | "arriendo";
  sector_slug: string;
  tags_slugs: string[];
  keywords: string[];
  confianza: number;
};

const TIPO_ACTIVIDAD_VALUES = ["venta", "servicio", "arriendo"] as const;

const SECTOR_SLUG_VALUES = [
  "alimentacion",
  "hogar_construccion",
  "automotriz",
  "salud_bienestar",
  "belleza_estetica",
  "mascotas",
  "eventos",
  "educacion_clases",
  "tecnologia",
  "comercio_tiendas",
  "transporte_fletes",
  "jardin_agricultura",
  "profesionales_asesorias",
  "turismo_alojamiento",
  "otros",
] as const;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function ensureEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno ${name}`);
  }
  return value;
}

function normalizeTags(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => s(v).toLowerCase())
    .filter((v) => !!v)
    .slice(0, 12);
}

function normalizeKeywords(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const val = s(raw).toLowerCase();
    if (!val) continue;
    if (seen.has(val)) continue;
    seen.add(val);
    out.push(val);
    if (out.length >= 20) break;
  }
  return out;
}

function validateAndCoerceResponse(json: unknown): ClasificacionSugerida {
  if (typeof json !== "object" || json === null) {
    throw new Error("Respuesta de OpenAI no es un objeto JSON");
  }

  const obj = json as OpenAIResponse;

  const tipoRaw = s(obj.tipo_actividad).toLowerCase();
  if (!TIPO_ACTIVIDAD_VALUES.includes(tipoRaw as any)) {
    throw new Error("tipo_actividad inválido en respuesta de OpenAI");
  }

  const sectorRaw = s(obj.sector_slug);
  if (!SECTOR_SLUG_VALUES.includes(sectorRaw as any)) {
    throw new Error("sector_slug inválido en respuesta de OpenAI");
  }

  const tags = normalizeTags(obj.tags_slugs);
  if (tags.length < 1) {
    throw new Error("tags_slugs vacío o inválido en respuesta de OpenAI");
  }

  const keywords = normalizeKeywords(obj.keywords ?? []);

  let confianza = typeof obj.confianza === "number" ? obj.confianza : NaN;
  if (!Number.isFinite(confianza) || confianza < 0 || confianza > 1) {
    throw new Error("confianza inválida en respuesta de OpenAI");
  }

  // Regla de negocio: limitar tags a 6 para esta V1
  const trimmedTags = tags.slice(0, 6);

  return {
    tipo_actividad: tipoRaw as ClasificacionSugerida["tipo_actividad"],
    sector_slug: sectorRaw,
    tags_slugs: trimmedTags,
    keywords,
    confianza,
  };
}

const SYSTEM_PROMPT = `
Eres un clasificador experto de negocios para una plataforma chilena llamada "Rey del Dato".

Debes clasificar un negocio en 3 capas:
1) tipo_actividad
2) sector_slug
3) tags_slugs
Además debes generar keywords útiles para buscador y un nivel de confianza global.

Reglas:
- Responde EXCLUSIVAMENTE con un JSON válido, sin texto adicional.
- No incluyas comentarios ni explicaciones fuera del JSON.

Definiciones:

1) tipo_actividad (elige exactamente uno):
- "venta"
- "servicio"
- "arriendo"

2) sector_slug (elige exactamente uno):
- "alimentacion"
- "hogar_construccion"
- "automotriz"
- "salud_bienestar"
- "belleza_estetica"
- "mascotas"
- "eventos"
- "educacion_clases"
- "tecnologia"
- "comercio_tiendas"
- "transporte_fletes"
- "jardin_agricultura"
- "profesionales_asesorias"
- "turismo_alojamiento"
- "otros"

3) tags_slugs:
- Array de entre 3 y 6 elementos.
- Cada elemento es un slug corto, en minúsculas, usando solo letras, números y guion_bajo.
- Representan rubros o especialidades concretas (ej: "gasfiter", "electricista", "peluqueria_canina").
- No incluyas comunas ni regiones en los tags.

4) keywords:
- Array de hasta 10 palabras o frases cortas, en español, útiles para buscador.

5) confianza:
- Número entre 0 y 1 (máximo 2 decimales) que representa tu seguridad global en la clasificación.

Formato de salida (estricto):
{
  "tipo_actividad": "venta" | "servicio" | "arriendo",
  "sector_slug": "<uno de la lista>",
  "tags_slugs": ["tag_slug_1", "tag_slug_2", "tag_slug_3"],
  "keywords": ["kw1", "kw2"],
  "confianza": 0.0
}
`.trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const descripcion = s((body as any).descripcion);

    if (!descripcion || descripcion.length < 10) {
      return NextResponse.json(
        {
          ok: false,
          error: "descripcion_requerida",
          message: "La descripción debe tener al menos 10 caracteres.",
        },
        { status: 400 }
      );
    }

    let apiKey: string;
    let model: string;
    try {
      apiKey = ensureEnv("OPENAI_API_KEY");
      model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
      if (IS_DEV) {
        console.log("[CLASIF] Env OK", {
          model,
          hasApiKey: !!apiKey,
        });
      }
    } catch (envErr) {
      console.error("[CLASIF] Error leyendo env", envErr);
      return NextResponse.json(
        {
          ok: false,
          error: "env_error",
          message:
            envErr instanceof Error ? envErr.message : "Error leyendo variables de entorno.",
        },
        { status: 500 }
      );
    }

    let completionRes: Response;
    try {
      if (IS_DEV) {
        console.log("[CLASIF] Llamando a OpenAI", { model });
      }
      completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Descripción del negocio: "${descripcion}"`,
            },
          ],
        }),
      });
    } catch (fetchErr) {
      console.error("[CLASIF] Error de red llamando a OpenAI", fetchErr);
      return NextResponse.json(
        {
          ok: false,
          error: "openai_network_error",
          message:
            fetchErr instanceof Error ? fetchErr.message : "Error de red llamando a OpenAI.",
          ...(IS_DEV ? { debug: { stack: fetchErr instanceof Error ? fetchErr.stack : null } } : {}),
        },
        { status: 502 }
      );
    }

    if (!completionRes.ok) {
      const text = await completionRes.text().catch(() => "");
      console.error("[CLASIF] OpenAI respondió error", {
        status: completionRes.status,
        body: text,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "openai_error",
          message: "Error llamando a OpenAI.",
          detail: text.slice(0, 1000),
          status: completionRes.status,
        },
        { status: 502 }
      );
    }

    const completionJson = (await completionRes.json()) as any;
    if (IS_DEV) {
      console.log("[CLASIF] OpenAI completion JSON", {
        hasChoices: Array.isArray(completionJson?.choices),
        raw: completionJson,
      });
    }
    const content =
      completionJson?.choices?.[0]?.message?.content &&
      typeof completionJson.choices[0].message.content === "string"
        ? (completionJson.choices[0].message.content as string)
        : "";

    if (!content) {
      console.error("[CLASIF] OpenAI devolvió contenido vacío", completionJson);
      return NextResponse.json(
        {
          ok: false,
          error: "openai_empty_response",
          message: "OpenAI no devolvió contenido.",
          ...(IS_DEV ? { debug: { completionJson } } : {}),
        },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      if (IS_DEV) {
        console.log("[CLASIF] Contenido bruto de OpenAI", content);
      }
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("[CLASIF] Error al hacer JSON.parse del contenido de OpenAI", {
        error: err,
        content,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "openai_invalid_json",
          message: "La respuesta de OpenAI no es JSON válido.",
          ...(IS_DEV ? { debug: { parseError: err instanceof Error ? err.message : String(err) } } : {}),
        },
        { status: 502 }
      );
    }

    let sugerencia: ClasificacionSugerida;
    try {
      sugerencia = validateAndCoerceResponse(parsed);
      if (IS_DEV) {
        console.log("[CLASIF] Sugerencia validada", sugerencia);
      }
    } catch (err) {
      console.error("[CLASIF] Respuesta de OpenAI no cumple esquema esperado", {
        error: err,
        parsed,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "openai_invalid_payload",
          message:
            err instanceof Error
              ? err.message
              : "La respuesta de OpenAI no cumple el esquema esperado.",
          ...(IS_DEV ? { debug: { parsed } } : {}),
        },
        { status: 502 }
      );
    }

    // Opcional: asegurar que el sector existe en BD (defensivo)
    const { data: sectorRow, error: sectorError } = await supabase
      .from("sectores")
      .select("slug")
      .eq("slug", sugerencia.sector_slug)
      .maybeSingle();

    if (sectorError || !sectorRow) {
      console.error("[CLASIF] Sector sugerido no existe en BD", {
        sugerido: sugerencia.sector_slug,
        error: sectorError,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "sector_no_encontrado",
          message: "El sector sugerido no existe en la base de datos.",
          ...(IS_DEV ? { debug: { sugerencia } } : {}),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        sugerencia,
        ...(IS_DEV
          ? {
              debug: {
                descripcion,
                raw_content: content,
                parsed,
              },
            }
          : {}),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CLASIF] Error inesperado en clasificación", err);
    return NextResponse.json(
      {
        ok: false,
        error: "clasificacion_error",
        message: err instanceof Error ? err.message : "Error inesperado en clasificación.",
        ...(IS_DEV ? { debug: { stack: err instanceof Error ? err.stack : null } } : {}),
      },
      { status: 500 }
    );
  }
}

