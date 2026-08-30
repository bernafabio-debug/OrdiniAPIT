export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface Material {
  id: string;
  code: string;
  description: string;
  supplier: string | null;
  unit: string;
  category: string | null;
  active: number;
  created_at: string;
}

export const SUPPLIERS = ["GmbH", "Provetec", "Optotec", "Quantatec", "Torquetec", "Tritec"];
export const MATERIAL_UNITS = ["pcs", "mt"];

export interface StockLocation {
  id: string;
  technician_name: string;
  code: string;
  active: number;
  created_at: string;
}

export type OrderStatus =
  | "Bozza"
  | "Inviato"
  | "In Lavorazione"
  | "Ordinato"
  | "Consegnato"
  | "Annullato";

export type ItemType = "Consumabile" | "Tool" | "Asset";
export type ShippingMethod = "DHL Collega" | "Cliente" | "APIT";

export interface OrderItem {
  id: string;
  order_id: string;
  material_code: string;
  material_description: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  category: string | null;
  item_type: ItemType;
}

export interface Order {
  id: string;
  order_number: string;
  requester: string;
  requester_id: string | null;
  request_date: string;
  status: OrderStatus;
  delivery_single: "SI" | "NO";
  shipping: ShippingMethod;
  stock_code: string | null;
  stock_technician: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export const ORDER_STATUSES: OrderStatus[] = [
  "Bozza",
  "Inviato",
  "In Lavorazione",
  "Ordinato",
  "Consegnato",
  "Annullato"
];

export const ITEM_TYPES: ItemType[] = ["Consumabile", "Tool", "Asset"];
export const SHIPPING_METHODS: ShippingMethod[] = ["DHL Collega", "Cliente", "APIT"];
