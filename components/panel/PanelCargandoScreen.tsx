"use client";

import PanelBrandHomeBar from "@/components/panel/PanelBrandHomeBar";

type Props = {
  maxWidthClass?: string;
};

export default function PanelCargandoScreen({
  maxWidthClass = "max-w-[1180px]",
}: Props) {
  return (
    <main className={`mx-auto w-full ${maxWidthClass} px-4 py-6`}>
      <PanelBrandHomeBar />
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-[min(70vh,520px)] flex-col items-center justify-center py-16"
      >
        <div
          className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin"
          aria-hidden
        />
        <p className="mt-5 text-base font-bold text-gray-900">Cargando tu panel…</p>
        <p className="mt-1 text-sm text-gray-500">Un momento</p>
      </div>
    </main>
  );
}
