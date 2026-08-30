import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { OrderWithItems } from "@/lib/types";

// ---------- Export ordine: replica esatta del template "Richiesta PO" per l'ufficio amministrazione / SAP ----------
// Layout, colori e font ricalcano il file Excel originale usato in azienda prima di questa app.
// Colonne: A Consumabile?(Tipo) · B I (non usata) · C Material(Part Number) · D Short Text(Descrizione)
// E Qty Requested by FSE(Quantità) · F Unit · G vuota · H Date · I price(vuota, la compila l'ufficio)
// J-N 5 colonne vuote · O Storage Location(Stock) · P Qty shipped from APIT(vuota, la compila l'ufficio)
// Q/R Fornitore (riga1) · Q/R Spedizione (riga2) · Q/R/S Split Delivery (riga3)

const THIN = { style: "thin" as const };
const BOX_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const YELLOW_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
const FONT = { name: "Calibri", size: 11 };

function fmtDateForSap(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function exportOrderToXlsx(order: OrderWithItems) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("PO");

  // Larghezze colonne (replicano il file originale)
  const widths: Record<string, number> = {
    A: 14, B: 4.44, C: 13, D: 40.78, E: 20.44, F: 5.11, G: 4,
    H: 11.66, I: 7.55, J: 4.55, O: 18.11, P: 21.11, Q: 11.66, R: 19.78, S: 9.66
  };
  const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"];
  colLetters.forEach((letter, idx) => {
    ws.getColumn(idx + 1).width = widths[letter] ?? 8.43;
  });
  ws.getRow(1).height = 19.2;

  // ---- Intestazioni riga 1 (colonne A-P, bordo sottile, font Calibri 11) ----
  const headers: Record<string, string> = {
    A1: "Consumabile?", B1: "I", C1: "Material", D1: "Short Text",
    E1: "Qty Requested by FSE", F1: "Unit", H1: "Date", I1: "price",
    O1: "Storage Location", P1: "Qty shipped from APIT"
  };
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"].forEach((col) => {
    const cell = ws.getCell(`${col}1`);
    cell.font = FONT;
    cell.border = BOX_BORDER;
    if (headers[`${col}1`]) cell.value = headers[`${col}1`];
  });
  ws.getCell("A1").alignment = { wrapText: true };

  // ---- Fornitore (Q1/R1) — usa il fornitore del primo materiale dell'ordine ----
  const fornitore = order.items[0]?.supplier ?? "";
  ws.getCell("Q1").value = "Fornitore";
  ws.getCell("Q1").font = { ...FONT, bold: true };
  ws.getCell("R1").value = fornitore;
  ws.getCell("R1").font = { ...FONT, bold: true };
  ws.getCell("R1").alignment = { wrapText: true };

  // ---- Spedizione (Q2/R2) ----
  ws.getCell("Q2").value = "Spedizione: ";
  ws.getCell("Q2").font = { ...FONT, bold: true };
  ws.getCell("R2").value = order.shipping;
  ws.getCell("R2").font = { ...FONT, bold: true };

  // ---- Split Delivery (Q3/R3/S3) ----
  ws.getCell("Q3").value = "Indicare se";
  ws.getCell("Q3").font = FONT;
  ws.getCell("R3").value = "NO SPLIT DELIVERY!";
  ws.getCell("R3").font = { ...FONT, bold: true };
  ws.getCell("S3").value = order.delivery_single;
  ws.getCell("S3").font = FONT;

  // ---- Righe materiale (almeno 2, come nel file originale, per lasciare spazio a Spedizione/Split Delivery) ----
  const rowCount = Math.max(order.items.length, 2);
  const dataCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
  const YELLOW_COLS = ["A", "C", "E", "H", "O", "P"];

  for (let i = 0; i < rowCount; i++) {
    const rowNum = i + 2;
    const item = order.items[i];

    dataCols.forEach((col) => {
      const cell = ws.getCell(`${col}${rowNum}`);
      cell.font = FONT;
      cell.border = BOX_BORDER;
      if (YELLOW_COLS.includes(col)) cell.fill = YELLOW_FILL;
    });

    if (item) {
      ws.getCell(`A${rowNum}`).value = item.item_type;
      ws.getCell(`C${rowNum}`).value = item.material_code;
      ws.getCell(`D${rowNum}`).value = item.material_description;
      ws.getCell(`E${rowNum}`).value = item.quantity;
      ws.getCell(`F${rowNum}`).value = item.unit;
    }
    ws.getCell(`H${rowNum}`).value = fmtDateForSap(order.request_date);
    ws.getCell(`H${rowNum}`).numFmt = "mm-dd-yy";
    ws.getCell(`O${rowNum}`).value = order.stock_code ?? "";
    // I (price) e P (Qty shipped from APIT) restano vuote: le compila l'ufficio amministrazione
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer as ArrayBuffer, `${order.order_number}_Richiesta_PO.xlsx`);
}

function downloadBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Export storico ordini: elenco semplice multi-ordine (non collegato al processo SAP) ----------
export function exportOrdersListToXlsx(orders: OrderWithItems[]) {
  const rows = orders.flatMap((order) =>
    order.items.map((it) => ({
      "Numero Ordine": order.order_number,
      Data: order.request_date,
      Richiedente: order.requester,
      Stato: order.status,
      "Codice Materiale": it.material_code,
      Descrizione: it.material_description,
      Quantità: it.quantity,
      "Unità Misura": it.unit,
      Fornitore: it.supplier ?? "",
      "Stock (Tecnico)": order.stock_technician ?? "",
      "Stock (Codice)": order.stock_code ?? ""
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Storico Ordini");
  XLSX.writeFile(wb, `storico-ordini-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
