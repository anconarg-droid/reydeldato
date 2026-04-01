import {
  buildWhatsappUrl,
  buildInstagramUrl,
  buildWebsiteUrl,
  formatWhatsappDisplay,
  formatInstagramDisplay,
  formatWebsiteDisplay,
} from "@/lib/formatPublicLinks";

type Props = {
  whatsapp?: string | null;
  instagram?: string | null;
  web?: string | null;
};

export default function EmprendedorFichaLinks({
  whatsapp,
  instagram,
  web,
}: Props) {
  const wa = whatsapp ?? undefined;
  const ig = instagram ?? undefined;
  const site = web ?? undefined;

  const whatsappUrl = buildWhatsappUrl(wa);
  const instagramUrl = buildInstagramUrl(ig);
  const websiteUrl = buildWebsiteUrl(site);

  const whatsappText = formatWhatsappDisplay(wa);
  const instagramText = formatInstagramDisplay(ig);
  const websiteText = formatWebsiteDisplay(site);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            padding: "0 18px",
            borderRadius: 14,
            background: "#16a34a",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800,
            width: "fit-content",
          }}
        >
          Hablar por WhatsApp
        </a>
      ) : null}

      {whatsappText ? (
        <div
          style={{
            fontSize: 14,
            color: "#374151",
            fontWeight: 700,
          }}
        >
          WhatsApp: {whatsappText}
        </div>
      ) : null}

      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {instagramText}
        </a>
      ) : null}

      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 15,
            wordBreak: "break-word",
          }}
        >
          {websiteText}
        </a>
      ) : null}
    </div>
  );
}