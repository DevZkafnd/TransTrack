# TransTrack Backend (Microservices)

Kumpulan service Express yang terhubung PostgreSQL dan terdokumentasi Swagger.

## Service yang tersedia

- **GatewayService (8000)** - API Gateway sebagai entry point tunggal untuk frontend
- RouteService (3000)
- DriverService (3001)
- UserService (3002)
- MaintenanceService (3003)
- TicketService (3004)

## Menjalankan semua service (via root)

Dari folder root monorepo:

```bash
npm run dev
```

Ini akan menjalankan semua service secara paralel termasuk GatewayService. TicketService akan otomatis menjalankan migrasi tabel `tickets` saat start.

**Catatan Penting:**
- Frontend sekarang mengakses semua service melalui GatewayService (port 8000)
- GatewayService meneruskan request ke service-service backend yang sesuai
- TicketService memvalidasi user dengan memanggil UserService sebelum membuat tiket (inter-service communication)

## Menjalankan salah satu service

```bash
cd backend/<nama-service>
npm install
cp env.example .env
npm run dev
```

Pastikan `.env` terisi koneksi PostgreSQL:

```env
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transtrack_db
DB_SSL=false
```

## Dependensi utama per service

- express, cors, dotenv
- pg, node-pg-migrate
- swagger-jsdoc, swagger-ui-express
- nodemon (dev)

## Membuat Provider/API Baru (contoh: PaymentService)

1) Buat folder: `backend/paymentservice/`

2) package.json

Contoh minimal (samakan versi dependensi dengan service lain):

```json
{
  "name": "paymentservice",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "node-pg-migrate": "^8.0.3",
    "pg": "^8.16.3",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": { "nodemon": "^3.0.2" }
}
```

3) Struktur file inti

- `server.js` (Express + swagger + routes)
- `config/db.js` (Pool PostgreSQL)
- `config/swagger.js` (swaggerJsdoc setup)
- `routes/*.js` (endpoint bisnis)
- `env.example` (PORT, DB_*)
- `scripts/migrate.js` (DDL tabel)

Contoh `server.js`:

```js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes/payment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.get('/health', (req,res)=>res.json({status:'OK',service:'PaymentService'}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/payment', routes);
app.listen(PORT, ()=>console.log(`PaymentService :${PORT}`));
```

Contoh `config/db.js`:

```js
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'transtrack_db',
  ssl: String(process.env.DB_SSL || 'false') === 'true' ? { rejectUnauthorized:false } : false
});
module.exports = { pool };
```

Contoh `config/swagger.js`:

```js
const swaggerJsdoc = require('swagger-jsdoc');
const options = { definition: { openapi:'3.0.0', info:{ title:'PaymentService', version:'1.0.0' } }, apis:['./routes/*.js'] };
module.exports = swaggerJsdoc(options);
```

Contoh `routes/payment.js` dengan Swagger JSDoc:

```js
const router = require('express').Router();
const { pool } = require('../config/db');
/**
 * @swagger
 * /api/payment:
 *   post:
 *     summary: "Contoh proses pembayaran"
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId: { type: string }
 *               amount: { type: number }
 *     responses:
 *       201:
 *         description: Dibuat
 */
router.post('/', async (req,res)=>{
  const { orderId, amount } = req.body;
  // contoh simpan ke DB
  await pool.query('SELECT 1');
  res.status(201).json({ success:true, message:'ok' });
});
module.exports = router;
```

4) `env.example`

```env
PORT=3005
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transtrack_db
DB_SSL=false
```

5) `scripts/migrate.js` (DDL)

```js
const { pool } = require('../config/db');
(async ()=>{
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await pool.query('CREATE TABLE IF NOT EXISTS payments (id uuid primary key default gen_random_uuid(), order_id text, amount numeric(12,2), created_at timestamptz default now());');
    console.log('Migration OK');
  } catch(e){ console.error(e); process.exit(1); } finally { await pool.end(); }
})();
```

6) Wire ke root monorepo

- `package.json` (root) → tambahkan skrip:

```json
{
  "scripts": {
    "dev:paymentservice": "cross-env PORT=3005 npm --prefix backend/paymentservice start",
    "dev": "concurrently \"...service lain...\" \"npm run dev:paymentservice\""
  }
}
```

Opsional: tambahkan `migrate:paymentservice` di root dan panggil dari `predev` jika perlu.

7) Jalankan & uji

```bash
npm run dev
# Swagger: http://localhost:3005/api-docs
```

---

Tips:

- Gunakan parameterized queries (`$1, $2, ...`) untuk cegah SQL injection.
- Simpan secret di `.env`. Jangan commit `.env` ke repository.
- Pastikan setiap service punya `health` endpoint untuk diagnosa cepat.

---

## Langkah-Langkah Detail (Checklist Praktis)

0) Siapkan database PostgreSQL (sekali saja)

```
createdb transtrack_db
```

1) Buat folder service baru

```
mkdir backend/paymentservice
```

2) Inisialisasi package.json dan install dependensi

```
cd backend/paymentservice
npm init -y
npm i express cors dotenv pg node-pg-migrate swagger-jsdoc swagger-ui-express
npm i -D nodemon
```

3) Buat file konfigurasi dan server

- `config/db.js`: koneksi Pool PostgreSQL (lihat contoh di atas)
- `config/swagger.js`: setup swaggerJsdoc (lihat contoh)
- `server.js`: daftarkan `/health`, `/api-docs`, dan router bisnis

4) Buat router bisnis

- `routes/payment.js`: definisikan endpoint dengan komentar Swagger JSDoc
- Gunakan parameterized query saat akses DB (`$1, $2, ...`)

5) Buat migrasi sederhana

- `scripts/migrate.js`: buat tabel yang diperlukan (contoh: `payments`)
- Jalankan migrasi secara manual (opsional) atau otomatis via root `predev`

6) Tambahkan `env.example`

```
PORT=3005
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transtrack_db
DB_SSL=false
```

7) Sambungkan ke monorepo (root `package.json`)

- Tambah skrip:

```
"dev:paymentservice": "cross-env PORT=3005 npm --prefix backend/paymentservice start"
```

- Masukkan ke skrip `dev` (concurrently) agar jalan bersama service lain
- (Opsional) Tambah `migrate:paymentservice` dan panggil di `predev`

8) Menjalankan service

- Dari root: `npm run dev` (direkomendasikan)
- Atau dari folder service: `npm run dev`

9) Uji via Swagger UI

- Buka `http://localhost:3005/api-docs`
- Klik "Try it out" → isi body → Execute

10) Deployment/dev tips

- CORS: batasi origin saat production
- Logging: gunakan level log dan jangan print secret
- Error handling: kembalikan format respons konsisten `{ success, error, message }`

