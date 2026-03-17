export const COMUNA_ALIASES: Record<string, string[]> = {
  "calera-de-tango": [
    "calera de tango",
    "caleradetango",
    "calera tango",
    "caletango",
  ],
  "padre-hurtado": [
    "padre hurtado",
    "padrehurtado",
    "padre h",
  ],
  talagante: ["talagante", "tlagante"],
  penaflor: ["peñaflor", "penaflor"],
  buin: ["buin"],
  "isla-de-maipo": ["isla de maipo", "islademaipo", "isla maipo"],
  "san-bernardo": ["san bernardo", "sanbernardo", "sn bernardo"],
  "el-bosque": ["el bosque", "elbosque", "bosque"],
  cerrillos: ["cerrillos", "cerillos"],
  maipu: ["maipu", "maipú"],
  providencia: ["providencia"],
  nunoa: ["nunoa", "ñuñoa", "nunoá"],
  "las-condes": ["las condes", "lascondes"],
  "la-florida": ["la florida", "laflorida"],
  santiago: ["santiago"],
  "estacion-central": ["estacion central", "estación central", "estacioncentral"],
  recoleta: ["recoleta"],
  "san-miguel": ["san miguel", "sanmiguel"],
  vitacura: ["vitacura"],
  "puente-alto": ["puente alto", "puentealto"],
  independencia: ["independencia"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DetectResult = {
  q: string;
  comunaSlug: string | null;
};

/**
 * Detecta una comuna dentro del texto libre y devuelve la query sin la comuna.
 * Busca al final de la frase primero; si no hay match, busca al inicio.
 * Así "perro enfermo providencia" → q="perro enfermo", comunaSlug="providencia"
 * y "maipu gasfiter" → q="gasfiter", comunaSlug="maipu".
 */
export function detectComunaFromQuery(query: string): DetectResult {
  const original = (query || "").trim();
  const tokens = original.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { q: "", comunaSlug: null };
  }

  const normTokens = tokens.map((t) => normalize(t));

  for (const [slug, aliases] of Object.entries(COMUNA_ALIASES)) {
    for (const alias of aliases) {
      const aliasTokens = normalize(alias).split(" ").filter(Boolean);
      const len = aliasTokens.length;
      if (len === 0 || len > normTokens.length) continue;

      // Match al final (ej. "perro enfermo providencia")
      const tail = normTokens.slice(-len);
      if (aliasTokens.every((a, idx) => a === tail[idx])) {
        const qTokens = tokens.slice(0, tokens.length - len);
        return { q: qTokens.join(" ").trim(), comunaSlug: slug };
      }

      // Match al inicio (ej. "maipu gasfiter" o "providencia veterinaria")
      const head = normTokens.slice(0, len);
      if (aliasTokens.every((a, idx) => a === head[idx])) {
        const qTokens = tokens.slice(len);
        return { q: qTokens.join(" ").trim(), comunaSlug: slug };
      }
    }
  }

  return { q: original, comunaSlug: null };
}

