"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReyDelDatoLogo from "@/components/brand/ReyDelDatoLogo";

/**
 * Marca arriba a la izquierda + CTA visual para volver al home público.
 */
export default function PanelBrandHomeBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 border-b border-gray-200/90">
      <ReyDelDatoLogo
        tagline="dato"
        className="shrink-0 [&>span:first-child]:text-lg sm:[&>span:first-child]:text-xl"
      />
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Volver al inicio
      </Link>
    </div>
  );
}
