import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { StockLocation } from "@/lib/types";

// Verifica che l'utente corrente possa modificare la riga di stock indicata.
async function canAccessRow(id: string, userId: string, role: string): Promise<{ ok: boolean; stockCode?: string }> {
  const db = getDB();
  const row = await db.prepare(`SELECT stock_code FROM StockInventory WHERE id = ?`).bind(id).first<{ stock_code: string }>();
  if (!row) return { ok: false };
  if (role === "admin") return { ok: true, stockCode: row.stock_code };
  const loc = await db
    .prepare(`SELECT owner_user_id FROM StockLocations WHERE code = ?`)
    .bind(row.stock_code)
    .first<Pick<StockLocation, "owner_user_id">>();
  return { ok: !!loc && loc.owner_user_id === userId, stockCode: row.stock_code };
}

// PATCH /api/stock-inventory/:id — aggiorna quantità / minimo / nota
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { id } = await params;
  const access = await canAccessRow(id, session.sub, session.role);
  if (!access.ok) return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const body = (await req.json()) as { quantity?: number; min_stock?: number; note?: string | null };

  const db = getDB();
  await db
    .prepare(
      `UPDATE StockInventory SET quantity = ?, min_stock = ?, note = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(
      body.quantity !== undefined ? body.quantity : 0,
      body.min_stock !== undefined ? body.min_stock : 0,
      body.note ?? null,
      id
    )
    .run();

  return NextResponse.json({ ok: true });
}

// DELETE /api/stock-inventory/:id — rimuove il part number da questo stock (non tocca il Catalogo Materiali)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { id } = await params;
  const access = await canAccessRow(id, session.sub, session.role);
  if (!access.ok) return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const db = getDB();
  await db.prepare(`DELETE FROM StockInventory WHERE id = ?`).bind(id).run();

  return NextResponse.json({ ok: true });
}
