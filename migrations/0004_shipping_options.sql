-- PO Manager — aggiorna i valori ammessi per "shipping" (Spedizione)
-- SQLite non permette di modificare un CHECK esistente con ALTER TABLE:
-- si ricrea la tabella Orders con il nuovo vincolo, preservando tutti i dati.

PRAGMA foreign_keys=OFF;

CREATE TABLE Orders_new (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  requester TEXT NOT NULL,
  requester_id TEXT,
  request_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('Bozza','Inviato','In Lavorazione','Ordinato','Consegnato','Annullato')
  ) DEFAULT 'Inviato',
  delivery_single TEXT NOT NULL CHECK (delivery_single IN ('SI','NO')) DEFAULT 'NO',
  shipping TEXT NOT NULL CHECK (shipping IN ('DHL Collega','Cliente','APIT')) DEFAULT 'DHL Collega',
  stock_code TEXT,
  stock_technician TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (requester_id) REFERENCES Users(id)
);

-- Rimappa i vecchi valori di spedizione sui nuovi (best-effort per eventuali ordini già creati)
INSERT INTO Orders_new (id, order_number, requester, requester_id, request_date, status, delivery_single, shipping, stock_code, stock_technician, notes, created_at, updated_at)
SELECT id, order_number, requester, requester_id, request_date, status, delivery_single,
  CASE shipping
    WHEN 'DHL' THEN 'DHL Collega'
    WHEN 'Collega' THEN 'DHL Collega'
    WHEN 'Altro' THEN 'Cliente'
    ELSE shipping
  END,
  stock_code, stock_technician, notes, created_at, updated_at
FROM Orders;

DROP TABLE Orders;
ALTER TABLE Orders_new RENAME TO Orders;

CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_requester ON Orders(requester);
CREATE INDEX IF NOT EXISTS idx_orders_date ON Orders(request_date);

PRAGMA foreign_keys=ON;
