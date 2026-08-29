import { NextRequest, NextResponse } from "next/server";
import { getDB, newId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { StockLocation } from "@/lib/types";

// GET /api/stock-locations?active=1 — lista destinazioni (qualsiasi utente autenticato)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeParam = searchParams.get("active");

  const db = getDB();
  let sql = `SELECT * FROM StockLocations WHERE 1=1`;
  const params: number[] = [];
  if (activeParam === "1" || activeParam === "0") {
    sql += ` AND active = ?`;
    params.push(Number(activeParam));
  }
  sql += ` ORDER BY technician_name ASC`;

  const { results } = await db.prepare(sql).bind(...params).all<StockLocation>();
  return NextResponse.json({ stockLocations: results ?? [] });
}

// POST /api/stock-locations — crea una nuova destinazione (solo admin)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const body = (await req.json()) as Partial<StockLocation>;
  if (!body.technician_name || !body.code) {
    return NextResponse.json({ error: "Nome tecnico e codice sono obbligatori." }, { status: 400 });
  }

  const db = getDB();
  const id = newId("stock");
  try {
    await db
      .prepare(`INSERT INTO StockLocations (id, technician_name, code, active) VALUES (?, ?, ?, 1)`)
      .bind(id, body.technician_name.trim(), body.code.trim())
      .run();
  } catch {
    return NextResponse.json({ error: "Codice già esistente." }, { status: 409 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
