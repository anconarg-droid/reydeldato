"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionId } from "@/lib/sessionId";

const DISMISS_PREFIX = "rdd_reco_dismiss_session_";

type Props = {
  emprendedorId: string;
};

export default function RecomendacionPostContacto({ emprendedorId }: Props) {
  const [visible, setVisible] = useState(false);
  const [interaccionId, setInteraccionId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const dismissKey = `${DISMISS_PREFIX}${emprendedorId}`;

  const load = useCallback(async () => {
    const id = String(emprendedorId || "").trim();
    if (!id) return;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dismissKey)) {
        return;
      }
    } catch {
      /* noop */
    }

    const viewer_id = getSessionId();
    if (!viewer_id) return;

    try {
      const r = await fetch(
        `/api/recomendaciones/pendiente?emprendedor_id=${encodeURIComponent(id)}&viewer_id=${encodeURIComponent(viewer_id)}`,
        { credentials: "include" }
      );
      const j = await r.json().catch(() => ({}));
      if (j?.show === true && j?.interaccion_id) {
        setInteraccionId(String(j.interaccion_id));
        setVisible(true);
      }
    } catch {
      /* noop */
    }
  }, [dismissKey, emprendedorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLater = () => {
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  const submit = async (respuesta: "recomienda" | "no_recomienda") => {
    const id = String(emprendedorId || "").trim();
    const viewer_id = getSessionId();
    if (!id || !viewer_id || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/recomendaciones", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprendedor_id: id,
          viewer_id,
          respuesta,
          interaccion_id: interaccionId || undefined,
        }),
      });
      if (r.ok || r.status === 409) {
        setVisible(false);
        setDone(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-center sm:text-left">
        <p className="text-sm font-medium text-slate-700">Gracias. Tu respuesta ayuda a mejorar Rey del Dato.</p>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      role="region"
      aria-label="Recomendación opcional"
    >
      <p className="text-sm font-semibold text-slate-900">¿Recomendarías este emprendimiento?</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("recomienda")}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          👍 Sí, lo recomendaría
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("no_recomienda")}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
        >
          👎 No lo recomendaría
        </button>
      </div>
      <button
        type="button"
        onClick={onLater}
        className="mt-3 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
      >
        Ahora no
      </button>
    </div>
  );
}
