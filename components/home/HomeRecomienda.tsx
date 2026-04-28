"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prettyComunaSlug } from "@/lib/homeConstants";
import {
  formatChileWhatsappDisplay,
  normalizeAndValidateChileWhatsappStrict,
} from "@/utils/phone";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";

type ComunaSuggestion = {
  slug: string;
  nombre: string;
  region_nombre?: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  /** Presente si el servidor insertó fila y devolvió id (auditoría / soporte). */
  id?: string;
};

type HomeRecomiendaProps = {
  /** En la home: sin márgenes/padding de página completa. */
  embedded?: boolean;
  /**
   * Bloque CTA verde en home: sin card blanca aislada; labels/texto para fondo emerald.
   * Requiere `embedded`.
   */
  embeddedOnEmerald?: boolean;
  /** Precarga desde URL (p. ej. landing de categoría + comuna). */
  initialComunaSlug?: string;
  initialComunaNombre?: string;
  initialServicioTexto?: string;
};

export default function HomeRecomienda({
  embedded = false,
  embeddedOnEmerald = false,
  initialComunaSlug = "",
  initialComunaNombre = "",
  initialServicioTexto = "",
}: HomeRecomiendaProps) {
  const onEmerald = embedded && embeddedOnEmerald;
  const [nombreEmprendimiento, setNombreEmprendimiento] = useState("");
  const [servicioTexto, setServicioTexto] = useState(initialServicioTexto);
  const [comunaInput, setComunaInput] = useState(() =>
    initialComunaNombre.trim()
      ? initialComunaNombre.trim()
      : initialComunaSlug.trim()
        ? prettyComunaSlug(initialComunaSlug.trim())
        : ""
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState(
    () => initialComunaSlug.trim()
  );
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [openComuna, setOpenComuna] = useState(false);
  const [loadingComuna, setLoadingComuna] = useState(false);
  const [contacto, setContacto] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
        setOpenComuna(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = comunaInput.trim();
    if (term.length < 2) {
      setComunaSuggestions([]);
      return;
    }

    if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    comunaDebounceRef.current = setTimeout(() => {
      setLoadingComuna(true);
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.comunas)) {
            setComunaSuggestions(data.comunas);
          } else {
            setComunaSuggestions([]);
          }
        })
        .catch(() => setComunaSuggestions([]))
        .finally(() => setLoadingComuna(false));
    }, 200);

    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput]);

  const whatsappEmbeddedHint = useMemo(() => {
    if (!embedded) return { show: false, text: "" };
    const raw = contacto.trim();
    if (!raw) return { show: false, text: "" };
    const { ok } = normalizeAndValidateChileWhatsappStrict(raw);
    if (ok) return { show: false, text: "" };
    return {
      show: true,
      text: "Usa un móvil chileno: 9 1234 5678, 56912345678 o +56912345678.",
    };
  }, [embedded, contacto]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nombre = nombreEmprendimiento.trim();
    const servicio = servicioTexto.trim();
    const comuna = selectedComunaSlug.trim();
    const contactoValue = contacto.trim();
    let contactoParaApi = contactoValue;

    if (embedded) {
      if (!contactoValue) {
        setErrorMessage("Ingresa el WhatsApp del negocio.");
        return;
      }
      const wa = normalizeAndValidateChileWhatsappStrict(contactoValue);
      if (!wa.ok) {
        setErrorMessage(
          "Ingresa un WhatsApp móvil chileno válido (ej: 9 1234 5678 o +56912345678)."
        );
        return;
      }
      if (!comuna) {
        setErrorMessage(
          "Seleccioná la comuna desde las sugerencias (escribí al menos 2 letras y elegí una opción)."
        );
        return;
      }
      contactoParaApi = formatChileWhatsappDisplay(wa.normalized);
    } else if (!nombre || !comuna || !contactoValue) {
      setErrorMessage("Completa al menos nombre del emprendimiento, comuna y contacto.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recomendaciones-emprendedores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_emprendimiento: nombre,
          servicio_texto: servicio || null,
          comuna_slug: comuna,
          contacto: contactoParaApi,
        }),
      });

      let data: ApiResponse;
      try {
        data = (await res.json()) as ApiResponse;
      } catch {
        setErrorMessage(
          `Respuesta inválida del servidor (${res.status}). Intenta de nuevo o revisa la consola.`
        );
        return;
      }

      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error ||
            (res.status >= 400
              ? `No pudimos guardar (${res.status}).`
              : "No pudimos guardar la recomendación. Intenta nuevamente.")
        );
        return;
      }

      if (embedded) {
        postClientAnalyticsEvent({
          event_type: "submit_recomendacion",
          metadata: {
            source: "home",
            comuna: comunaInput.trim() || comuna || null,
          },
        });
      }

      if (process.env.NODE_ENV === "development" && data.id) {
        // eslint-disable-next-line no-console
        console.info("[recomendaciones] guardada id=", data.id);
      }

      setNombreEmprendimiento("");
      setServicioTexto("");
      setComunaInput("");
      setSelectedComunaSlug("");
      setContacto("");

      setSuccessMessage("¡Gracias! Tu recomendación fue enviada. Invitaremos a este emprendimiento a publicar.");
    } catch {
      setErrorMessage("Ocurrió un error inesperado. Intenta nuevamente en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  const cardClass = onEmerald
    ? "rounded-none border-0 bg-transparent p-0 pt-8 sm:pt-10 shadow-none"
    : embedded
      ? "rounded-2xl border border-slate-200 bg-slate-50/40 p-6 sm:p-8 shadow-sm"
      : "bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6";

  const labelClass = onEmerald
    ? "block text-sm font-semibold text-emerald-100/95 mb-2"
    : embedded
      ? "block text-sm font-semibold text-slate-800 mb-2"
      : "block text-xs font-semibold text-slate-700 mb-1.5";

  const inputClass = onEmerald
    ? "w-full rounded-xl border border-white/18 bg-white/[0.88] px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-500 shadow-none transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/35"
    : embedded
      ? "w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400"
      : "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500";

  return (
    <section
      className={
        embedded
          ? onEmerald
            ? "max-w-none mx-0 border-t border-white/20 px-0 py-0 mt-10"
            : "max-w-none mx-0 px-0 py-0"
          : "max-w-6xl mx-auto px-4 py-8 sm:py-10"
      }
      id={embedded ? "home-recomendar-panel" : undefined}
    >
      <div className={cardClass}>
        <h2
          id={onEmerald ? "home-recomendar-heading" : undefined}
          className={
            onEmerald
              ? "text-lg sm:text-xl font-bold text-white mb-2"
              : embedded
                ? "text-lg sm:text-xl font-bold text-slate-900 mb-2"
                : "text-lg sm:text-xl font-bold text-slate-900 mb-1"
          }
        >
          {embedded ? "¿Conoces un buen servicio?" : "Recomienda un buen emprendimiento"}
        </h2>
        {!embedded ? (
          <p className="text-slate-600 text-sm mb-5 max-w-2xl">
            ¿Conoces un buen servicio? Ayúdanos a completar el directorio. Cuéntanos cómo contactarlos para
            invitarlos a publicar.
          </p>
        ) : (
          <p
            className={
              onEmerald
                ? "text-emerald-50/90 text-sm mb-5 max-w-2xl leading-relaxed mx-auto text-center sm:text-left"
                : "text-slate-600 text-sm mb-5 max-w-2xl leading-relaxed"
            }
          >
            Ayuda a completar tu comuna recomendando un negocio.
          </p>
        )}

        <form onSubmit={handleSubmit} className={embedded ? "space-y-5" : "space-y-4"}>
          {embedded ? (
            <>
              <div
                className={
                  onEmerald
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1 border-t border-white/14"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1 border-t border-slate-200/80"
                }
              >
                <div ref={comunaBoxRef} className="relative sm:col-span-1">
                  <label className={labelClass}>Comuna (obligatoria)</label>
                  <input
                    type="text"
                    value={comunaInput}
                    onChange={(e) => {
                      setComunaInput(e.target.value);
                      setSelectedComunaSlug("");
                      setOpenComuna(true);
                    }}
                    onFocus={() => {
                      if (comunaInput.trim().length >= 2) setOpenComuna(true);
                    }}
                    placeholder="Ej: Maipú, San Bernardo, Puente Alto"
                    className={inputClass}
                    autoComplete="off"
                  />

                  {openComuna && (comunaSuggestions.length > 0 || loadingComuna) && (
                    <div className="absolute z-40 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                      {loadingComuna ? (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Buscando comunas...
                        </div>
                      ) : (
                        comunaSuggestions.map((c) => (
                          <button
                            key={c.slug}
                            type="button"
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              setComunaInput(c.nombre);
                              setSelectedComunaSlug(c.slug);
                              setOpenComuna(false);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50"
                          >
                            <div className="font-semibold text-slate-900">{c.nombre}</div>
                            {c.region_nombre && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {c.region_nombre}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>WhatsApp (obligatorio)</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: +56 9 8765 4321"
                    className={inputClass}
                    aria-invalid={whatsappEmbeddedHint.show}
                  />
                  {whatsappEmbeddedHint.show ? (
                    <p
                      className={
                        onEmerald
                          ? "mt-1.5 text-xs font-medium text-amber-200"
                          : "mt-1.5 text-xs font-medium text-amber-800"
                      }
                      role="alert"
                    >
                      {whatsappEmbeddedHint.text}
                    </p>
                  ) : (
                    <p
                      className={
                        onEmerald ? "mt-1.5 text-xs text-emerald-100/85" : "mt-1.5 text-xs text-slate-500"
                      }
                    >
                      Para que puedan escribirle directo
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Nombre del negocio (opcional)</label>
                <input
                  type="text"
                  value={nombreEmprendimiento}
                  onChange={(e) => setNombreEmprendimiento(e.target.value)}
                  placeholder="Ej: Gasfitería Express / Minimarket Don Luis"
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className={labelClass}>Nombre del emprendimiento</label>
                  <input
                    type="text"
                    value={nombreEmprendimiento}
                    onChange={(e) => setNombreEmprendimiento(e.target.value)}
                    placeholder="Ej: Taller Mecánico Ramírez / Peluquería Andrea / Gasfitería Express"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>¿Qué servicio ofrece? (opcional)</label>
                  <input
                    type="text"
                    value={servicioTexto}
                    onChange={(e) => setServicioTexto(e.target.value)}
                    placeholder="Ej: filtraciones, instalación de lavaplatos, destapes"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div ref={comunaBoxRef} className="relative">
                  <label className={labelClass}>Comuna donde trabaja</label>
                  <input
                    type="text"
                    value={comunaInput}
                    onChange={(e) => {
                      setComunaInput(e.target.value);
                      setSelectedComunaSlug("");
                      setOpenComuna(true);
                    }}
                    onFocus={() => {
                      if (comunaInput.trim().length >= 2) setOpenComuna(true);
                    }}
                    placeholder="Ej: Maipú, San Bernardo, Puente Alto"
                    className={inputClass}
                    autoComplete="off"
                  />

                  {openComuna && (comunaSuggestions.length > 0 || loadingComuna) && (
                    <div className="absolute z-40 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                      {loadingComuna ? (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Buscando comunas...
                        </div>
                      ) : (
                        comunaSuggestions.map((c) => (
                          <button
                            key={c.slug}
                            type="button"
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              setComunaInput(c.nombre);
                              setSelectedComunaSlug(c.slug);
                              setOpenComuna(false);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50"
                          >
                            <div className="font-semibold text-slate-900">{c.nombre}</div>
                            {c.region_nombre && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {c.region_nombre}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Contacto del emprendimiento (WhatsApp o Instagram)
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: +56 9 8765 4321 o @emprendimiento"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {embedded ? (
            <p
              className={
                onEmerald
                  ? "text-center text-sm text-emerald-100/90 pt-1 sm:text-left"
                  : "text-center text-sm text-slate-600 pt-1"
              }
            >
              Te toma menos de 1 minuto.
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className={
                onEmerald
                  ? "inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-extrabold text-[#047857] shadow-md transition hover:bg-emerald-50 disabled:bg-white/50 disabled:text-emerald-800/60 disabled:cursor-not-allowed"
                  : embedded
                    ? "inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-slate-900 text-white px-8 py-3.5 text-base font-semibold shadow-sm transition-colors duration-200 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    : "inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold transition-colors duration-200 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
              }
            >
              {loading
                ? "Enviando…"
                : embedded
                  ? "Enviar recomendación"
                  : "Recomendar emprendimiento"}
            </button>

            {successMessage && (
              <p
                className={
                  onEmerald ? "text-xs sm:text-sm text-emerald-50" : "text-xs sm:text-sm text-slate-700"
                }
              >
                {successMessage}
              </p>
            )}

            {errorMessage && !successMessage && (
              <p
                className={
                  onEmerald ? "text-xs sm:text-sm text-red-200" : "text-xs sm:text-sm text-red-600"
                }
              >
                {errorMessage}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
