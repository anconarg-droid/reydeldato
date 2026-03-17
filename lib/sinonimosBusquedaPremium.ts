type PremiumResult = {
  original: string
  limpio: string
  tokensOriginales: string[]
  tokensCorregidos: string[]
  tokensConFrases: string[]
  queryPrincipal: string
  queryExpandidaSuave: string
  querySugerencias: string
  rerankTokens: string[]
}

function norm(text: string) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)))
}

function tokenize(text: string) {
  const limpio = norm(text)
  if (!limpio) return []
  return limpio.split(" ").map(x => x.trim()).filter(Boolean)
}

const SINONIMOS_PREMIUM: Record<string, string[]> = {

  gasfiter: ["gasfiteria","plomeria","plomero","destapes","destape","canerias"],
  gasfiteria: ["gasfiter","plomeria","plomero","destapes"],
  plomero: ["gasfiter","gasfiteria","plomeria"],
  plomeria: ["gasfiter","gasfiteria","plomero"],

  electricista: ["electricidad","electrico","tablero electrico","enchufes"],
  electricidad: ["electricista","electrico"],

  fletes: ["mudanzas","transporte","camion","carga"],
  mudanzas: ["fletes","transporte","camion"],

  veterinaria: ["veterinario","mascotas","clinica veterinaria"],
  veterinario: ["veterinaria","mascotas"],

  masajes: ["masaje","masoterapia","spa","relajacion"],
  masaje: ["masajes","masoterapia","spa","relajacion"],

  abogado: ["abogados","legal","juridico","asesoria legal"],
  abogados: ["abogado","legal"],

  dentista: ["odontologo","odontologia","clinica dental"],
  odontologo: ["dentista","odontologia"],

  mecanico: ["mecanica","taller","automotriz"],
  mecanica: ["mecanico","taller"],

  vulcanizacion: ["neumaticos","pinchazo","ruedas"],

  carpintero: ["carpinteria","muebles","melamina","madera"],
  carpinteria: ["carpintero","muebles"],

  jardinero: ["jardineria","podas","pasto"],
  jardineria: ["jardinero","podas"],

  costurera: ["costura","modista","arreglos de ropa"],
  costura: ["costurera","modista"],

  pasteleria: ["tortas","kuchen","postres"],
  panaderia: ["pan","amasanderia"],

  sushi: ["comida japonesa","delivery"],
  pizza: ["pizzeria","delivery"],

  peluqueria: ["peluquero","cabello","corte de pelo"],
  barberia: ["barbero","corte de pelo"],

  manicure: ["unas","nails"],
  pedicure: ["unas","pies"]
}

const CORRECCIONES_DIRECTAS: Record<string,string> = {

  gasfitero: "gasfiter",
  gasfiteros: "gasfiter",
  gasfiteriaa: "gasfiteria",

  plomerro: "plomero",
  plomeriaa: "plomeria",

  eletricista: "electricista",
  eletricidad: "electricidad",

  vetrinaria: "veterinaria",
  vetrinario: "veterinario",

  masage: "masaje",
  masages: "masajes",

  sicologo: "psicologo",

  mecanicoo: "mecanico"
}

function corregirToken(token: string) {
  const t = norm(token)
  return CORRECCIONES_DIRECTAS[t] || t
}

function expandirToken(token: string) {
  const t = corregirToken(token)
  return [t, ...(SINONIMOS_PREMIUM[t] || [])]
}

export function corregirBusquedaPremium(query: string): PremiumResult {

  const original = query || ""
  const limpio = norm(original)

  if (!limpio) {
    return {
      original,
      limpio,
      tokensOriginales: [],
      tokensCorregidos: [],
      tokensConFrases: [],
      queryPrincipal: "",
      queryExpandidaSuave: "",
      querySugerencias: "",
      rerankTokens: []
    }
  }

  const tokensOriginales = tokenize(limpio)
  const tokensCorregidos = unique(tokensOriginales.map(corregirToken))

  const frasesDetectadas:string[] = []

  const joined = tokensCorregidos.join(" ")

  if (joined.includes("gasfiter")) frasesDetectadas.push("gasfiteria")
  if (joined.includes("plomero")) frasesDetectadas.push("plomeria")
  if (joined.includes("electricista")) frasesDetectadas.push("electricidad")
  if (joined.includes("veterinaria")) frasesDetectadas.push("clinica veterinaria")
  if (joined.includes("masajes")) frasesDetectadas.push("masoterapia")
  if (joined.includes("abogado")) frasesDetectadas.push("asesoria legal")
  if (joined.includes("dentista")) frasesDetectadas.push("clinica dental")
  if (joined.includes("fletes")) frasesDetectadas.push("mudanzas")

  const tokensConFrases = unique([...tokensCorregidos,...frasesDetectadas])

  const expandidos = unique(
    tokensConFrases.flatMap(token => expandirToken(token))
  )

  const queryPrincipal = tokensCorregidos.join(" ")

  const queryExpandidaSuave = unique([
    ...tokensCorregidos,
    ...expandidos.slice(0,6)
  ]).join(" ")

  const querySugerencias = unique([
    ...tokensCorregidos,
    ...expandidos
  ]).join(" ")

  const rerankTokens = unique([
    ...tokensCorregidos,
    ...tokensConFrases,
    ...expandidos
  ])

  return {
    original,
    limpio,
    tokensOriginales,
    tokensCorregidos,
    tokensConFrases,
    queryPrincipal,
    queryExpandidaSuave,
    querySugerencias,
    rerankTokens
  }
}