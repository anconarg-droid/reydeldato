"use client";

import { autocomplete } from "@algolia/autocomplete-js";
import { useEffect, useRef } from "react";
import algoliasearch from "algoliasearch/lite";
import "@algolia/autocomplete-theme-classic";

export default function AutocompleteSearch() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const searchClient = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
    );

    autocomplete({
      container: containerRef.current,
      placeholder: "Buscar servicio o producto...",
      getSources({ query }) {
        return [
          {
            sourceId: "emprendedores",
            getItems() {
              return searchClient
                .initIndex(
                  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_EMPRENDEDORES!
                )
                .search(query, {
                  hitsPerPage: 5,
                })
                .then((res) => res.hits);
            },

            templates: {
              item({ item }) {
                return `
                <div style="padding:8px">
                  <strong>${item.nombre}</strong>
                  <div style="font-size:12px;color:#666">
                    ${item.categoria_nombre || ""} - ${
                  item.comuna_base_nombre || ""
                }
                  </div>
                </div>
                `;
              },
            },
          },
        ];
      },
    });
  }, []);

  return <div ref={containerRef} />;
}