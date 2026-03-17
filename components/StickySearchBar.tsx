"use client";

import { useEffect, useState } from "react";

export default function StickySearchBar({
  children,
}: {
  children: React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }

    function onScroll() {
      setCompact(window.scrollY > 80);
    }

    onResize();
    onScroll();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isMobile = width < 768;

  return (
    <div
      style={{
        position: "sticky",
        top: isMobile ? 8 : 10,
        zIndex: 30,
        marginBottom: compact ? 16 : 24,
        transition: "all 180ms ease",
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: compact ? 16 : 22,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: isMobile
            ? compact
              ? 10
              : 14
            : compact
            ? 14
            : 18,
          boxShadow: compact
            ? "0 6px 18px rgba(15,23,42,0.08)"
            : "0 10px 30px rgba(15,23,42,0.08)",
          transition: "all 180ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}