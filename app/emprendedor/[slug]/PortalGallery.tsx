"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import PlaceholderCard from "./PlaceholderCard";

/** Filtro suave para uniformar luminancia y color entre fotos distintas. */
const IMG_FILTER = "brightness(0.98) contrast(1.05) saturate(1.05)";

const imgCoverStyled: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: IMG_FILTER,
};

/** Degradado ligero: viñeta muy suave arriba y base un poco más oscura (leyenda). */
const overlayHeroGradient: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.06) 0%, transparent 32%, transparent 58%, rgba(15,23,42,0.14) 100%)",
};

const URL_PENALIZA_LOGO: RegExp[] = [
  /\blogo\b/i,
  /[._-]logo[._-]?/i,
  /logo\.(png|jpe?g|webp|svg)/i,
  /favicon/i,
  /\bfav-icon/i,
  /(\/|^)icons?\/(\d|sm|xs)/i,
  /\bicon-[a-z0-9_-]{1,24}\.(png|webp|svg)/i,
  /\bavatar\b/i,
  /\bprofile[_-]?(pic|photo)/i,
  /brand-?mark/i,
  /watermark/i,
  /\bthumb(nail)?s?\b/i,
  /-small\.(jpe?g|png|webp)/i,
  /\b\d{2,3}x\d{2,3}\b/i,
  /[?&](w|width|h|height)=(3[0-9]{2}|[12][0-9]{2})\b/i,
];

const URL_PRIORIDAD_BANNER: RegExp[] = [
  /\bbanner\b/i,
  /\bhero\b/i,
  /\bcover\b/i,
  /\bcabecera\b/i,
  /\bheader[_-]?(image|img)?\b/i,
  /\bslide[s]?\b/i,
  /\bprincipal\b/i,
  /\bdestacad/i,
  /\bfull[-_]?width/i,
  /\bwide\b/i,
  /\b1920\b/,
  /\b1200\b/,
];

const URL_CONTENIDO_UTIL: RegExp[] = [
  /foto|imagen|photo|picture|gallery|galeria|upload|storage|wp-content|media\/|images?\//i,
];

/**
 * Heurística por URL (sin cargar píxeles): prioriza vistas tipo banner y penaliza logos/iconos.
 */
