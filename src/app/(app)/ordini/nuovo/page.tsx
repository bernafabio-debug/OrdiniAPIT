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

function emptyItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    item_type: "Consumabile",
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
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/stock-locations?active=1")
      .then((r) => r.json())
      .then((d) => setStockLocations((d as { stockLocations: StockLocation[] }).stockLocations ?? []));
  }, []);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function selectMaterial(key: string, m: Material) {
    updateItem(key, {
      material_code: m.code,
      material_description: m.description,
      supplier: m.supplier ?? "",
      category: m.category ?? "",
      unit: m.unit
    });
  }

  function addRow() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeRow(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((it) => it.material_code && it.material_description);
    if (validItems.length === 0) {
      setError("Aggiungi almeno un materiale valido (seleziona dal catalogo).");
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
        items: validItems.map((it) => ({
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-fluent-text">Righe materiale</h2>
            <button type="button" className="btn-secondary" onClick={addRow}>+ Aggiungi riga</button>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.key} className="border border-fluent-border rounded-md p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-fluent-accent">Riga {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" className="text-xs text-fluent-danger" onClick={() => removeRow(it.key)}>
                      Rimuovi
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="sm:col-span-2">
                    <label className="label-field">Materiale</label>
                    <MaterialAutocomplete onSelect={(m) => selectMaterial(it.key, m)} />
                    {it.material_code && (
                      <p className="text-xs text-fluent-textMuted mt-1.5">
                        Selezionato: <strong>{it.material_code}</strong> — {it.material_description}
                        {it.supplier && ` · ${it.supplier}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-field">Tipo</label>
                    <select className="input-field" value={it.item_type} onChange={(e) => updateItem(it.key, { item_type: e.target.value as ItemType })}>
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
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) || 1 })}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div>
                    <label className="label-field">Unità</label>
                    <select className="input-field" value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })}>
                      <option value="pcs">pcs</option>
                      <option value="mt">mt</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
