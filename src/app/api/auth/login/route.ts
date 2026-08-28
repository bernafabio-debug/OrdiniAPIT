import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import type { User } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email e password sono obbligatorie." }, { status: 400 });
  }

  const db = getDB();
  const user = await db
    .prepare(`SELECT * FROM Users WHERE email = ? AND active = 1`)
    .bind(email.toLowerCase().trim())
    .first<User & { password_hash: string }>();

  if (!user) {
    return NextResponse.json({ error: "Credenziali non valide." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Credenziali non valide." }, { status: 401 });
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}
