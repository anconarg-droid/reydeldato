"use client";

/**
 * Dropdown de sugerencias para autocomplete V1.
 * Solo sugerencias (intent, intent_comuna, comuna, sector). Sin emprendimientos.
 * Click → navega a url. Teclado: Arriba, Abajo, Enter, Escape.
 */
export type AutocompleteSuggestion =
  | { type: "intent"; label: string; value: string; url: string }
  | { type: "intent_comuna"; label: string; value: string; comuna: string; url: string }
  | { type: "comuna"; label: string; comuna: string; url: string }
  | { type: "sector"; label: string; sector: string; url: string };

type Props = {
  suggestions: AutocompleteSuggestion[];
  open: boolean;
  highlightIndex: number;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onClose: () => void;
  onHighlightChange: (index: number) => void;
  /** ref del contenedor del input para click outside */
  containerRef: React.RefObject<HTMLElement | null>;
  /** id opcional para accesibilidad */
  id?: string;
};

export default function SearchAutocompleteDropdown({
  suggestions,
  open,
  highlightIndex,
  onSelect,
  onClose,
  onHighlightChange,
  containerRef,
  id = "search-autocomplete-listbox",
}: Props) {
  if (!open || suggestions.length === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        onHighlightChange(highlightIndex < suggestions.length - 1 ? highlightIndex + 1 : 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        onHighlightChange(highlightIndex > 0 ? highlightIndex - 1 : suggestions.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          onSelect(suggestions[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <div
      role="listbox"
      id={id}
      aria-label="Sugerencias de búsqueda"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
      style={{ minWidth: 200 }}
    >
      {suggestions.map((item, index) => (
        <button
          key={`${item.type}-${index}-${item.label}`}
          type="button"
          role="option"
          aria-selected={index === highlightIndex}
          className="w-full px-4 py-3 text-left text-[15px] transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
          style={{
            background: index === highlightIndex ? "#f1f5f9" : undefined,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          onMouseEnter={() => onHighlightChange(index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
