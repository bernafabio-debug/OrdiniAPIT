import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { Material } from "@/lib/types";

export const runtime = "edge";

// PUT /api/materials/:id — modifica un materiale (solo admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as Partial<Material>;

  const db = getDB();
  await db
    .prepare(
      `UPDATE Materials
       SET code = ?, description = ?, supplier = ?, unit = ?, category = ?
       WHERE id = ?`
    )
    .bind(body.code, body.description, body.supplier ?? null, body.unit ?? "pz", body.category ?? null, id)
    .run();

  return NextResponse.json({ ok: true });
}

// PATCH /api/materials/:id — attiva/disattiva un materiale (solo admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { active?: number };

  const db = getDB();
  await db
    .prepare(`UPDATE Materials SET active = ? WHERE id = ?`)
    .bind(body.active ? 1 : 0, id)
    .run();

  return NextResponse.json({ ok: true });
}

// DELETE /api/materials/:id — elimina definitivamente (solo admin, sconsigliato: preferire disattivazione)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const db = getDB();
  await db.prepare(`DELETE FROM Materials WHERE id = ?`).bind(id).run();

  return NextResponse.json({ ok: true });
}
