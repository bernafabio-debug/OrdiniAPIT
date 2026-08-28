import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrderWithItems } from "@/lib/types";

export function exportOrderToPdf(order: OrderWithItems) {
  const doc = new jsPDF();

  // Placeholder logo aziendale (sostituire con il logo reale, es. doc.addImage(...))
  doc.setFillColor(37, 100, 207);
  doc.rect(14, 12, 10, 10, "F");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("LOGO", 15.5, 18.5);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(16);
  doc.text("Richiesta ordine materiale", 30, 18);
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(order.order_number, 30, 24);

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const infoY = 34;
  doc.text(`Data: ${order.request_date}`, 14, infoY);
  doc.text(`Richiedente: ${order.requester}`, 14, infoY + 6);
  doc.text(`Stato: ${order.status}`, 14, infoY + 12);
  doc.text(`Spedizione: ${order.shipping}`, 110, infoY);
  doc.text(`Consegna unica: ${order.delivery_single}`, 110, infoY + 6);

  autoTable(doc, {
    startY: infoY + 20,
    head: [["Tipo", "Codice", "Descrizione", "Qtà", "Unità", "Fornitore"]],
    body: order.items.map((it) => [
      it.item_type,
      it.material_code,
      it.material_description,
      String(it.quantity),
      it.unit,
      it.supplier ?? ""
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 100, 207] }
  });

  // @ts-expect-error - lastAutoTable viene aggiunto dinamicamente dal plugin autotable
  const finalY = doc.lastAutoTable.finalY || infoY + 20;
  doc.setFontSize(10);
  doc.text(`Totale righe materiale: ${order.items.length}`, 14, finalY + 10);

  if (order.notes) {
    doc.text("Note:", 14, finalY + 18);
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(order.notes, 180), 14, finalY + 24);
  }

  doc.save(`${order.order_number}.pdf`);
}
