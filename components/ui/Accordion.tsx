"use client";

import { type ReactNode, useState } from "react";

type AccordionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-base font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors rounded-xl"
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className="ml-2 h-5 w-5 shrink-0 text-[#6B7280] transition-transform"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-[#E5E7EB] px-5 py-4 text-[#6B7280]">
          {children}
        </div>
      )}
    </div>
  );
}
