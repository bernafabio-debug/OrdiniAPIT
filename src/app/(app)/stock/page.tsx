"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { StockInventoryItem, StockLocation } from "@/lib/types";
import { MATERIAL_UNITS } from "@/lib/types";

type Me = { id: string; role: "user" | "admin" } | null;
type SortKey = "material_code" | "description" | "category" | "min_stock" | "quantity" | "unit";
type SortDir = "asc" | "desc";

function SortableTh({
  label,
  sortKey: key,
  width,
  align = "left",
  sortKeyActive,
  sortDir,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  width: string;
  align?: "left" | "right";
  sortKeyActive: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKeyActive === key;
  return (
    <th
      className={`px-4 py-2.5 cursor-pointer hover:text-fluent-text ${width} ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(key)}
    >
      {label}
      {active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

export default function StockPage() {
  const [me, setMe] = useState<Me>(null);
  const [myLocations, setMyLocations] = useState<StockLocation[]>([]);
  const [allLocations, setAllLocations] = useState<StockLocation[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [items, setItems] = useState<StockInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [editing, setEditing] = useState<StockInventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: "0", min_stock: "0", note: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addLookup, setAddLookup] = useState<{ found: boolean; description: string; unit: string; category: string; instrument: string } | null>(null);
  const [addForm, setAddForm] = useState({ description: "", unit: "pcs", category: "", instrument: "", quantity: "0", min_stock: "0", note: "" });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [productLineFilter, setProductLineFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("material_code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Utente corrente + stock assegnati
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe((d as { user: Me }).user));
  }, []);

  const loadLocations = useCallback(async (userId: string, role: "user" | "admin") => {
    setLoadingLocations(true);
    const mineRes = await fetch("/api/stock-locations?mine=1&active=1");
    const mineData = (await mineRes.json()) as { stockLocations: StockLocation[] };
    setMyLocations(mineData.stockLocations ?? []);

    if (role === "admin") {
      const allRes = await fetch("/api/stock-locations?active=1");
      const allData = (await allRes.json()) as { stockLocations: StockLocation[] };
      setAllLocations(allData.stockLocations ?? []);
    }
    setLoadingLocations(false);
  }, []);

  useEffect(() => {
    if (!me) return;
    loadLocations(me.id, me.role);
  }, [me, loadLocations]);

  // Selezione di default: il proprio stock, oppure (admin) il primo disponibile
  useEffect(() => {
    if (selectedCode) return;
    if (myLocations.length > 0) {
      setSelectedCode(myLocations[0].code);
    } else if (me?.role === "admin" && allLocations.length > 0) {
      setSelectedCode(allLocations[0].code);
    }
  }, [myLocations, allLocations, me, selectedCode]);

  const loadItems = useCallback(async (code: string) => {
    setLoading(true);
    const res = await fetch(`/api/stock-inventory?stock_code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const data = (await res.json()) as { items: StockInventoryItem[] };
      setItems(data.items ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCode) loadItems(selectedCode);
  }, [selectedCode, loadItems]);

  // APIT è uno stock "tecnico" generico: non va assegnato a nessuno, quindi non compare tra le opzioni selezionabili
  const selectorOptions = (me?.role === "admin" ? allLocations : myLocations).filter(
    (s) => s.technician_name.trim().toUpperCase() !== "APIT"
  );
  const selectedLocation = selectorOptions.find((s) => s.code === selectedCode);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const productLines = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
    [items]
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items.filter((item) => {
      if (productLineFilter && item.category !== productLineFilter) return false;
      if (!q) return true;
      return (
        item.material_code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.note ?? "").toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [items, search, productLineFilter, sortKey, sortDir]);

  function openEdit(item: StockInventoryItem) {
    setEditing(item);
    setEditForm({ quantity: String(item.quantity), min_stock: String(item.min_stock), note: item.note ?? "" });
    setEditError("");
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    setSaving(true);
    const res = await fetch(`/api/stock-inventory/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseFloat(editForm.quantity) || 0,
        min_stock: parseFloat(editForm.min_stock) || 0,
        note: editForm.note.trim() || null
      })
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setEditError(data.error || "Errore durante il salvataggio.");
      return;
    }
    setEditing(null);
    loadItems(selectedCode);
  }

  async function removeItem(item: StockInventoryItem) {
    if (!confirm(`Rimuovere ${item.material_code} — ${item.description} da questo stock?`)) return;
    await fetch(`/api/stock-inventory/${item.id}`, { method: "DELETE" });
    loadItems(selectedCode);
  }

  function openAdd() {
    setAddCode("");
    setAddLookup(null);
    setAddForm({ description: "", unit: "pcs", category: "", instrument: "", quantity: "0", min_stock: "0", note: "" });
    setAddError("");
    setShowAdd(true);
  }

  async function lookupCode() {
    const code = addCode.trim();
    if (!code) return;
    const res = await fetch(`/api/materials?q=${encodeURIComponent(code)}&active=1`);
    const data = (await res.json()) as { materials: { code: string; description: string; unit: string; category: string | null; instrument: string | null }[] };
    const match = data.materials.find((m) => m.code === code);
    if (match) {
      setAddLookup({ found: true, description: match.description, unit: match.unit, category: match.category ?? "", instrument: match.instrument ?? "" });
    } else {
      setAddLookup({ found: false, description: "", unit: "pcs", category: "", instrument: "" });
      setAddForm((f) => ({ ...f, description: "", unit: "pcs", category: "", instrument: "" }));
    }
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!addCode.trim()) {
      setAddError("Part Number obbligatorio.");
      return;
    }
    if (!addLookup) {
      setAddError("Verifica prima il Part Number (esci dal campo per cercarlo a catalogo).");
      return;
    }
    if (!addLookup.found && !addForm.description.trim()) {
      setAddError("Part Number non a catalogo: descrizione obbligatoria per crearlo.");
      return;
    }
    setAddSaving(true);
    const res = await fetch("/api/stock-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stock_code: selectedCode,
        material_code: addCode.trim(),
        description: addLookup.found ? undefined : addForm.description.trim(),
        unit: addLookup.found ? undefined : addForm.unit,
        category: addLookup.found ? undefined : addForm.category.trim() || null,
        instrument: addLookup.found ? undefined : addForm.instrument.trim() || null,
        quantity: parseFloat(addForm.quantity) || 0,
        min_stock: parseFloat(addForm.min_stock) || 0,
        note: addForm.note.trim() || null
      })
    });
    setAddSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setAddError(data.error || "Errore durante il salvataggio.");
      return;
    }
    setShowAdd(false);
    loadItems(selectedCode);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-fluent-text">Il mio Stock</h1>
          <p className="text-sm text-fluent-textMuted">
            Quantità e scorta minima dei part number nel tuo magazzino personale
          </p>
        </div>
        {selectedCode && (
          <button className="btn-primary" onClick={openAdd}>+ Aggiungi materiale</button>
        )}
      </div>

      {!loadingLocations && selectorOptions.length > 1 && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <label className="label-field mb-0">Stock:</label>
          <select className="input-field max-w-xs" value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)}>
            {selectorOptions.map((s) => (
              <option key={s.code} value={s.code}>{s.technician_name} ({s.code})</option>
            ))}
          </select>
        </div>
      )}

      {!loadingLocations && selectorOptions.length === 1 && selectedLocation && (
        <p className="text-sm text-fluent-textMuted mb-4">
          {selectedLocation.technician_name} — stock {selectedLocation.code}
        </p>
      )}

      {!loadingLocations && selectorOptions.length === 0 && (
        <div className="card p-6 text-center text-fluent-textMuted text-sm">
          Non hai ancora uno stock assegnato. Chiedi a un amministratore di collegare il tuo utente a uno stock
          in Amministrazione.
        </div>
      )}

      {selectedCode && (
        <>
          <div className="card p-4 mb-4 flex flex-wrap gap-3">
            <input
              className="input-field max-w-xs"
              placeholder="Cerca PN, descrizione, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input-field max-w-[180px]"
              value={productLineFilter}
              onChange={(e) => setProductLineFilter(e.target.value)}
            >
              <option value="">Tutte le PL</option>
              {productLines.map((pl) => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 text-fluent-textMuted text-xs uppercase select-none">
                <tr>
                  <SortableTh label="PN" sortKey="material_code" width="w-24" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Descrizione" sortKey="description" width="w-56" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="PL" sortKey="category" width="w-24" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Min" sortKey="min_stock" width="w-16" align="right" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Quantità" sortKey="quantity" width="w-20" align="right" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="UM" sortKey="unit" width="w-14" sortKeyActive={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-left px-4 py-2.5 w-40">Note</th>
                  <th className="text-left px-4 py-2.5 w-32">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-fluent-textMuted">Caricamento...</td></tr>
                )}
                {!loading && visibleItems.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-fluent-textMuted">Nessun materiale trovato.</td></tr>
                )}
                {visibleItems.map((item) => {
                  const missing = item.min_stock - item.quantity > 0;
                  return (
                    <tr key={item.id} className={`border-t border-fluent-border ${missing ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-2.5 font-medium truncate" title={item.material_code}>{item.material_code}</td>
                      <td className="px-4 py-2.5 truncate" title={item.description}>{item.description}</td>
                      <td className="px-4 py-2.5 truncate" title={item.category ?? ""}>{item.category}</td>
                      <td className="px-4 py-2.5 text-right">{item.min_stock}</td>
                      <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-4 py-2.5">{item.unit}</td>
                      <td className="px-4 py-2.5 text-fluent-textMuted truncate" title={item.note ?? ""}>{item.note}</td>
                      <td className="px-4 py-2.5 space-x-2 whitespace-nowrap">
                        <button className="text-fluent-accent hover:underline" onClick={() => openEdit(item)}>Modifica</button>
                        <button className="text-fluent-textMuted hover:underline" onClick={() => removeItem(item)}>Rimuovi</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">Modifica quantità</h2>
            <p className="text-sm text-fluent-textMuted mb-4">
              {editing.material_code} — {editing.description}
            </p>
            <form onSubmit={submitEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Quantità attuale</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={editForm.quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-field">Min Car Stock</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={editForm.min_stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditForm({ ...editForm, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Note</label>
                <input className="input-field" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
              </div>
              {editError && <p className="text-sm text-fluent-danger">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Annulla</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Aggiungi materiale allo stock</h2>
            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <label className="label-field">Part Number</label>
                <input
                  className="input-field"
                  required
                  value={addCode}
                  onChange={(e) => { setAddCode(e.target.value); setAddLookup(null); }}
                  onBlur={lookupCode}
                  placeholder="Esci dal campo per cercarlo a catalogo"
                />
              </div>

              {addLookup?.found && (
                <div className="text-sm bg-green-50 text-green-800 rounded-md px-3 py-2">
                  Già a catalogo: <strong>{addLookup.description}</strong> ({addLookup.unit}
                  {addLookup.category ? `, ${addLookup.category}` : ""})
                </div>
              )}

              {addLookup && !addLookup.found && (
                <>
                  <div className="text-sm bg-amber-50 text-amber-800 rounded-md px-3 py-2">
                    Non a catalogo: verrà creato un nuovo materiale con queste informazioni.
                  </div>
                  <div>
                    <label className="label-field">Descrizione</label>
                    <input
                      className="input-field"
                      required
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-field">Unità</label>
                      <select className="input-field" value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}>
                        {MATERIAL_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Product Line</label>
                      <input className="input-field" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Instrument</label>
                    <input className="input-field" value={addForm.instrument} onChange={(e) => setAddForm({ ...addForm, instrument: e.target.value })} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Quantità attuale</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={addForm.quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-field">Min Car Stock</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={addForm.min_stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAddForm({ ...addForm, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Note</label>
                <input className="input-field" value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} />
              </div>

              {addError && <p className="text-sm text-fluent-danger">{addError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Annulla</button>
                <button type="submit" className="btn-primary" disabled={addSaving}>{addSaving ? "Salvataggio..." : "Aggiungi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
