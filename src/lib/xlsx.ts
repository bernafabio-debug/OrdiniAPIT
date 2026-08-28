import * as XLSX from "xlsx";
import type { OrderWithItems } from "@/lib/types";

export function exportOrderToXlsx(order: OrderWithItems) {
  const rows = order.items.map((it) => ({
    "Numero Ordine": order.order_number,
    Data: order.request_date,
    Richiedente: order.requester,
    Stato: order.status,
    Tipo: it.item_type,
    "Codice Materiale": it.material_code,
    Descrizione: it.material_description,
    Quantità: it.quantity,
    "Unità Misura": it.unit,
    Fornitore: it.supplier ?? "",
    Spedizione: order.shipping,
    "Consegna Unica": order.delivery_single,
    Note: order.notes ?? ""
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 }, { wch: 11 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 36 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
    { wch: 12 }, { wch: 14 }, { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ordine");
  XLSX.writeFile(wb, `${order.order_number}.xlsx`);
}

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
      Fornitore: it.supplier ?? ""
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Storico Ordini");
  XLSX.writeFile(wb, `storico-ordini-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
