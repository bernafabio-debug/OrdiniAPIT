import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { StockLocation } from "@/lib/types";

// PUT /api/stock-locations/:id — modifica nome/codice (solo admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as Partial<StockLocation>;

  const db = getDB();
  await db
    .prepare(`UPDATE StockLocations SET technician_name = ?, code = ? WHERE id = ?`)
    .bind(body.technician_name, body.code, id)
    .run();

  return NextResponse.json({ ok: true });
}

// PATCH /api/stock-locations/:id — attiva/disattiva (solo admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { active?: number };

  const db = getDB();
  await db.prepare(`UPDATE StockLocations SET active = ? WHERE id = ?`).bind(body.active ? 1 : 0, id).run();

  return NextResponse.json({ ok: true });
}
