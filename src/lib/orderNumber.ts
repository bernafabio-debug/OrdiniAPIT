import type { D1Database } from "@cloudflare/workers-types";

/**
 * Genera il prossimo numero ordine progressivo nel formato PO-YYYY-000001,
 * basandosi sul conteggio degli ordini già creati per l'anno corrente.
 */
export async function generateOrderNumber(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const result = await db
    .prepare(
      `SELECT order_number FROM Orders
       WHERE order_number LIKE ?
       ORDER BY order_number DESC
       LIMIT 1`
    )
    .bind(`${prefix}%`)
    .first<{ order_number: string }>();

  let nextSeq = 1;
  if (result?.order_number) {
    const parts = result.order_number.split("-");
    const lastSeq = parseInt(parts[2], 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
