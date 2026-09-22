import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

type UnitRow = { name: string | null; unit: string; total: number };
type PivotRow = { name: string; pcs: number; mt: number };

function pivotByUnit(rows: UnitRow[], limit: number): PivotRow[] {
  const map = new Map<string, PivotRow>();
  for (const r of rows) {
    if (!r.name) continue;
    const entry = map.get(r.name) ?? { name: r.name, pcs: 0, mt: 0 };
    if (r.unit === "pcs") entry.pcs += r.total;
    else if (r.unit === "mt") entry.mt += r.total;
    map.set(r.name, entry);
  }
  return Array.from(map.values())
    .sort((a, b) => b.pcs + b.mt - (a.pcs + a.mt))
    .slice(0, limit);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const db = getDB();
  const isAdmin = session.role === "admin";
  const scopeClause = isAdmin ? "" : "AND o.requester_id = ?";
  const scopeParams = isAdmin ? [] : [session.sub];

  const [openOrders, monthOrders, productLineRows, topSuppliers, stockRows, monthlyTrend] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as n FROM Orders o
         WHERE o.status NOT IN ('Consegnato','Annullato') ${scopeClause}`
      )
      .bind(...scopeParams)
      .first<{ n: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) as n FROM Orders o
         WHERE strftime('%Y-%m', o.created_at) = strftime('%Y-%m', 'now') ${scopeClause}`
      )
      .bind(...scopeParams)
      .first<{ n: number }>(),
    // Somma quantità per Product Line, separata per unità (pcs / mt)
    db
      .prepare(
        `SELECT i.category as name, i.unit as unit, SUM(i.quantity) as total
         FROM OrderItems i
         JOIN Orders o ON o.id = i.order_id
         WHERE i.category IS NOT NULL AND i.category != '' ${scopeClause}
         GROUP BY i.category, i.unit`
      )
      .bind(...scopeParams)
      .all<UnitRow>(),
    db
      .prepare(
        `SELECT i.supplier as name, COUNT(*) as count
         FROM OrderItems i
         JOIN Orders o ON o.id = i.order_id
         WHERE i.supplier IS NOT NULL ${scopeClause}
         GROUP BY i.supplier
         ORDER BY count DESC
         LIMIT 5`
      )
      .bind(...scopeParams)
      .all<{ name: string; count: number }>(),
    // Somma quantità spedite per Stock, separata per unità (pcs / mt)
    db
      .prepare(
        `SELECT COALESCE(o.stock_technician, o.stock_code) as name, i.unit as unit, SUM(i.quantity) as total
         FROM OrderItems i
         JOIN Orders o ON o.id = i.order_id
         WHERE o.stock_code IS NOT NULL ${scopeClause}
         GROUP BY COALESCE(o.stock_technician, o.stock_code), i.unit`
      )
      .bind(...scopeParams)
      .all<UnitRow>(),
    db
      .prepare(
        `SELECT strftime('%Y-%m', o.created_at) as month, COUNT(*) as count
         FROM Orders o
         WHERE 1=1 ${scopeClause}
         GROUP BY month
         ORDER BY month ASC
         LIMIT 12`
      )
      .bind(...scopeParams)
      .all<{ month: string; count: number }>()
  ]);

  return NextResponse.json({
    openOrders: openOrders?.n ?? 0,
    monthOrders: monthOrders?.n ?? 0,
    byProductLine: pivotByUnit(productLineRows.results ?? [], 8),
    topSuppliers: topSuppliers.results ?? [],
    byStock: pivotByUnit(stockRows.results ?? [], 15),
    monthlyTrend: monthlyTrend.results ?? []
  });
}
