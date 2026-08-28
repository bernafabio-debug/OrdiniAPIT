# PO Manager

Applicazione aziendale per la gestione delle richieste di acquisto materiali (Purchase Order), in sostituzione del processo attualmente basato su Excel.

Stack: **Next.js 15 (App Router) · React · TypeScript · Tailwind CSS · Cloudflare Workers (via OpenNext) · Cloudflare D1**

---

## 1. Architettura

```
Browser (utente)
   │  HTTPS
   ▼
Cloudflare Worker (Next.js via @opennextjs/cloudflare)
   ├─ Route Handlers (/api/*)  → logica applicativa
   ├─ Middleware               → protezione rotte + verifica sessione
   ├─ Server/Client Components → pagine React
   └─ Binding D1 (env.DB)      → database SQL
              │
              ▼
   Cloudflare D1 (SQLite distribuito)
   Tabelle: Users · Materials · Orders · OrderItems
```

**Autenticazione**: login semplice email + password. Le password sono salvate con hash **PBKDF2-SHA256** (Web Crypto API, nessuna libreria esterna). La sessione è un cookie HttpOnly firmato con HMAC-SHA256 (equivalente a un JWT "fatto in casa", senza dipendenze). Come alternativa più "enterprise", il progetto è compatibile con **Cloudflare Access**: basta attivarlo sul dominio in Cloudflare Zero Trust e rimuovere/adattare la pagina di login (vedi sezione 8).

**Autorizzazioni**: ruolo `user` (crea ordini, vede solo i propri) e `admin` (vede tutti gli ordini, gestisce catalogo materiali, cambia stato ordini, gestisce utenti). Il controllo avviene sia nel middleware (pagine) sia in ogni API route (dati).

**Export**: PDF ed Excel sono generati **lato client** (jsPDF + SheetJS), senza bisogno di funzioni serverless dedicate: click → file scaricato direttamente nel browser.

---

## 2. Struttura cartelle

```
po-manager/
├── migrations/
│   ├── 0001_init.sql         → schema tabelle D1
│   └── 0002_seed.sql         → dati demo (utenti, materiali, un ordine)
├── src/
│   ├── app/
│   │   ├── layout.tsx, globals.css, page.tsx (redirect / → dashboard|login)
│   │   ├── login/page.tsx
│   │   ├── (app)/layout.tsx  → layout con sidebar, protetto
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── materiali/page.tsx
│   │   │   ├── ordini/nuovo/page.tsx
│   │   │   ├── ordini/page.tsx
│   │   │   └── admin/page.tsx
│   │   └── api/
│   │       ├── auth/{login,logout,me}/route.ts
│   │       ├── materials/route.ts + [id]/route.ts
│   │       ├── orders/route.ts + [id]/route.ts
│   │       ├── users/route.ts + [id]/route.ts
│   │       └── stats/route.ts
│   ├── components/           → Sidebar, MaterialAutocomplete, Charts, ecc.
│   ├── lib/                  → db.ts, auth.ts, types.ts, orderNumber.ts, pdf.ts, xlsx.ts
│   └── middleware.ts         → protezione rotte
├── wrangler.toml              → configurazione Cloudflare (binding D1)
├── open-next.config.ts
├── package.json
└── README.md                  → questo file
```

---

## 3. Stati ordine

`Bozza → Inviato → In Lavorazione → Ordinato → Consegnato` (oppure `Annullato` in qualsiasi momento). Solo l'admin può cambiare stato, dallo Storico Ordini.

---

## 4. Utenti demo (dati seed)

| Email | Password | Ruolo |
|---|---|---|
| admin@azienda.it | Admin123! | Amministratore |
| utente@azienda.it | Utente123! | Utente |

**Cambiare queste password reali prima di andare in produzione**, oppure eliminare gli utenti demo dalla tabella `Users` dopo aver creato i vostri account reali dalla sezione Amministrazione.

---

## 5. Deployment passo-passo (da zero)

### Prerequisiti
- Un account Cloudflare (gratuito va bene per iniziare)
- Node.js 20+ installato sul computer da cui fate il deploy
- Un account GitHub (facoltativo ma consigliato, vedi sezione 6)

### Passo 1 — Installare le dipendenze
```bash
cd po-manager
npm install
```

### Passo 2 — Login a Cloudflare da terminale
```bash
npx wrangler login
```
Si apre il browser: autorizzate l'accesso al vostro account Cloudflare.

### Passo 3 — Creare il database D1
```bash
npx wrangler d1 create po_manager_db
```
Il comando restituisce un blocco tipo:
```toml
[[d1_databases]]
binding = "DB"
database_name = "po_manager_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Copiate il valore di `database_id` e incollatelo in `wrangler.toml`, sostituendo `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### Passo 4 — Applicare lo schema e i dati demo
```bash
npm run db:migrate:remote
```
Questo esegue `0001_init.sql` (crea le tabelle) e `0002_seed.sql` (inserisce utenti demo e catalogo materiali) direttamente sul database in produzione.

