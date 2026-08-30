"use client";

import { useEffect, useRef, useState } from "react";
import type { Material } from "@/lib/types";
import { SUPPLIERS, MATERIAL_UNITS } from "@/lib/types";

export default function MaterialAutocomplete({
  onSelect
}: {
  onSelect: (material: Material) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Material[]>([]);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAdd, setQuickAdd] = useState({ code: "", description: "", supplier: SUPPLIERS[0], category: "", unit: MATERIAL_UNITS[0] });
  const [quickAddError, setQuickAddError] = useState("");
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/materials?q=${encodeURIComponent(query)}&active=1`);
      if (res.ok) {
        const data = (await res.json()) as { materials: Material[] };
        setResults(data.materials.slice(0, 8));
        setSearched(true);
        setOpen(true);
        setActiveIndex(-1);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowQuickAdd(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(m: Material) {
    onSelect(m);
    reset();
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSearched(false);
    setOpen(false);
    setShowQuickAdd(false);
    setQuickAdd({ code: "", description: "", supplier: SUPPLIERS[0], category: "", unit: MATERIAL_UNITS[0] });
    setQuickAddError("");
  }

  function openQuickAdd() {
    setQuickAdd((prev) => ({ ...prev, code: query.trim() }));
    setQuickAddError("");
    setShowQuickAdd(true);
  }

  async function submitQuickAdd() {
    setQuickAddError("");
    if (!quickAdd.code.trim() || !quickAdd.description.trim()) {
      setQuickAddError("Part Number e descrizione sono obbligatori.");
      return;
    }
    setSavingQuickAdd(true);
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickAdd)
    });
    setSavingQuickAdd(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setQuickAddError(data.error || "Errore durante il salvataggio.");
      return;
    }
    const created = (await res.json()) as { id: string };
    onSelect({
      id: created.id,
      code: quickAdd.code.trim(),
      description: quickAdd.description.trim(),
      supplier: quickAdd.supplier,
      category: quickAdd.category || null,
      unit: quickAdd.unit,
      active: 1,
      created_at: new Date().toISOString()
    });
    reset();
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent) {
    // Evita che Invio faccia risalire l'evento al form dell'ordine (che lo racchiude)
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submitQuickAdd();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0 || showQuickAdd) return;
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
        placeholder="Cerca per Part Number o descrizione materiale..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => (results.length > 0 || (searched && results.length === 0)) && setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-fluent-border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {!showQuickAdd && results.length === 0 && (
            <div className="p-3">
              <div className="text-sm text-fluent-textMuted mb-2">Nessun materiale trovato nel catalogo.</div>
              <button
                type="button"
                onClick={openQuickAdd}
                className="w-full text-sm font-medium text-fluent-accent border border-dashed border-fluent-accent rounded-md py-2 hover:bg-red-50"
              >
                + Aggiungi &quot;{query}&quot; come nuovo materiale
              </button>
            </div>
          )}

          {!showQuickAdd && results.map((m, i) => (
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

          {!showQuickAdd && results.length > 0 && (
            <button
              type="button"
              onClick={openQuickAdd}
              className="w-full text-left px-3 py-2 text-xs text-fluent-accent hover:bg-red-50 border-t border-fluent-border"
            >
              + Non è quello che cerco, aggiungi &quot;{query}&quot; come nuovo materiale
            </button>
          )}

          {showQuickAdd && (
            <div onKeyDown={handleQuickAddKeyDown} className="p-3 space-y-2.5">
              <p className="text-xs font-semibold text-fluent-text">Nuovo materiale a catalogo</p>
              <div>
                <label className="label-field">Part Number</label>
                <input
                  className="input-field"
                  required
                  value={quickAdd.code}
                  onChange={(e) => setQuickAdd({ ...quickAdd, code: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Descrizione</label>
                <input
                  className="input-field"
                  required
                  value={quickAdd.description}
                  onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-field">Fornitore</label>
                  <select
                    className="input-field"
                    value={quickAdd.supplier}
                    onChange={(e) => setQuickAdd({ ...quickAdd, supplier: e.target.value })}
                  >
                    {SUPPLIERS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Unità</label>
                  <select
                    className="input-field"
                    value={quickAdd.unit}
                    onChange={(e) => setQuickAdd({ ...quickAdd, unit: e.target.value })}
                  >
                    {MATERIAL_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">Product Line (opzionale)</label>
                <input
                  className="input-field"
                  value={quickAdd.category}
                  onChange={(e) => setQuickAdd({ ...quickAdd, category: e.target.value })}
                />
              </div>
              {quickAddError && <p className="text-xs text-fluent-danger">{quickAddError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary text-xs px-2.5 py-1.5" onClick={() => setShowQuickAdd(false)}>
                  Annulla
                </button>
                <button type="button" className="btn-primary text-xs px-2.5 py-1.5" disabled={savingQuickAdd} onClick={submitQuickAdd}>
                  {savingQuickAdd ? "Salvataggio..." : "Salva e usa nell'ordine"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
