import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

// PATCH /api/users/:id — attiva/disattiva, cambia ruolo o resetta password (solo admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { active?: number; role?: "user" | "admin"; password?: string };

  const db = getDB();

  if (typeof body.active === "number") {
    await db.prepare(`UPDATE Users SET active = ? WHERE id = ?`).bind(body.active, id).run();
  }
  if (body.role) {
    await db.prepare(`UPDATE Users SET role = ? WHERE id = ?`).bind(body.role, id).run();
  }
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
    }
    const hash = await hashPassword(body.password);
    await db.prepare(`UPDATE Users SET password_hash = ? WHERE id = ?`).bind(hash, id).run();
  }

  return NextResponse.json({ ok: true });
}