export function puntuacionUrlHero(
  url: string,
  opts?: { esFotoPrincipalDeclarada?: boolean },
): number {
  let s = 0;
  let u = "";
  try {
    const parsed = new URL(url, "https://placeholder.local");
    u = `${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    u = url.toLowerCase();
  }

  for (const re of URL_PENALIZA_LOGO) {
    if (re.test(u)) s -= 42;
  }
  for (const re of URL_PRIORIDAD_BANNER) {
    if (re.test(u)) s += 28;
  }
  for (const re of URL_CONTENIDO_UTIL) {
    if (re.test(u)) s += 10;
  }
  if (/\.svg(\?|#|$)/i.test(u)) s -= 18;
  if (u.length > 72) s += 6;
  if (opts?.esFotoPrincipalDeclarada) s += 14;
  return s;
}

/** Ordena candidatos: mejor score primero; empate → orden original. */
export function ordenFotosParaHero(fotoPrincipal: string, galeria: string[]): string[] {
  const ordenados: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const t = String(raw || "").trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    ordenados.push(t);
  };

  push(fotoPrincipal);
  for (const u of galeria) push(u);

  const fpTrim = String(fotoPrincipal || "").trim();

  return ordenados
    .map((url, idx) => ({
      url,
      idx,
      score: puntuacionUrlHero(url, { esFotoPrincipalDeclarada: url === fpTrim }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .map((x) => x.url);
}

type Props = {
  fotoPrincipal?: string;
  galeria?: string[];
  nombreNegocio?: string;
  subcategoriaLabel?: string;
  categoriaLabel?: string;
  comunaLabel?: string;
};

/** Emoji grande según rubro (categoría + nombre); fallback tienda genérica. */
function iconoRubroGrande(categoria: string, nombreNegocio: string): string {
  const t = `${categoria} ${nombreNegocio}`.toLowerCase().normalize("NFC");
  const rules: [RegExp, string][] = [
    [/plomer|gasfiter|grifer|fuga/i, "🔧"],
    [/electric|lumin|lampara/i, "⚡"],
    [/carpinter|muebl|ebanist/i, "🪵"],
    [/pintur|brocha/i, "🎨"],
    [/limpiez|aseo|aseadora/i, "✨"],
    [/jard|paisaj|planta|riego/i, "🌿"],
    [/bellez|peluqu|barber|uñas|spa|estétic/i, "💇"],
    [/panad|pastel|reposter|comida|cocina|restaurant|caf[eé]/i, "🥖"],
    [/transport|mudanz|courier|delivery|envío/i, "🚐"],
    [/construc|obra|maestro|albañil|yeso/i, "🏗️"],
    [/infant|niñ|juguete/i, "🧸"],
    [/mascot|veterin|pet/i, "🐾"],
    [/abogad|legal|notari/i, "⚖️"],
    [/contab|impuest|finanz/i, "📊"],
    [/tecno|comput|software|web|digital/i, "💻"],
    [/ropa|moda|textil/i, "👕"],
    [/foto|video|audiov/i, "📷"],
    [/salud|fisioter|kinesio|nutri|medic/i, "💊"],
    [/cerraj|seguridad/i, "🔑"],
    [/cerram|ventana|alumin/i, "🪟"],
    [/metal|soldad|herrer/i, "⚙️"],
    [/autom|mecán|neumát|lubric/i, "🚗"],
    [/hogar|repar|manten/i, "🏠"],
  ];
  for (const [re, icon] of rules) {
    if (re.test(t)) return icon;
  }
  return "🏪";
}

export default function PortalGallery({
  fotoPrincipal,
  galeria,
  nombreNegocio = "",
  subcategoriaLabel = "",
  categoriaLabel = "",
  comunaLabel = "",
}: Props) {
  const galFirma = Array.isArray(galeria) ? galeria.join("\u0001") : "";

  const { fotos, tieneImagenes } = useMemo(() => {
    const fp = String(fotoPrincipal || "").trim();
    const gal = (galeria || [])
      .map((u) => String(u || "").trim())
      .filter(Boolean);
    const tiene = !!(
      (fotoPrincipal && String(fotoPrincipal).trim()) ||
      gal.length > 0
    );
    return {
      fotos: ordenFotosParaHero(fp, gal),
      tieneImagenes: tiene,
    };
  }, [fotoPrincipal, galFirma]);

  const sinFotos = fotos.length === 0;
  /** Con 0 o 1 sola imagen no se muestra columna lateral (evita huecos). */
  const mostrarColumnaMiniaturas = fotos.length > 1;

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const fotosFirma = fotos.join("\u0001");
  useEffect(() => {
    setIndex(0);
  }, [fotosFirma]);

  const actual = fotos[index];

  function next() {
    setIndex((i) => (i + 1) % fotos.length);
  }

  function prev() {
    setIndex((i) => (i - 1 + fotos.length) % fotos.length);
  }

  const nombre = (nombreNegocio.trim() || "Emprendimiento").normalize("NFC");
  const subc = subcategoriaLabel.trim().normalize("NFC");
  const cat = categoriaLabel.trim().normalize("NFC");
  const rubroMiniatura = subc || cat || "Servicio";
  const comuna = comunaLabel.trim().normalize("NFC");
  const emojiHuecoMini = iconoRubroGrande(rubroMiniatura, nombre);
  
  const leyendaFotos =
    sinFotos ? "Sin fotos" : fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mostrarColumnaMiniaturas ? "1fr 120px" : "1fr",
          gap: 12,
        }}
      >
        <div
          onClick={() => fotos.length > 0 && setOpen(true)}
          className={tieneImagenes ? "group overflow-hidden" : "overflow-hidden"}
          style={{
            position: "relative",
            borderRadius: 20,
            overflow: "hidden",
            border: !tieneImagenes ? "none" : "1px solid #e5e7eb",
            width: "100%",
            aspectRatio: "16 / 9",
            background: !tieneImagenes
              ? "transparent"
              : "linear-gradient(180deg, #fafafa 0%, #f3f4f6 100%)",
            cursor: fotos.length > 0 ? "pointer" : "default",
            isolation: "isolate",
          }}
        >
          {!tieneImagenes ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                borderRadius: 20,
                overflow: "hidden",
                background:
                  "linear-gradient(165deg, #eef2ff 0%, #faf5ff 42%, #fff8f0 100%)",
              }}
            >
              <PlaceholderCard
                subcategoria={subcategoriaLabel}
                categoria={categoriaLabel}
                comuna={comuna}
                nombreNegocio={nombre}
              />
            </div>
          ) : (
            <>
              <img
                src={actual}
                alt=""
                className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                style={imgCoverStyled}
              />
              <div style={overlayHeroGradient} aria-hidden />
            </>
          )}

          {!tieneImagenes ? null : (
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                zIndex: 1,
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {leyendaFotos}
            </div>
          )}
        </div>

        {mostrarColumnaMiniaturas ? (
          <div
            style={{
              display: "grid",
              gridTemplateRows: "repeat(4,1fr)",
              gap: 10,
              alignSelf: "stretch",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => {
              const foto = fotos[i];

              return (
                <div
                  key={i}
                  suppressHydrationWarning
                  onClick={() => foto && setIndex(i)}
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: sinFotos
                      ? i === index
                        ? "2px solid #6366f1"
                        : "1px solid rgba(255,255,255,0.55)"
                      : i === index
                        ? "2px solid #2563eb"
                        : "1px solid #e5e7eb",
                    cursor: foto ? "pointer" : "default",
                    background: sinFotos
                      ? "rgba(255,255,255,0.4)"
                      : "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: sinFotos ? "#4338ca" : "#9ca3af",
                    minHeight: 0,
                  }}
                >
                  {foto ? (
                    <img
                      src={foto}
                      alt=""
                      style={imgCoverStyled}
                    />
                ) : (
                  emojiHuecoMini
                )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {open && actual ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "90%",
              maxWidth: 1000,
            }}
          >
            <img
              src={actual}
              alt=""
              style={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                filter: IMG_FILTER,
              }}
            />

            {fotos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prev}
                  style={{
                    position: "absolute",
                    left: -60,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 40,
                    color: "#fff",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={next}
                  style={{
                    position: "absolute",
                    right: -60,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 40,
                    color: "#fff",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                fontSize: 30,
                color: "#fff",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
