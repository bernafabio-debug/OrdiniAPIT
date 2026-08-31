import { NextRequest, NextResponse } from "next/server";
import { getDB, newId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/orderNumber";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

// GET /api/orders?orderNumber=&date=&status=&material=&supplier=&requester=&q=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber") ?? "";
  const date = searchParams.get("date") ?? "";
  const status = searchParams.get("status") ?? "";
  const material = searchParams.get("material") ?? "";
  const supplier = searchParams.get("supplier") ?? "";
  const requester = searchParams.get("requester") ?? "";
  const q = searchParams.get("q") ?? "";

  const db = getDB();
  let sql = `
    SELECT DISTINCT o.* FROM Orders o
    LEFT JOIN OrderItems i ON i.order_id = o.id
    WHERE 1=1
  `;
  const p: (string | number)[] = [];

  // Un utente "user" vede solo i propri ordini; l'admin li vede tutti
  if (session.role !== "admin") {
    sql += ` AND o.requester_id = ?`;
    p.push(session.sub);
  }
  if (orderNumber) { sql += ` AND o.order_number LIKE ?`; p.push(`%${orderNumber}%`); }
  if (date) { sql += ` AND o.request_date = ?`; p.push(date); }
  if (status) { sql += ` AND o.status = ?`; p.push(status); }
  if (requester) { sql += ` AND o.requester LIKE ?`; p.push(`%${requester}%`); }
  if (material) { sql += ` AND i.material_code LIKE ?`; p.push(`%${material}%`); }
  if (supplier) { sql += ` AND i.supplier LIKE ?`; p.push(`%${supplier}%`); }
  if (q) {
    sql += ` AND (o.order_number LIKE ? OR o.requester LIKE ? OR o.notes LIKE ? OR i.material_description LIKE ?)`;
    p.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY o.created_at DESC LIMIT 300`;

  const { results: orders } = await db.prepare(sql).bind(...p).all<Order>();

  // Carica le righe materiale per ogni ordine trovato
  const withItems = await Promise.all(
    (orders ?? []).map(async (o) => {
      const { results: items } = await db
        .prepare(`SELECT * FROM OrderItems WHERE order_id = ?`)
        .bind(o.id)
        .all<OrderItem>();
      return { ...o, items: items ?? [] };
    })
  );

  return NextResponse.json({ orders: withItems });
}

// POST /api/orders — crea un nuovo ordine con una o più righe materiale
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const body = (await req.json()) as {
    request_date: string;
    delivery_single: "SI" | "NO";
    shipping: "DHL" | "Collega" | "Altro";
    stock_code?: string;
    stock_technician?: string;
    notes?: string;
    status?: OrderStatus;
    items: Array<{
      material_code: string;
      material_description: string;
      quantity: number;
      unit: string;
      supplier?: string;
      category?: string;
      item_type: "Consumabile" | "Tool" | "Asset";
    }>;
  };

  if (!body.request_date || !body.stock_code || !body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Data, stock e almeno una riga materiale sono obbligatorie." }, { status: 400 });
  }

  const db = getDB();

  try {
    const orderId = newId("ord");
    const orderNumber = await generateOrderNumber(db);
    const status = body.status ?? "Inviato";

    const statements = [
      db
        .prepare(
          `INSERT INTO Orders
           (id, order_number, requester, requester_id, request_date, status, delivery_single, shipping, stock_code, stock_technician, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          orderId,
          orderNumber,
          session.name,
          session.sub,
          body.request_date,
          status,
          body.delivery_single ?? "NO",
          body.shipping ?? "DHL Collega",
          body.stock_code,
          body.stock_technician ?? null,
          body.notes ?? null
        ),
      ...body.items.map((it) =>
        db
          .prepare(
            `INSERT INTO OrderItems
             (id, order_id, material_code, material_description, quantity, unit, supplier, category, item_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            newId("item"),
            orderId,
            it.material_code,
            it.material_description,
            it.quantity,
            it.unit,
            it.supplier ?? null,
            it.category ?? null,
            it.item_type
          )
      )
    ];

    await db.batch(statements);

    return NextResponse.json({ id: orderId, order_number: orderNumber }, { status: 201 });
  } catch (err) {
    console.error("Errore creazione ordine:", err);
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json(
      { error: `Impossibile salvare l'ordine sul database: ${message}` },
      { status: 500 }
    );
  }
}
