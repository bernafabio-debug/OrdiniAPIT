"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

const COLORS = ["#2564cf", "#107c10", "#986f0b", "#d13438", "#5c2d91", "#008272"];

export function TopBarChart({ data, dataKey = "count", nameKey = "name" }: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
}) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-fluent-textMuted py-8 text-center">Nessun dato disponibile.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey={nameKey} width={140} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill="#2564cf" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-fluent-textMuted py-8 text-center">Nessun dato disponibile.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: Array<{ month: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-fluent-textMuted py-8 text-center">Nessun dato disponibile.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#2564cf" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
