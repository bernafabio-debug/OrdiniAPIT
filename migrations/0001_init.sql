-- PO Manager — schema iniziale per Cloudflare D1

CREATE TABLE IF NOT EXISTS Users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  supplier TEXT,
  unit TEXT NOT NULL DEFAULT 'pz',
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  requester TEXT NOT NULL,
  requester_id TEXT,
  request_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('Bozza','Inviato','In Lavorazione','Ordinato','Consegnato','Annullato')
  ) DEFAULT 'Inviato',
  delivery_single TEXT NOT NULL CHECK (delivery_single IN ('SI','NO')) DEFAULT 'NO',
  shipping TEXT NOT NULL CHECK (shipping IN ('DHL','Collega','Altro')) DEFAULT 'DHL',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (requester_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS OrderItems (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  material_code TEXT NOT NULL,
  material_description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  supplier TEXT,
  category TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('Consumabile','Tool','Asset')) DEFAULT 'Consumabile',
  FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_materials_code ON Materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_active ON Materials(active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_requester ON Orders(requester);
CREATE INDEX IF NOT EXISTS idx_orders_date ON Orders(request_date);
CREATE INDEX IF NOT EXISTS idx_orderitems_order ON OrderItems(order_id);
CREATE INDEX IF NOT EXISTS idx_orderitems_material ON OrderItems(material_code);
