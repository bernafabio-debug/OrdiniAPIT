"use client";

import { useEffect, useState, useCallback } from "react";
import type { Material } from "@/lib/types";

export default function MaterialiPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"1" | "0" | "">("1");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"user" | "admin">("user");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({ code: "", description: "", supplier: "", unit: "pz", category: "" });
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (activeFilter) params.set("active", activeFilter);
    const res = await fetch(`/api/materials?${params.toString()}`);
    const data = (await res.json()) as { materials: Material[] };
    setMaterials(data.materials ?? []);
    setLoading(false);
  }, [query, category, activeFilter]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole((d as { user: { role: "user" | "admin" } | null }).user?.role ?? "user"));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const categories = Array.from(new Set(materials.map((m) => m.category).filter(Boolean))) as string[];

  function openNew() {
    setEditing(null);
    setForm({ code: "", description: "", supplier: "", unit: "pz", category: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      code: m.code,
      description: m.description,
      supplier: m.supplier ?? "",
      unit: m.unit,
      category: m.category ?? ""
    });
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const url = editing ? `/api/materials/${editing.id}` : "/api/materials";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setFormError(data.error || "Errore durante il salvataggio.");
      return;
    }
    setShowForm(false);
    load();
  }

  async function toggleActive(m: Material) {
    await fetch(`/api/materials/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: m.active ? 0 : 1 })
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-fluent-text">Catalogo Materiali</h1>
          <p className="text-sm text-fluent-textMuted">Ricerca e gestione dell&apos;anagrafica materiali</p>
        </div>
        {role === "admin" && (
          <button className="btn-primary" onClick={openNew}>+ Nuovo materiale</button>
        )}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <input
          className="input-field max-w-xs"
          placeholder="Cerca codice, descrizione, fornitore..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input-field max-w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input-field max-w-[160px]"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as "1" | "0" | "")}
        >
          <option value="1">Solo attivi</option>
          <option value="0">Solo disattivati</option>
          <option value="">Tutti</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-fluent-textMuted text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Codice</th>
              <th className="text-left px-4 py-2.5">Descrizione</th>
              <th className="text-left px-4 py-2.5">Fornitore</th>
              <th className="text-left px-4 py-2.5">Categoria</th>
              <th className="text-left px-4 py-2.5">Unità</th>
              <th className="text-left px-4 py-2.5">Stato</th>
              {role === "admin" && <th className="text-left px-4 py-2.5">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-fluent-textMuted">Caricamento...</td></tr>
            )}
            {!loading && materials.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-fluent-textMuted">Nessun materiale trovato.</td></tr>
            )}
            {materials.map((m) => (
              <tr key={m.id} className="border-t border-fluent-border">
                <td className="px-4 py-2.5 font-medium">{m.code}</td>
                <td className="px-4 py-2.5">{m.description}</td>
                <td className="px-4 py-2.5">{m.supplier}</td>
                <td className="px-4 py-2.5">{m.category}</td>
                <td className="px-4 py-2.5">{m.unit}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${m.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.active ? "Attivo" : "Disattivato"}
                  </span>
                </td>
                {role === "admin" && (
                  <td className="px-4 py-2.5 space-x-2">
                    <button className="text-fluent-accent hover:underline" onClick={() => openEdit(m)}>Modifica</button>
                    <button className="text-fluent-textMuted hover:underline" onClick={() => toggleActive(m)}>
                      {m.active ? "Disattiva" : "Riattiva"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Modifica materiale" : "Nuovo materiale"}</h2>
            <form onSubmit={submitForm} className="space-y-3">
              <div>
                <label className="label-field">Codice</label>
                <input className="input-field" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Descrizione</label>
                <input className="input-field" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Fornitore</label>
                  <input className="input-field" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Categoria</label>
                  <input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label-field">Unità di misura</label>
                <input className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              {formError && <p className="text-sm text-fluent-danger">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annulla</button>
                <button type="submit" className="btn-primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