Per lavorare in locale prima del deploy potete anche usare:
```bash
npm run db:migrate:local
npm run dev
```
(l'ambiente locale usa un D1 simulato su disco, nessun dato reale viene toccato)

### Passo 5 — Impostare il secret per le sessioni
```bash
npx wrangler secret put SESSION_SECRET
```
Quando richiesto, incollate una stringa lunga e casuale (es. generata con `openssl rand -base64 32`). Questo sostituisce il valore di default presente in `wrangler.toml`, che **non va usato in produzione**.

### Passo 6 — Build e deploy
```bash
npm run cf:deploy
```
Questo comando:
1. compila l'app Next.js,
2. la trasforma in un Worker Cloudflare tramite OpenNext,
3. la pubblica.

Al termine, Wrangler stampa l'URL pubblico (es. `https://po-manager.<tuo-account>.workers.dev`). L'app è online e già collegata al database D1.

### Passo 7 — Dominio personalizzato (facoltativo)
Da Cloudflare Dashboard → Workers & Pages → po-manager → Settings → Domains & Routes, aggiungete il vostro dominio o sottodominio aziendale (es. `po.vostraazienda.it`), se già gestito su Cloudflare.

---

## 6. Collegare GitHub per deploy automatici (facoltativo ma consigliato)

1. Create un repository su GitHub e caricate il progetto:
   ```bash
   git init
   git add .
   git commit -m "PO Manager - versione iniziale"
   git branch -M main
   git remote add origin https://github.com/<vostro-utente>/po-manager.git
   git push -u origin main
   ```
2. Su **Cloudflare Dashboard → Workers & Pages → Create → Connect to Git**, selezionate il repository appena creato.
3. Impostate:
   - **Build command**: `npm run cf:build`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `/` (o la cartella del progetto se in un monorepo)
4. In **Settings → Variables and Secrets**, aggiungete `SESSION_SECRET` con lo stesso valore usato al passo 5, e verificate che il binding D1 sia collegato (Settings → Bindings → D1 Database).
5. Da questo momento, ogni `git push` sul branch `main` pubblica automaticamente una nuova versione.

---

## 7. Come aggiungere/modificare campi o categorie del catalogo

Il catalogo materiali si gestisce interamente dall'interfaccia (sezione **Catalogo Materiali**, solo utenti admin): aggiunta, modifica, disattivazione. Non serve toccare codice o database a mano per la gestione ordinaria.

Per importazioni massive iniziali di un catalogo esistente (es. da Excel/SAP), il modo più rapido è generare istruzioni SQL `INSERT INTO Materials (...)` a partire dal vostro file e lanciarle con:
```bash
npx wrangler d1 execute po_manager_db --remote --file=./migrations/mio_import.sql
```

---

## 8. Alternativa: autenticazione con Cloudflare Access

Se preferite non gestire utenti/password nel database e affidarvi al login aziendale già esistente (Google Workspace, Microsoft Entra ID, ecc.):

1. Attivate **Cloudflare Zero Trust → Access → Applications**, create una nuova applicazione puntando al dominio del Worker.
2. Configurate il provider di identità (Google/Microsoft/email OTP).
3. Nel codice, il middleware (`src/middleware.ts`) può essere semplificato leggendo l'header `Cf-Access-Authenticated-User-Email` iniettato automaticamente da Cloudflare Access al posto del cookie di sessione custom — in questo caso le route `/api/auth/*` e la tabella `password_hash` non servono più; basterebbe mappare l'email autenticata a un utente esistente nella tabella `Users` per ottenere ruolo/nome.

Questo progetto include già la versione "login semplice" perché è autonoma e non richiede configurazioni esterne per essere provata subito.

---

## 9. Istruzioni per un utente non tecnico (uso quotidiano)

**Come creare un ordine:**
1. Aprite il link dell'app (fornito dal responsabile IT) e accedete con email e password.
2. Cliccate **Nuovo Ordine** nel menu a sinistra.
3. Compilate data, spedizione e consegna unica.
4. Nel campo materiale, digitate almeno 2-3 lettere del codice o della descrizione: appare un elenco, cliccate quello giusto e i campi si compilano da soli.
5. Indicate quantità e tipo (Consumabile/Tool/Asset).
6. Per aggiungere un altro materiale allo stesso ordine, cliccate **+ Aggiungi riga**.
7. Cliccate **Genera ordine**: l'ordine appare subito nello Storico con un numero progressivo (es. `PO-2026-000004`).

**Come scaricare un ordine in PDF o Excel:**
Nella sezione **Storico Ordini**, ogni riga ha i pulsanti **PDF** ed **Excel**: un click scarica il file, pronto da allegare a una mail o stampare.

**Se non trovate un materiale nell'elenco:**
Segnalatelo a chi ha accesso come Amministratore: può aggiungerlo dalla sezione **Catalogo Materiali → + Nuovo materiale** in pochi secondi.

**Se dimenticate la password:**
Chiedete a un Amministratore di reimpostarvela dalla sezione **Amministrazione** (non esiste ancora un self-service "password dimenticata": può essere aggiunto in un secondo momento con un servizio email, es. Resend o Cloudflare Email Workers).

---

## 10. Limiti noti / possibili estensioni future

- Nessun invio email automatico (conferma ordine, notifica cambio stato): integrabile con Cloudflare Email Workers o un servizio come Resend.
- Nessun "password dimenticata" self-service: al momento la reimpostazione password è manuale da parte di un admin.
- Il logo nel PDF è un placeholder: sostituitelo in `src/lib/pdf.ts` con `doc.addImage(...)` passando il logo reale in base64.
- L'associazione codice→fornitore/unità di misura nell'autocomplete si aggiorna automaticamente in base a cosa è impostato nel Catalogo Materiali: mantenere il catalogo pulito è la base per un buon funzionamento del form.
