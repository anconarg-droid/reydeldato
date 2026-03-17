import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUGERENCIAS = [
  "gasfiter",
  "gasfitería",
  "electricista",
  "pintor",
  "jardinero",
  "limpieza",
  "veterinario",
  "veterinaria",
  "urgencia veterinaria",
  "vacunas mascotas",
  "peluquería canina",
  "paseador de perros",
  "tortas",
  "pastelería",
  "banquetería",
  "decoración de eventos",
  "dj",
  "amplificación",
  "clases de inglés",
  "reforzamiento escolar",
  "profesor particular",
  "reparación de computadores",
  "soporte técnico",
  "redes y wifi",
  "cámaras de seguridad",
  "mudanzas",
  "fletes",
  "encomiendas",
  "abogado",
  "contador",
  "asesoría tributaria",
  "peluquería",
  "barbería",
  "manicure",
  "masajes",
  "kinesiología",
  "psicología",
  "productos gourmet",
  "panadería",
  "empanadas",
  "coffee break",
];

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function norm(v: unknown): string {
  return s(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const q = s(new URL(req.url).searchParams.get("q"));

    if (q.length < 1) {
      return NextResponse.json({
        ok: true,
        suggestions: SUGERENCIAS.slice(0, 8),
      });
    }

    const qq = norm(q);

    const suggestions = SUGERENCIAS.filter((item) => {
      const n = norm(item);
      return n.startsWith(qq) || n.includes(qq);
    }).slice(0, 8);

    return NextResponse.json({
      ok: true,
      suggestions,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "suggest_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}