import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const db = getDB();
  const isAdmin = session.role === "admin";
  const scopeClause = isAdmin ? "" : "AND o.requester_id = ?";
  const scopeParams = isAdmin ? [] : [session.sub];

  const [openOrders, monthOrders, topMaterials, topSuppliers, byStatus, monthlyTrend] = await Promise.all([
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
    db
      .prepare(
        `SELECT i.material_description as name, COUNT(*) as count
         FROM OrderItems i
         JOIN Orders o ON o.id = i.order_id
         WHERE 1=1 ${scopeClause}
         GROUP BY i.material_code
         ORDER BY count DESC
         LIMIT 5`
      )
      .bind(...scopeParams)
      .all<{ name: string; count: number }>(),
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
    db
      .prepare(
        `SELECT o.status as name, COUNT(*) as count FROM Orders o WHERE 1=1 ${scopeClause} GROUP BY o.status`
      )
      .bind(...scopeParams)
      .all<{ name: string; count: number }>(),
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
    topMaterials: topMaterials.results ?? [],
    topSuppliers: topSuppliers.results ?? [],
    byStatus: byStatus.results ?? [],
    monthlyTrend: monthlyTrend.results ?? []
  });
}
