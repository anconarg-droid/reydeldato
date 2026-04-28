"use client";

import { useEffect, useMemo, useState } from "react";

type SectionItem = { id: string; label: string };

type Props = {
  ariaLabel: string;
  sections: readonly SectionItem[];
  defaultActiveId: string;
  /** Mantener consistente con lo solicitado: '-20% 0px -70% 0px' */
  rootMargin?: string;
};

export default function ScrollSpySidebarNav({
  ariaLabel,
  sections,
  defaultActiveId,
  rootMargin = "-20% 0px -70% 0px",
}: Props) {
  const items = useMemo(() => sections ?? [], [sections]);
  const [activeId, setActiveId] = useState<string>(defaultActiveId);

  useEffect(() => {
    setActiveId(defaultActiveId);
  }, [defaultActiveId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const els = items
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first?.target?.id) setActiveId(first.target.id);
      },
      { rootMargin, threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, rootMargin]);

  return (
    <nav
      className="legal-nav"
      style={{ position: "sticky", top: "1.5rem", display: "none" }}
      aria-label={ariaLabel}
    >
      <div style={{ display: "grid", gap: "0.25rem" }}>
        {items.map((s, idx) => {
          const isActive = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "block",
                padding: "0.25rem 0",
                borderLeft: isActive ? "2px solid #0d7a5f" : "2px solid transparent",
                paddingLeft: "0.75rem",
                color: isActive ? "#0d7a5f" : "var(--color-muted-foreground)",
                fontWeight: isActive ? 500 : 400,
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "var(--color-muted-foreground)" }}>{idx + 1}.</span> {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

