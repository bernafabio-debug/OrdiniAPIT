"use client";

import { useEffect, useRef, useState } from "react";
import type { Material } from "@/lib/types";

export default function MaterialAutocomplete({
  onSelect
}: {
  onSelect: (material: Material) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/materials?q=${encodeURIComponent(query)}&active=1`);
      if (res.ok) {
        const data = (await res.json()) as { materials: Material[] };
        setResults(data.materials.slice(0, 8));
        setOpen(true);
        setActiveIndex(-1);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(m: Material) {
    onSelect(m);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) pick(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        className="input-field"
        placeholder="Cerca per codice o descrizione materiale..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-fluent-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-fluent-textMuted">Nessun materiale trovato</div>
          )}
          {results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 ${
                i === activeIndex ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="font-semibold text-fluent-accent">{m.code}</span>
              <span className="text-fluent-text"> — {m.description}</span>
              <div className="text-xs text-fluent-textMuted">
                {m.supplier} · {m.category} · unità: {m.unit}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
