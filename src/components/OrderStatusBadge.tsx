import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  Bozza: "bg-gray-100 text-gray-600",
  Inviato: "bg-blue-100 text-blue-700",
  "In Lavorazione": "bg-amber-100 text-amber-700",
  Ordinato: "bg-purple-100 text-purple-700",
  Consegnato: "bg-green-100 text-green-700",
  Annullato: "bg-red-100 text-red-700"
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STYLES[status]}`}>{status}</span>;
}
