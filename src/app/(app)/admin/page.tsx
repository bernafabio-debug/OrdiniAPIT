"use client";

import { useEffect, useState } from "react";
import type { User, UserRole, StockLocation } from "@/lib/types";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", name: "", password: "", role: "user" as UserRole });
  const [userError, setUserError] = useState("");

  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [showStockForm, setShowStockForm] = useState(false);
  const [editingStock, setEditingStock] = useState<StockLocation | null>(null);
  const [stockForm, setStockForm] = useState({ technician_name: "", code: "" });
  const [stockError, setStockError] = useState("");

  async function loadUsers() {
    setLoadingUsers(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = (await res.json()) as { users: User[] };
      setUsers(data.users ?? []);
    }
    setLoadingUsers(false);
  }

  async function loadStock() {
    setLoadingStock(true);
    const res = await fetch("/api/stock-locations");
    if (res.ok) {
      const data = (await res.json()) as { stockLocations: StockLocation[] };
      setStockLocations(data.stockLocations ?? []);
    }
    setLoadingStock(false);
  }

  useEffect(() => {
    loadUsers();
    loadStock();
  }, []);

  async function submitUserForm(e: React.FormEvent) {
    e.preventDefault();
    setUserError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm)
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setUserError(data.error || "Errore durante la creazione.");
      return;
    }
    setShowUserForm(false);
    setUserForm({ email: "", name: "", password: "", role: "user" });
    loadUsers();
  }

  async function toggleUserActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: u.active ? 0 : 1 })
    });
    loadUsers();
  }

  async function toggleUserRole(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: u.role === "admin" ? "user" : "admin" })
    });
    loadUsers();
  }

  function openNewStock() {
    setEditingStock(null);
    setStockForm({ technician_name: "", code: "" });
    setStockError("");
    setShowStockForm(true);
  }

  function openEditStock(s: StockLocation) {
    setEditingStock(s);
    setStockForm({ technician_name: s.technician_name, code: s.code });
    setStockError("");
    setShowStockForm(true);
  }

  async function submitStockForm(e: React.FormEvent) {
    e.preventDefault();
    setStockError("");
    const url = editingStock ? `/api/stock-locations/${editingStock.id}` : "/api/stock-locations";
    const method = editingStock ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stockForm)
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setStockError(data.error || "Errore durante il salvataggio.");
      return;
    }
    setShowStockForm(false);
    loadStock();
  }

  async function toggleStockActive(s: StockLocation) {
    await fetch(`/api/stock-locations/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: s.active ? 0 : 1 })
    });
    loadStock();
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-fluent-text">Amministrazione</h1>
            <p className="text-sm text-fluent-textMuted">Gestione utenti abilitati all&apos;applicazione</p>
          </div>
          <button className="btn-primary" onClick={() => setShowUserForm(true)}>+ Nuovo utente</button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-fluent-textMuted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Ruolo</th>
                <th className="text-left px-4 py-2.5">Stato</th>
                <th className="text-left px-4 py-2.5">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers && <tr><td colSpan={5} className="px-4 py-6 text-center text-fluent-textMuted">Caricamento...</td></tr>}
              {!loadingUsers && users.map((u) => (
                <tr key={u.id} className="border-t border-fluent-border">
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {u.role === "admin" ? "Admin" : "Utente"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.active ? "Attivo" : "Disattivato"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 space-x-2">
                    <button className="text-fluent-accent hover:underline" onClick={() => toggleUserRole(u)}>
                      {u.role === "admin" ? "Rendi utente" : "Rendi admin"}
                    </button>
                    <button className="text-fluent-textMuted hover:underline" onClick={() => toggleUserActive(u)}>
                      {u.active ? "Disattiva" : "Riattiva"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-fluent-text">Stock (destinazioni materiali)</h2>
            <p className="text-sm text-fluent-textMuted">Elenco tecnico → codice stock, usato nel form Nuovo Ordine</p>
          </div>
          <button className="btn-primary" onClick={openNewStock}>+ Nuovo stock</button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-fluent-textMuted text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Tecnico</th>
                <th className="text-left px-4 py-2.5">Codice</th>
                <th className="text-left px-4 py-2.5">Stato</th>
                <th className="text-left px-4 py-2.5">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loadingStock && <tr><td colSpan={4} className="px-4 py-6 text-center text-fluent-textMuted">Caricamento...</td></tr>}
              {!loadingStock && stockLocations.map((s) => (
                <tr key={s.id} className="border-t border-fluent-border">
                  <td className="px-4 py-2.5 font-medium">{s.technician_name}</td>
                  <td className="px-4 py-2.5">{s.code}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.active ? "Attivo" : "Disattivato"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 space-x-2">
                    <button className="text-fluent-accent hover:underline" onClick={() => openEditStock(s)}>Modifica</button>
                    <button className="text-fluent-textMuted hover:underline" onClick={() => toggleStockActive(s)}>
                      {s.active ? "Disattiva" : "Riattiva"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUserForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Nuovo utente</h2>
            <form onSubmit={submitUserForm} className="space-y-3">
              <div>
                <label className="label-field">Nome</label>
                <input className="input-field" required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Email</label>
                <input type="email" className="input-field" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Password temporanea</label>
                <input type="text" className="input-field" required minLength={8} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Ruolo</label>
                <select className="input-field" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}>
                  <option value="user">Utente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
              {userError && <p className="text-sm text-fluent-danger">{userError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowUserForm(false)}>Annulla</button>
                <button type="submit" className="btn-primary">Crea utente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingStock ? "Modifica stock" : "Nuovo stock"}</h2>
            <form onSubmit={submitStockForm} className="space-y-3">
              <div>
                <label className="label-field">Nome tecnico</label>
                <input className="input-field" required value={stockForm.technician_name} onChange={(e) => setStockForm({ ...stockForm, technician_name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Codice</label>
                <input className="input-field" required value={stockForm.code} onChange={(e) => setStockForm({ ...stockForm, code: e.target.value })} />
              </div>
              {stockError && <p className="text-sm text-fluent-danger">{stockError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowStockForm(false)}>Annulla</button>
                <button type="submit" className="btn-primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
