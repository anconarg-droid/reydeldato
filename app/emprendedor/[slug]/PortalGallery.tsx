"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getPlaceholderSinFotoSub,
  getPlaceholderSinFotoTitulo,
} from "@/lib/productRules";

/** Filtro suave para uniformar luminancia y color entre fotos distintas. */
const IMG_FILTER = "brightness(0.98) contrast(1.05) saturate(1.05)";

/** Alto máximo del visor principal (listing / portal: protagonista sin infinito). */
const HERO_MAX_HEIGHT_PX = 520;
/** Mínimo útil en móvil. */
const HERO_MIN_HEIGHT_PX = 260;

const imgThumbCover: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: IMG_FILTER,
};

/** Viñeta suave para leyendas sobre la foto (jerarquía tipo marketplace). */
const overlayHeroGradient: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.35) 0%, transparent 28%, transparent 62%, rgba(15,23,42,0.45) 100%)",
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

export type PlaceholderFichaCompletaProps = {
  /** Servicios en el domicilio del cliente (no delivery de productos). */
  atencionDomicilio: boolean;
  /** Envío / reparto de productos. */
  delivery: boolean;
  /** Solo `presencial_terreno` en BD, sin delivery/domicilio explícitos. */
  legacyTerreno?: boolean;
  disponibleEnComuna: boolean;
  contactoWhatsapp: boolean;
};

type Props = {
  fotoPrincipal?: string;
  galeria?: string[];
  /** Ficha completa: placeholder con checklist de valor (sin fotos). */
  placeholderFichaCompleta?: PlaceholderFichaCompletaProps | null;
};

