"use client";

import { useEffect, useMemo, useState } from "react";

const SECCIONES = [
  { id: "s1", label: "Identificación" },
  { id: "s2", label: "Naturaleza" },
  { id: "s3", label: "Responsabilidad" },
  { id: "s4", label: "Publicación" },
  { id: "s5", label: "Uso" },
  { id: "s6", label: "Propiedad" },
  { id: "s7", label: "Modificaciones" },
  { id: "s8", label: "Legislación" },
  { id: "s9", label: "Contacto" },
] as const;

function getHashId(): string {
  if (typeof window === "undefined") return "";
  return (window.location.hash || "").replace(/^#/, "").trim();
}

export default function TerminosSidebarNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const apply = () => setActive(getHashId() || "s1");
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const items = useMemo(() => SECCIONES, []);

  return (
    <nav
      aria-label="Índice de términos"
      className="space-y-1 text-sm sticky top-6 self-start"
    >
      {items.map((it, idx) => {
        const isActive = active === it.id;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`block border-l-2 pl-3 py-1 transition-colors ${
              isActive
                ? "border-l-[#0d7a5f] text-teal-700 font-medium"
                : "border-l-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="text-slate-500">{idx + 1}.</span> {it.label}
          </a>
        );
      })}
    </nav>
  );
}

