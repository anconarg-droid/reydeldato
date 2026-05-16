"use client";

import { useCallback, useEffect, useState } from "react";

const EVENT = "rdd_whatsapp_contact_hint";

export default function WhatsappContactHintHost() {
  const [open, setOpen] = useState(false);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onHint = () => {
      setOpen(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setOpen(false), 4500);
    };
    window.addEventListener(EVENT, onHint);
    return () => {
      window.removeEventListener(EVENT, onHint);
      if (t) clearTimeout(t);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-lg sm:text-left"
      role="status"
    >
      <p className="text-sm font-medium text-slate-800">
        Podrás recomendar este emprendimiento más adelante si te sirve.
      </p>
      <button
        type="button"
        onClick={hide}
        className="mt-2 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
      >
        Cerrar
      </button>
    </div>
  );
}