export default function PortalGallery({
  fotoPrincipal,
  galeria,
  placeholderFichaCompleta = null,
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
  const mostrarMiniaturasDebajo = fotos.length > 1;

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

  const leyendaGaleria =
    !sinFotos && fotos.length > 1
      ? `Galería · ${fotos.length} fotos`
      : !sinFotos
        ? "Foto principal"
        : "";

  const heroFrameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: HERO_MIN_HEIGHT_PX,
    maxHeight: HERO_MAX_HEIGHT_PX,
    aspectRatio: "4 / 3",
    background: !tieneImagenes ? "#f8fafc" : "#0f172a",
    cursor: fotos.length > 0 ? "pointer" : "default",
    isolation: "isolate",
  };

  return (
    <>
      <div
        className={
          tieneImagenes
            ? "rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-950 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.06)]"
            : "rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50/90 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60"
        }
      >
        <div
          className={
            mostrarMiniaturasDebajo
              ? "flex flex-col lg:flex-row lg:items-stretch min-w-0"
              : "min-w-0"
          }
        >
          <div className="relative min-w-0 flex-1">
            <div
              onClick={() => fotos.length > 0 && setOpen(true)}
              className={tieneImagenes ? "group relative overflow-hidden" : "relative overflow-hidden"}
              style={{
                ...heroFrameStyle,
                border: !tieneImagenes ? "1px dashed #cbd5e1" : undefined,
                boxShadow: tieneImagenes ? "inset 0 0 0 1px rgba(255,255,255,0.06)" : undefined,
              }}
            >
          {!tieneImagenes ? (
            placeholderFichaCompleta ? (
              <div
                className="absolute inset-0 z-0 flex flex-col items-stretch justify-center px-6 py-8 sm:px-10 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border-0"
              >
                <div className="w-full max-w-md mx-auto">
                  <p className="m-0 text-center text-base font-extrabold text-slate-700 tracking-wide">
                    Sin imágenes
                  </p>
                  <p className="mt-3 mb-4 text-center text-sm font-semibold text-slate-500">
                    Este servicio incluye:
                  </p>
                  <ul className="m-0 p-0 list-none space-y-2.5 text-left">
                    {placeholderFichaCompleta.legacyTerreno &&
                    !placeholderFichaCompleta.delivery &&
                    !placeholderFichaCompleta.atencionDomicilio ? (
                      <li className="flex gap-2.5 text-[14px] font-medium text-slate-700 leading-snug">
                        <span className="shrink-0 text-emerald-600 font-bold" aria-hidden>
                          ✔
                        </span>
                        A domicilio / Delivery
                      </li>
                    ) : null}
                    {placeholderFichaCompleta.delivery ? (
                      <li className="flex gap-2.5 text-[14px] font-medium text-slate-700 leading-snug">
                        <span className="shrink-0 text-emerald-600 font-bold" aria-hidden>
                          ✔
                        </span>
                        Delivery
                      </li>
                    ) : null}
                    {placeholderFichaCompleta.atencionDomicilio ? (
                      <li className="flex gap-2.5 text-[14px] font-medium text-slate-700 leading-snug">
                        <span className="shrink-0 text-emerald-600 font-bold" aria-hidden>
                          ✔
                        </span>
                        A domicilio
                      </li>
                    ) : null}
                    {placeholderFichaCompleta.disponibleEnComuna ? (
                      <li className="flex gap-2.5 text-[14px] font-medium text-slate-700 leading-snug">
                        <span className="shrink-0 text-emerald-600 font-bold" aria-hidden>
                          ✔
                        </span>
                        Disponible en tu comuna
                      </li>
                    ) : null}
                    {placeholderFichaCompleta.contactoWhatsapp ? (
                      <li className="flex gap-2.5 text-[14px] font-medium text-slate-700 leading-snug">
                        <span className="shrink-0 text-emerald-600 font-bold" aria-hidden>
                          ✔
                        </span>
                        Contacto directo por WhatsApp
                      </li>
                    ) : null}
                    {!(
                      placeholderFichaCompleta.delivery ||
                      placeholderFichaCompleta.atencionDomicilio ||
                      placeholderFichaCompleta.legacyTerreno
                    ) &&
                    !placeholderFichaCompleta.disponibleEnComuna &&
                    !placeholderFichaCompleta.contactoWhatsapp ? (
                      <li className="text-sm text-slate-500 text-center">
                        Consulta disponibilidad al cotizar.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 0,
                  borderRadius: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 20px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#64748b",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {getPlaceholderSinFotoTitulo()}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    color: "#94a3b8",
                    lineHeight: 1.45,
                    maxWidth: 280,
                  }}
                >
                  {getPlaceholderSinFotoSub()}
                </p>
              </div>
            )
          ) : (
            <>
              <img
                src={actual}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
                style={{ filter: IMG_FILTER }}
                decoding="async"
                fetchPriority="high"
              />
              <div style={overlayHeroGradient} aria-hidden />
            </>
          )}

          {tieneImagenes && leyendaGaleria ? (
            <div className="pointer-events-none absolute left-3 top-3 z-[1] max-w-[min(100%-1.5rem,18rem)] truncate rounded-full border border-white/20 bg-slate-950/50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
              {leyendaGaleria}
            </div>
          ) : null}

          {tieneImagenes ? (
            <p className="pointer-events-none absolute bottom-3 right-3 z-[1] m-0 hidden text-[11px] font-semibold text-white/80 sm:block">
              Clic para ampliar
            </p>
          ) : null}
            </div>
          </div>

          {mostrarMiniaturasDebajo ? (
            <div
              className="flex max-h-[108px] min-h-0 shrink-0 flex-row gap-2 overflow-x-auto overflow-y-hidden border-t border-slate-800 bg-slate-900/98 p-2.5 lg:max-h-none lg:w-[104px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-l lg:border-t-0 lg:p-2"
              style={{ scrollbarWidth: "thin" }}
              role="list"
              aria-label="Miniaturas de la galería"
            >
              {fotos.map((url, i) => (
                <button
                  key={`${i}-${url.slice(0, 48)}`}
                  type="button"
                  role="listitem"
                  aria-label={`Mostrar foto ${i + 1} de ${fotos.length}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={
                    i === index
                      ? "shrink-0 overflow-hidden rounded-lg border-2 border-emerald-400 bg-slate-800 p-0 shadow-[0_0_0_2px_rgba(52,211,153,0.35)] ring-1 ring-white/10 lg:aspect-[4/3] lg:w-full lg:max-w-none lg:shrink-0 h-[72px] w-[96px] lg:h-auto"
                      : "shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-800/80 p-0 opacity-85 transition-opacity hover:border-white/30 hover:opacity-100 lg:aspect-[4/3] lg:w-full lg:max-w-none lg:shrink-0 h-[72px] w-[96px] lg:h-auto"
                  }
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover object-center"
                    style={imgThumbCover}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
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
