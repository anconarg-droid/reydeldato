"use client";

import { useSearchParams } from "next/navigation";
import { parsePanelEmbedQuery } from "@/lib/panelEmbedQuery";

export function usePanelEmbed(): boolean {
  const searchParams = useSearchParams();
  return parsePanelEmbedQuery(searchParams.get("panel_embed"));
}
