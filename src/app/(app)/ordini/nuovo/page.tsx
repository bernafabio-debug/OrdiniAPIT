"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MaterialAutocomplete from "@/components/MaterialAutocomplete";
import type { Material, ItemType, ShippingMethod, StockLocation } from "@/lib/types";
import { ITEM_TYPES, SHIPPING_METHODS } from "@/lib/types";

type DraftItem = {
  key: string;
  item_type: ItemType;
  material_code: string;
  material_description: string;
  supplier: string;
  category: string;
  quantity: number;
  unit: string;
};

function emptyEntry() {
  return {
    item_type: "Consumabile" as ItemType,
    material_code: "",
    material_description: "",
    supplier: "",
    category: "",
    quantity: 1,
    unit: "pcs"
  };
}

export default function NuovoOrdinePage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [requestDate, setRequestDate] = useState(today);
  const [deliverySingle, setDeliverySingle] = useState<"SI" | "NO">("NO");
  const [shipping, setShipping] = useState<ShippingMethod>("DHL Collega");
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [stockCode, setStockCode] = useState("");
  const [notes, setNotes] = useState("");

  // Riga in compilazione (non ancora inserita nella tabella)
  const [entry, setEntry] = useState(emptyEntry());
  const [entryError, setEntryError] = useState("");
  const [autocompleteKey, setAutocompleteKey] = useState(0); // forza il reset del campo di ricerca dopo ogni inserimento

  // Righe già inserite (quelle che finiranno nell'ordine)
  const [rows, setRows] = useState<DraftItem[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/stock-locations?active=1")
      .then((r) => r.json())
      .then((d) => setStockLocations((d as { stockLocations: StockLocation[] }).stockLocations ?? []));
  }, []);

  function selectMaterial(m: Material) {
    setEntry((prev) => ({
      ...prev,
      material_code: m.code,
      material_description: m.description,
      supplier: m.supplier ?? "",
      category: m.category ?? "",
      unit: m.unit
    }));
    setEntryError("");
  }

  function handleInsert() {
    setEntryError("");
    if (!entry.material_code || !entry.material_description) {
      setEntryError("Seleziona un materiale dall'elenco (o aggiungilo al volo) prima di inserire la riga.");
      return;
    }
    if (!entry.quantity || entry.quantity <= 0) {
      setEntryError("Inserisci una quantità valida.");
      return;
    }

    setRows((prev) => [...prev, { ...entry, key: crypto.randomUUID() }]);

    // libera i campi per il prossimo inserimento
    setEntry(emptyEntry());
    setAutocompleteKey((k) => k + 1);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rows.length === 0) {
      setError("Inserisci almeno un materiale nella tabella prima di generare l'ordine.");
      return;
    }
    if (!stockCode) {
      setError("Seleziona lo stock di destinazione.");
      return;
    }

    const selectedStock = stockLocations.find((s) => s.code === stockCode);

    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_date: requestDate,
        delivery_single: deliverySingle,
        shipping,
        stock_code: stockCode,
        stock_technician: selectedStock?.technician_name ?? "",
        notes,
        items: rows.map((it) => ({
          material_code: it.material_code,
          material_description: it.material_description,
          quantity: it.quantity,
          unit: it.unit,
          supplier: it.supplier,
          category: it.category,
          item_type: it.item_type
        }))
      })
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Errore durante la creazione dell'ordine.");
      return;
    }

    const data = (await res.json()) as { order_number: string };
    router.push(`/ordini?created=${data.order_number}`);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-fluent-text mb-1">Nuovo Ordine</h1>
      <p className="text-sm text-fluent-textMuted mb-6">Compila i dati generali e aggiungi i materiali richiesti</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label-field">Data richiesta</label>
            <input type="date" className="input-field" required value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Stock</label>
            <select className="input-field" required value={stockCode} onChange={(e) => setStockCode(e.target.value)}>
              <option value="">Seleziona...</option>
              {stockLocations.map((s) => (
                <option key={s.id} value={s.code}>{s.technician_name} — {s.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Spedizione</label>
            <select className="input-field" value={shipping} onChange={(e) => setShipping(e.target.value as ShippingMethod)}>
              {SHIPPING_METHODS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="label-field">Split Delivery</label>
            <select className="input-field" value={deliverySingle} onChange={(e) => setDeliverySingle(e.target.value as "SI" | "NO")}>
              <option value="NO">NO — consegna unica</option>
              <option value="SI">SI — consegna multipla</option>
            </select>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-fluent-text mb-1">Righe materiale</h2>
          <p className="text-xs text-fluent-textMuted mb-4">
            Compila i campi qui sotto e premi &quot;Inserisci&quot;: la riga entra nella tabella e i campi si liberano per il materiale successivo.
          </p>

          {/* ---- Zona di compilazione riga corrente ---- */}
          <div className="border border-fluent-border rounded-md p-4 bg-gray-50/50 mb-4">
            <div className="mb-3">
              <label className="label-field">Materiale</label>
              <MaterialAutocomplete key={autocompleteKey} onSelect={selectMaterial} />
              {entry.material_code && (
                <p className="text-xs text-fluent-textMuted mt-1.5">
                  Selezionato: <strong>{entry.material_code}</strong> — {entry.material_description}
                  {entry.supplier && ` · ${entry.supplier}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label-field">Tipo</label>
                <select
                  className="input-field"
                  value={entry.item_type}
                  onChange={(e) => setEntry({ ...entry, item_type: e.target.value as ItemType })}
                >
                  {ITEM_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="label-field">Quantità</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  className="input-field"
                  value={entry.quantity}
                  onChange={(e) => setEntry({ ...entry, quantity: Number(e.target.value) || 1 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <label className="label-field">Unità</label>
                <select className="input-field" value={entry.unit} onChange={(e) => setEntry({ ...entry, unit: e.target.value })}>
                  <option value="pcs">pcs</option>
                  <option value="mt">mt</option>
                </select>
              </div>
            </div>

            {entryError && <p className="text-xs text-fluent-danger mb-2">{entryError}</p>}

            <button type="button" className="btn-primary" onClick={handleInsert}>
              + Inserisci
            </button>
          </div>

          {/* ---- Tabella delle righe già inserite ---- */}
          {rows.length === 0 ? (
            <p className="text-sm text-fluent-textMuted text-center py-6">Nessun materiale inserito ancora.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-fluent-textMuted text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Part Number</th>
                    <th className="text-left px-3 py-2">Descrizione</th>
                    <th className="text-left px-3 py-2">Quantità</th>
                    <th className="text-left px-3 py-2">Unità</th>
                    <th className="text-left px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-fluent-border">
                      <td className="px-3 py-2">{r.item_type}</td>
                      <td className="px-3 py-2 font-medium">{r.material_code}</td>
                      <td className="px-3 py-2">{r.material_description}</td>
                      <td className="px-3 py-2">{r.quantity}</td>
                      <td className="px-3 py-2">{r.unit}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" className="text-xs text-fluent-danger" onClick={() => removeRow(r.key)}>
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <label className="label-field">Note (opzionale)</label>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="Cliente, urgenza, altre info..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-fluent-danger">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creazione in corso..." : "Genera ordine"}
        </button>
      </form>
    </div>
  );
}
