"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatChileWhatsappDisplay,
  normalizeAndValidateChileWhatsappStrict,
} from "@/utils/phone";
import { prettyComunaSlug } from "@/lib/homeConstants";

type Props = {
  initialComunaSlug?: string;
  className?: string;
};

export default function RecomendarEmprendedorModal({
  initialComunaSlug = "",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [comunaInput, setComunaInput] = useState(() =>
    initialComunaSlug.trim() ? prettyComunaSlug(initialComunaSlug.trim()) : ""
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState(() => initialComunaSlug.trim());
  const [comunaSuggestions, setComunaSuggestions] = useState<Array<{ slug: string; nombre: string; region_nombre?: string }>>([]);
  const [openComuna, setOpenComuna] = useState(false);
  const [loadingComuna, setLoadingComuna] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaBoxRef = useRef<HTMLDivElement | null>(null);

  const waHint = useMemo(() => {
    const raw = whatsapp.trim();
    if (!raw) return null;
    const { ok } = normalizeAndValidateChileWhatsappStrict(raw);
    if (ok) return null;
    return "Usa 9 1234 5678, 56912345678 o +56912345678.";
  }, [whatsapp]);

  useEffect(() => {
    if (!open) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    setCount(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const comuna_slug = selectedComunaSlug.trim();
    if (!comuna_slug) return;
    const sp = new URLSearchParams();
    sp.set("comuna_slug", comuna_slug);
    fetch(`/api/recomendaciones-emprendedores?${sp.toString()}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; count?: number }) => {
        if (d?.ok && typeof d.count === "number") setCount(d.count);
      })
      .catch(() => {});
  }, [open, selectedComunaSlug]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
        setOpenComuna(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
        .then((data: { ok?: boolean; comunas?: Array<{ slug: string; nombre: string; region_nombre?: string }> }) => {
          if (data?.ok && Array.isArray(data.comunas)) setComunaSuggestions(data.comunas);
          else setComunaSuggestions([]);
        })
        .catch(() => setComunaSuggestions([]))
        .finally(() => setLoadingComuna(false));
    }, 200);
    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [open, comunaInput]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const comuna_slug = selectedComunaSlug.trim();
    if (!comuna_slug) {
      setErrorMessage("Selecciona la comuna desde las sugerencias.");
      return;
    }

    const wa = normalizeAndValidateChileWhatsappStrict(whatsapp.trim());
    if (!wa.ok) {
      setErrorMessage("Ingresa un WhatsApp móvil chileno válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recomendaciones-emprendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_emprendimiento: nombre.trim() || "Recomendado (sin nombre)",
          comuna_slug,
          contacto: formatChileWhatsappDisplay(wa.normalized),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error || "No pudimos guardar la recomendación.");
        return;
      }
      setSuccessMessage("Gracias. Invitaremos a este negocio a publicar.");
      setNombre("");
      setWhatsapp("");
      // refrescar contador
      const sp = new URLSearchParams();
      sp.set("comuna_slug", comuna_slug);
      fetch(`/api/recomendaciones-emprendedores?${sp.toString()}`)
        .then((r) => r.json())
        .then((d: { ok?: boolean; count?: number }) => {
          if (d?.ok && typeof d.count === "number") setCount(d.count);
        })
        .catch(() => {});
    } catch {
      setErrorMessage("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        ].join(" ")}
      >
        Recomendar un emprendedor <span aria-hidden>→</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recomendar un emprendedor"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold tracking-[0.14em] text-slate-500">
                  RECOMENDAR
                </div>
                <div className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">
                  ¿Conoces un negocio que debería estar aquí?
                </div>
                {typeof count === "number" ? (
                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {count.toLocaleString("es-CL")} negocios recomendados en esta comuna
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div ref={comunaBoxRef} className="relative">
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Comuna (obligatorio)
                </label>
                <input
                  value={comunaInput}
                  onChange={(e) => {
                    setComunaInput(e.target.value);
                    setSelectedComunaSlug("");
                    setOpenComuna(true);
                  }}
                  onFocus={() => {
                    if (comunaInput.trim().length >= 2) setOpenComuna(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400"
                  placeholder="Ej: Maipú"
                  autoComplete="off"
                />
                {openComuna && (comunaSuggestions.length > 0 || loadingComuna) ? (
                  <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {loadingComuna ? (
                      <div className="px-3 py-2 text-xs text-slate-500">Buscando comunas...</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {comunaSuggestions.map((c) => (
                          <button
                            key={c.slug}
                            type="button"
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              setComunaInput(c.nombre);
                              setSelectedComunaSlug(c.slug);
                              setOpenComuna(false);
                              setCount(null);
                            }}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                          >
                            <div className="font-semibold text-slate-900">{c.nombre}</div>
                            {c.region_nombre ? (
                              <div className="mt-0.5 text-xs text-slate-500">{c.region_nombre}</div>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Nombre (opcional)
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400"
                  placeholder="Ej: Taller Don Juan"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  WhatsApp (obligatorio)
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-400"
                  placeholder="+56 9 8765 4321"
                  inputMode="tel"
                />
                {waHint ? (
                  <p className="mt-1 text-xs font-medium text-amber-800" role="alert">
                    {waHint}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Enviando…" : "Enviar"}
                </button>
                {successMessage ? (
                  <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
                ) : errorMessage ? (
                  <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

