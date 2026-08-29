import { NextRequest, NextResponse } from "next/server";
import { getDB, newId } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

// GET /api/users — lista utenti (solo admin)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const db = getDB();
  const { results } = await db
    .prepare(`SELECT id, email, name, role, active, created_at FROM Users ORDER BY created_at DESC`)
    .all<User>();

  return NextResponse.json({ users: results ?? [] });
}

// POST /api/users — crea un nuovo utente (solo admin)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Permesso negato." }, { status: 403 });

  const body = (await req.json()) as {
    email?: string;
    name?: string;
    password?: string;
    role?: "user" | "admin";
  };

  if (!body.email || !body.name || !body.password) {
    return NextResponse.json({ error: "Email, nome e password sono obbligatori." }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
  }

  const db = getDB();
  const id = newId("usr");
  const passwordHash = await hashPassword(body.password);

  try {
    await db
      .prepare(
        `INSERT INTO Users (id, email, name, password_hash, role, active)
         VALUES (?, ?, ?, ?, ?, 1)`
      )
      .bind(id, body.email.toLowerCase().trim(), body.name.trim(), passwordHash, body.role ?? "user")
      .run();
  } catch {
    return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
