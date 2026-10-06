import { NextRequest, NextResponse } from "next/server";
import { getDB, newId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { StockInventoryItem, StockLocation } from "@/lib/types";

// Verifica che l'utente corrente possa operare sullo stock_code indicato:
// admin -> sempre; utente normale -> solo se è il proprietario assegnato.
async function canAccessStock(stockCode: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const db = getDB();
  const loc = await db
    .prepare(`SELECT owner_user_id FROM StockLocations WHERE code = ?`)
    .bind(stockCode)
    .first<Pick<StockLocation, "owner_user_id">>();
  return !!loc && loc.owner_user_id === userId;
}

// GET /api/stock-inventory?stock_code=4513 — righe di stock con i dati del materiale uniti
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stockCode = searchParams.get("stock_code");
  if (!stockCode) {
    return NextResponse.json({ error: "Parametro stock_code obbligatorio." }, { status: 400 });
  }

  const allowed = await canAccessStock(stockCode, session.sub, session.role);
  if (!allowed) return NextResponse.json({ error: "Permesso negato per questo stock." }, { status: 403 });

  const db = getDB();
  const { results } = await db
    .prepare(
      `SELECT si.id, si.stock_code, si.material_code, si.quantity, si.min_stock, si.note,
              si.created_at, si.updated_at,
              m.description, m.unit, m.category, m.instrument, m.supplier
       FROM StockInventory si
       JOIN Materials m ON m.code = si.material_code
       WHERE si.stock_code = ?
       ORDER BY m.code ASC`
    )
    .bind(stockCode)
    .all<StockInventoryItem>();

  return NextResponse.json({ items: results ?? [] });
}

// POST /api/stock-inventory — aggiunge un part number allo stock di un tecnico.
// Se il part number non esiste ancora nel Catalogo Materiali, lo crea al volo
// con le informazioni fornite (descrizione, unità, Product Line, Instrument).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const body = (await req.json()) as {
    stock_code?: string;
    material_code?: string;
    description?: string;
    unit?: string;
    category?: string;
    instrument?: string;
    supplier?: string;
    quantity?: number;
    min_stock?: number;
    note?: string;
  };

  if (!body.stock_code || !body.material_code) {
    return NextResponse.json({ error: "Stock e Part Number sono obbligatori." }, { status: 400 });
  }

  const allowed = await canAccessStock(body.stock_code, session.sub, session.role);
  if (!allowed) return NextResponse.json({ error: "Permesso negato per questo stock." }, { status: 403 });

  const db = getDB();
  const materialCode = body.material_code.trim();

  const existingMaterial = await db
    .prepare(`SELECT id FROM Materials WHERE code = ?`)
    .bind(materialCode)
    .first<{ id: string }>();

  if (!existingMaterial) {
    if (!body.description) {
      return NextResponse.json(
        { error: "Part Number non presente a catalogo: descrizione obbligatoria per crearlo." },
        { status: 400 }
      );
    }
    await db
      .prepare(
        `INSERT INTO Materials (id, code, description, supplier, unit, category, instrument, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(
        newId("mat"),
        materialCode,
        body.description.trim(),
        body.supplier ?? null,
        body.unit ?? "pcs",
        body.category ?? null,
        body.instrument ?? null
      )
      .run();
  }

  const id = newId("stockinv");
  try {
    await db
      .prepare(
        `INSERT INTO StockInventory (id, stock_code, material_code, quantity, min_stock, note)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, body.stock_code, materialCode, body.quantity ?? 0, body.min_stock ?? 0, body.note ?? null)
      .run();
  } catch {
    return NextResponse.json({ error: "Questo Part Number è già presente in questo stock." }, { status: 409 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
