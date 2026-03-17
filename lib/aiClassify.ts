/**
 * Clasificación por IA: reutilizable desde API y desde jobs/backfill.
 * Misma lógica que /api/clasificacion/sugerir pero exportada para uso en servidor.
 */

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

1) tipo_actividad (elige exactamente uno): "venta" | "servicio" | "arriendo"
2) sector_slug (elige exactamente uno): "alimentacion" | "hogar_construccion" | "automotriz" | "salud_bienestar" | "belleza_estetica" | "mascotas" | "eventos" | "educacion_clases" | "tecnologia" | "comercio_tiendas" | "transporte_fletes" | "jardin_agricultura" | "profesionales_asesorias" | "turismo_alojamiento" | "otros"
3) tags_slugs: Array de entre 1 y 6 elementos. Slugs cortos en minúsculas (ej: "gasfiter", "electricista", "panaderia").
4) keywords: Array de hasta 10 palabras o frases cortas útiles para buscador.
5) confianza: Número entre 0 y 1 (máximo 2 decimales).

Formato de salida (estricto):
{
  "tipo_actividad": "venta" | "servicio" | "arriendo",
  "sector_slug": "<uno de la lista>",
  "tags_slugs": ["tag1", "tag2"],
  "keywords": ["kw1", "kw2"],
  "confianza": 0.0
}
`.trim();

export type AIClassificationResult = {
  tipo_actividad: string;
  sector_slug: string;
  tags_slugs: string[];
  keywords: string[];
  confianza: number;
  raw_content?: string;
};

function normalizeTags(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => String(v ?? "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeKeywords(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const val = String(raw ?? "").trim().toLowerCase();
    if (!val || seen.has(val)) continue;
    seen.add(val);
    out.push(val);
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Clasifica un texto de negocio con OpenAI. Usado por sugerir API y por classifyAndAssignBusiness.
 */
export async function classifyWithAI(description: string): Promise<AIClassificationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const content =
    description.trim().length >= 10
      ? description.trim()
      : `${description.trim()} (describe brevemente tu negocio o servicio)`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          { role: "user", content: `Descripción del negocio: "${content}"` },
        ],
      }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const text =
    json?.choices?.[0]?.message?.content && typeof json.choices[0].message.content === "string"
      ? json.choices[0].message.content
      : "";
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const tipo = String(obj?.tipo_actividad ?? "servicio").toLowerCase();
  const sector = String(obj?.sector_slug ?? "otros").toLowerCase();
  const tags = normalizeTags(obj?.tags_slugs);
  const keywords = normalizeKeywords(obj?.keywords);
  let confianza = Number(obj?.confianza);
  if (!Number.isFinite(confianza) || confianza < 0 || confianza > 1) confianza = 0.7;

  return {
    tipo_actividad: ["venta", "servicio", "arriendo"].includes(tipo) ? tipo : "servicio",
    sector_slug: sector,
    tags_slugs: tags.slice(0, 6),
    keywords,
    confianza,
    raw_content: text,
  };
}
