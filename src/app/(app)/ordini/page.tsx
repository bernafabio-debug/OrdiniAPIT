"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderWithItems, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { exportOrderToPdf } from "@/lib/pdf";
import { exportOrderToXlsx, exportOrdersListToXlsx } from "@/lib/xlsx";

export default function StoricoOrdiniPage() {
  const searchParams = useSearchParams();
  const createdNotice = searchParams.get("created");

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    q: "",
    orderNumber: "",
    date: "",
    status: "" as OrderStatus | "",
    material: "",
    supplier: "",
    requester: ""
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole((d as { user: { role: "user" | "admin" } | null }).user?.role ?? "user"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = (await res.json()) as { orders: OrderWithItems[] };
    setOrders(data.orders ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changeStatus(orderId: string, status: OrderStatus) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-fluent-text">Storico Ordini</h1>
        {orders.length > 0 && (
          <button className="btn-secondary" onClick={() => exportOrdersListToXlsx(orders)}>
            Esporta tutto in Excel
          </button>
        )}
      </div>
      <p className="text-sm text-fluent-textMuted mb-4">
        {role === "admin" ? "Tutti gli ordini dell'azienda" : "I tuoi ordini"}
      </p>

      {createdNotice && (
        <div className="mb-4 px-4 py-2.5 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
          Ordine {createdNotice} creato correttamente.
        </div>
      )}

      <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <input className="input-field" placeholder="Ricerca full text" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input className="input-field" placeholder="Numero ordine" value={filters.orderNumber} onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })} />
        <input type="date" className="input-field" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <select className="input-field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as OrderStatus | "" })}>
          <option value="">Tutti gli stati</option>
          {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <input className="input-field" placeholder="Materiale" value={filters.material} onChange={(e) => setFilters({ ...filters, material: e.target.value })} />
        <input className="input-field" placeholder="Fornitore" value={filters.supplier} onChange={(e) => setFilters({ ...filters, supplier: e.target.value })} />
        {role === "admin" && (
          <input className="input-field" placeholder="Richiedente" value={filters.requester} onChange={(e) => setFilters({ ...filters, requester: e.target.value })} />
        )}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fluent-textMuted">Caricamento...</p>}
        {!loading && orders.length === 0 && (
          <div className="card p-8 text-center text-sm text-fluent-textMuted">Nessun ordine trovato.</div>
        )}
        {orders.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <button
                  className="font-semibold text-sm text-fluent-text hover:text-fluent-accent"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  {o.order_number}
                </button>
                <p className="text-xs text-fluent-textMuted">
                  {o.request_date} · {o.requester} · Stock {o.stock_technician ?? o.stock_code} · {o.shipping}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${o.delivery_single === "SI" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {o.delivery_single === "SI" ? "Consegna multipla" : "Consegna unica"}
                </span>
                {role === "admin" ? (
                  <select
                    className="text-xs border border-fluent-border rounded-md px-2 py-1"
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                  >
                    {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                ) : (
                  <OrderStatusBadge status={o.status} />
                )}
                <button className="btn-secondary text-xs px-2.5 py-1.5" onClick={() => exportOrderToPdf(o)}>PDF</button>
                <button className="btn-secondary text-xs px-2.5 py-1.5" onClick={() => exportOrderToXlsx(o)}>Excel</button>
              </div>
            </div>

            {expanded === o.id && (
              <div className="mt-3 pt-3 border-t border-fluent-border">
                <table className="w-full text-xs">
                  <thead className="text-fluent-textMuted uppercase">
                    <tr>
                      <th className="text-left py-1">Tipo</th>
                      <th className="text-left py-1">Codice</th>
                      <th className="text-left py-1">Descrizione</th>
                      <th className="text-left py-1">Qtà</th>
                      <th className="text-left py-1">Fornitore</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((it) => (
                      <tr key={it.id} className="border-t border-gray-100">
                        <td className="py-1.5">{it.item_type}</td>
                        <td className="py-1.5">{it.material_code}</td>
                        <td className="py-1.5">{it.material_description}</td>
                        <td className="py-1.5">{it.quantity} {it.unit}</td>
                        <td className="py-1.5">{it.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {o.notes && <p className="text-xs text-fluent-textMuted mt-2">Note: {o.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
