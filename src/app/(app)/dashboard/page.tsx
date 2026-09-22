"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import { TopBarChart, MonthlyTrendChart } from "@/components/Charts";

type Stats = {
  openOrders: number;
  monthOrders: number;
  byProductLine: Array<{ name: string; count: number }>;
  topSuppliers: Array<{ name: string; count: number }>;
  byStock: Array<{ name: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d as Stats))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-fluent-text mb-1">Dashboard</h1>
      <p className="text-sm text-fluent-textMuted mb-6">Panoramica degli ordini materiali</p>

      {loading ? (
        <p className="text-sm text-fluent-textMuted">Caricamento dati...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Ordini aperti" value={stats?.openOrders ?? 0} hint="Non consegnati né annullati" />
            <StatCard label="Ordini del mese" value={stats?.monthOrders ?? 0} hint="Creati nel mese corrente" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-fluent-text mb-3">Ordini per Product Line</h2>
              <TopBarChart data={stats?.byProductLine ?? []} />
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-fluent-text mb-3">Fornitori più utilizzati</h2>
              <TopBarChart data={stats?.topSuppliers ?? []} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-fluent-text mb-3">Ordini per Stock</h2>
              <TopBarChart data={stats?.byStock ?? []} />
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-fluent-text mb-3">Andamento mensile</h2>
              <MonthlyTrendChart data={stats?.monthlyTrend ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
