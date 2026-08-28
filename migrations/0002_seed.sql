-- PO Manager — dati demo
-- Password utenti demo (da cambiare in produzione):
--   admin@azienda.it  / Admin123!
--   utente@azienda.it / Utente123!

INSERT INTO Users (id, email, name, password_hash, role, active) VALUES
('usr-admin-001', 'admin@azienda.it', 'Amministratore', 'a1b2c3d4e5f60718293a4b5c6d7e8f90:87bc2a891e42774531a50ad74e2e37eff3288d2e31f637d1b4291d0bf79795b8', 'admin', 1),
('usr-user-001', 'utente@azienda.it', 'Mario Rossi', '0f1e2d3c4b5a69788796a5b4c3d2e1f0:d024b08038c186566da9a2f64c79f81eee4d8a57b4d0d1631d7d160ae0668e23', 'user', 1);

INSERT INTO Materials (id, code, description, supplier, unit, category, active) VALUES
('mat-100297', '100297', 'HOSE 2.5 x 4.5 NOVOPRENE', 'GmbH', 'mt', 'Pneumatica', 1),
('mat-93980',  '93980',  'HOSE 3.2x6.4 mm TYGON CHEMICAL', 'GmbH', 'mt', 'Idraulica', 1),
('mat-226660', '226660', 'MAINTENANCE KIT Xsample 200/200HR', 'GmbH', 'pcs', 'Meccanica', 1),
('mat-100310', '100310', 'FILTRO ARIA COMPRESSA 1/4"', 'AirTech Srl', 'pz', 'Pneumatica', 1),
('mat-100322', '100322', 'FILTRO OLIO IDRAULICO HP', 'Hydraulink SpA', 'pz', 'Idraulica', 1),
('mat-100415', '100415', 'CAVO SCHERMATO 4x0.5mm2', 'ElettroForniture', 'mt', 'Elettrico', 1),
('mat-100416', '100416', 'CAVO DATI RS485 TWISTED PAIR', 'ElettroForniture', 'mt', 'Elettrico', 1),
('mat-100501', '100501', 'GUARNIZIONE O-RING NBR 20MM', 'TenutaTech', 'pz', 'Tenute', 1),
('mat-100502', '100502', 'GUARNIZIONE PIATTA PTFE DN50', 'TenutaTech', 'pz', 'Tenute', 1),
('mat-100610', '100610', 'CUSCINETTO A SFERE 6204-2RS', 'BearFast Srl', 'pz', 'Meccanica', 1),
('mat-100611', '100611', 'CUSCINETTO A RULLI CONICI 30205', 'BearFast Srl', 'pz', 'Meccanica', 1),
('mat-100720', '100720', 'GRASSO INDUSTRIALE AL LITIO 400G', 'LubriChem', 'conf', 'Lubrificanti', 1),
('mat-100721', '100721', 'OLIO IDRAULICO ISO VG46 20L', 'LubriChem', 'kit', 'Lubrificanti', 1),
('mat-100830', '100830', 'VALVOLA SOLENOIDE 24V DN15', 'Hydraulink SpA', 'pz', 'Idraulica', 1),
('mat-100831', '100831', 'VALVOLA DI SICUREZZA PRESSIONE 10BAR', 'Hydraulink SpA', 'pz', 'Idraulica', 1),
('mat-100910', '100910', 'SENSORE DI PRESSIONE 4-20MA', 'SensorLine', 'pz', 'Strumentazione', 1),
('mat-100911', '100911', 'TERMOCOPPIA TIPO K 100MM', 'SensorLine', 'pz', 'Strumentazione', 1),
('mat-101020', '101020', 'VITE TCEI M8X30 INOX A2', 'FerramentaPro', 'conf', 'Minuteria', 1),
('mat-101021', '101021', 'NASTRO ISOLANTE ELETTRICO 19MM', 'ElettroForniture', 'pz', 'Elettrico', 1),
('mat-101110', '101110', 'GUANTI PROTETTIVI ANTITAGLIO', 'SafeWork Srl', 'pz', 'DPI', 1),
('mat-101111', '101111', 'OCCHIALI DI PROTEZIONE TRASPARENTI', 'SafeWork Srl', 'pz', 'DPI', 1),
('mat-101200', '101200', 'KIT CALIBRAZIONE BILANCIA ANALITICA', 'Quantatec', 'kit', 'Strumentazione', 1),
('mat-101201', '101201', 'ELETTRODO PH RICAMBIO', 'Quantatec', 'pz', 'Strumentazione', 1),
('mat-101300', '101300', 'CELLA DI CARICO 50KG', 'Torquetec', 'pz', 'Meccanica', 1);

-- Un ordine di esempio già presente nello storico, per popolare la dashboard
INSERT INTO Orders (id, order_number, requester, requester_id, request_date, status, delivery_single, shipping, notes) VALUES
('ord-demo-001', 'PO-2026-000001', 'Mario Rossi', 'usr-user-001', date('now', '-3 days'), 'In Lavorazione', 'NO', 'DHL', 'Ricambi per manutenzione programmata cliente Milano');

INSERT INTO OrderItems (id, order_id, material_code, material_description, quantity, unit, supplier, category, item_type) VALUES
('item-demo-001', 'ord-demo-001', '100297', 'HOSE 2.5 x 4.5 NOVOPRENE', 2, 'mt', 'GmbH', 'Pneumatica', 'Consumabile'),
('item-demo-002', 'ord-demo-001', '226660', 'MAINTENANCE KIT Xsample 200/200HR', 1, 'pcs', 'GmbH', 'Meccanica', 'Consumabile');
