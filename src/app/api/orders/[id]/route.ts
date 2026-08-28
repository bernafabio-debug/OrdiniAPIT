import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";

export const runtime = "edge";

// GET /api/orders/:id — dettaglio ordine con righe materiale
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { id } = await params;
  const db = getDB();

  const order = await db.prepare(`SELECT * FROM Orders WHERE id = ?`).bind(id).first<Order>();
  if (!order) return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });

  if (session.role !== "admin" && order.requester_id !== session.sub) {
    return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  }

  const { results: items } = await db
    .prepare(`SELECT * FROM OrderItems WHERE order_id = ?`)
    .bind(id)
    .all<OrderItem>();

  return NextResponse.json({ order: { ...order, items: items ?? [] } });
}

// PATCH /api/orders/:id — cambia stato ordine (solo admin) o note/spedizione
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Solo un admin può modificare lo stato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { status?: OrderStatus };

  if (!body.status || !ORDER_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  }

  const db = getDB();
  await db
    .prepare(`UPDATE Orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(body.status, id)
    .run();

  return NextResponse.json({ ok: true });
}
