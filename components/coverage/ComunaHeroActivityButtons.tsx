"use client";

type Props = {
  comunaSlug: string;
  whatsappHref: string;
};

export function ComunaHeroActivityButtons({ comunaSlug, whatsappHref }: Props) {
  async function handleShare() {
    try {
      await fetch("/api/cobertura/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: comunaSlug, type: "share" }),
      });
    } catch {
      // ignore
    }
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  async function handleInvite() {
    try {
      await fetch("/api/cobertura/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: comunaSlug, type: "invite" }),
      });
    } catch {
      // ignore
    }
    const el = document.getElementById("ayuda-abrir");
    el?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <button
        type="button"
        onClick={handleInvite}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors"
      >
        Invitar emprendedores
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-3 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6] transition-colors"
      >
        Compartir en WhatsApp
      </button>
    </div>
  );
}
