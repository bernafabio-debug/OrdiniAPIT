"use client";

import { useEffect, useState } from "react";
import type { User, UserRole } from "@/lib/types";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" as UserRole });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Errore durante la creazione.");
      return;
    }
    setShowForm(false);
    setForm({ email: "", name: "", password: "", role: "user" });
    load();
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: u.active ? 0 : 1 })
    });
    load();
  }

  async function toggleRole(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: u.role === "admin" ? "user" : "admin" })
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-fluent-text">Amministrazione</h1>
          <p className="text-sm text-fluent-textMuted">Gestione utenti abilitati all&apos;applicazione</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuovo utente</button>
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
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-fluent-textMuted">Caricamento...</td></tr>}
            {!loading && users.map((u) => (
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
                  <button className="text-fluent-accent hover:underline" onClick={() => toggleRole(u)}>
                    {u.role === "admin" ? "Rendi utente" : "Rendi admin"}
                  </button>
                  <button className="text-fluent-textMuted hover:underline" onClick={() => toggleActive(u)}>
                    {u.active ? "Disattiva" : "Riattiva"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Nuovo utente</h2>
            <form onSubmit={submitForm} className="space-y-3">
              <div>
                <label className="label-field">Nome</label>
                <input className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Email</label>
                <input type="email" className="input-field" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Password temporanea</label>
                <input type="text" className="input-field" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Ruolo</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  <option value="user">Utente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
              {error && <p className="text-sm text-fluent-danger">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annulla</button>
                <button type="submit" className="btn-primary">Crea utente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
