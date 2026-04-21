"use client";

import { useCallback, useState } from "react";

type Props = {
  text: string;
  className?: string;
  copiedLabel?: string;
};

export default function CopyInlineButton({
  text,
  className = "text-xs text-slate-400 hover:text-slate-600 cursor-pointer",
  copiedLabel = "Copiado",
}: Props) {
  const [feedback, setFeedback] = useState<"copied" | null>(null);

  const onCopy = useCallback(async () => {
    const t = String(text || "").trim();
    if (!t) return;
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(t);
      setFeedback("copied");
      window.setTimeout(() => setFeedback(null), 1700);
    } catch {
      setFeedback(null);
    }
  }, [text]);

  return (
    <button type="button" onClick={onCopy} className={className} aria-live="polite">
      {feedback === "copied" ? copiedLabel : "Copiar número"}
    </button>
  );
}

