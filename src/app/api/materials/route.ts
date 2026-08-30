import { NextRequest, NextResponse } from "next/server";
import { getDB, newId } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Material } from "@/lib/types";

// GET /api/materials?q=filtro&category=Elettrico&supplier=GmbH&active=1
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? "";
  const supplier = searchParams.get("supplier") ?? "";
  const activeParam = searchParams.get("active"); // "1" | "0" | null (tutti)

  const db = getDB();
  let sql = `SELECT * FROM Materials WHERE 1=1`;
  const params: (string | number)[] = [];

  if (q) {
    sql += ` AND (code LIKE ? OR description LIKE ? OR supplier LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (supplier) {
    sql += ` AND supplier = ?`;
    params.push(supplier);
  }
  if (activeParam === "1" || activeParam === "0") {
    sql += ` AND active = ?`;
    params.push(Number(activeParam));
  }
  sql += ` ORDER BY code ASC LIMIT 200`;

  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<Material>();

  return NextResponse.json({ materials: results ?? [] });
}

// POST /api/materials — crea un nuovo materiale (solo admin)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const body = (await req.json()) as Partial<Material>;
  if (!body.code || !body.description) {
    return NextResponse.json({ error: "Codice e descrizione sono obbligatori." }, { status: 400 });
  }

  const db = getDB();
  const id = newId("mat");
  try {
    await db
      .prepare(
        `INSERT INTO Materials (id, code, description, supplier, unit, category, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(id, body.code.trim(), body.description.trim(), body.supplier ?? null, body.unit ?? "pcs", body.category ?? null)
      .run();
  } catch (e) {
    return NextResponse.json({ error: "Codice materiale già esistente." }, { status: 409 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
