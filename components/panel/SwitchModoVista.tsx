"use client";

import type { ModoVistaPanel } from "@/lib/panelModoVista";

export function SwitchModoVista({
  value,
  onChange,
  size = "default",
}: {
  value: ModoVistaPanel;
  onChange: (v: ModoVistaPanel) => void;
  /** `prominent` = más grande, junto al bloque “Cuando termine tu plan”. */
  size?: "default" | "prominent";
}) {
  const isLg = size === "prominent";
  return (
    <div
      className={`inline-flex rounded-xl border-2 border-gray-200 bg-white shadow-md ${
        isLg ? "p-1 mx-auto" : "p-0.5 shadow-sm"
      }`}
      role="group"
      aria-label="Modo de vista: cómo te ven los clientes"
    >
      {(["completa", "basica"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-lg font-black transition-colors ${
            isLg
              ? `min-h-[48px] min-w-[7.5rem] sm:min-w-[8.5rem] px-4 sm:px-7 text-sm sm:text-base ${
                  value === k
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              : `px-3 py-1.5 text-xs font-bold ${
                  value === k
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`
          }`}
        >
          {k === "completa" ? "Completa" : "Básica"}
        </button>
      ))}
    </div>
  );
}
