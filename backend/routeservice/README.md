# 🛣️ RouteService

<div align="center">

**API Provider untuk Mengelola Data Master Rute dan Halte**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

**Port:** `3000` | **Base URL:** `http://localhost:3000`

</div>

---

## 📑 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [⚙️ Setup](#️-setup)
- [🌐 API Endpoints](#-api-endpoints)
- [📊 Database Schema](#-database-schema)
- [🧪 Testing](#-testing)
- [🔧 Development](#-development)
- [📝 Migration](#-migration)
- [❌ Error Handling](#-error-handling)

---

## 🚀 Quick Start

### Setup & Run (Satu Perintah)

```bash
# Setup lengkap dan jalankan server
npm run setup:full && npm run dev
```

Atau secara terpisah:

```bash
# 1. Setup lengkap (install deps, setup .env, run migrations)
npm run setup:full

# 2. Run server (auto-check dependencies & .env)
npm run dev
```

**Server akan berjalan di `http://localhost:3000`**

### Setup Manual (Jika Perlu)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment (otomatis dibuat dari env.example jika belum ada)
# File .env akan dibuat otomatis saat npm run dev atau npm run setup:full

# 3. Setup database
npm run setup

# 4. Run server
npm run dev
```

---

## ⚙️ Setup

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Konfigurasi Environment

Copy file `env.example` menjadi `.env`:

```bash
cp env.example .env
```

Edit file `.env` dan sesuaikan:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=                # Boleh kosong untuk trust auth
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transtrack_db
DB_SSL=false
```

### 3️⃣ Setup Database

**Jalankan migration:**

```bash
npm run migrate
```

Migration akan:
- ✅ Membuat extension `pgcrypto`
- ✅ Membuat enum `route_status`
- ✅ Membuat tabel `routes` dan `stops`
- ✅ Membuat constraint dan index

### 4️⃣ Jalankan Server

**Development mode (dengan auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:3000/api/routes
```

### 📋 Endpoints Overview

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/routes` | Mendapatkan semua rute |
| `GET` | `/api/routes/:id` | Mendapatkan rute berdasarkan ID |
| `POST` | `/api/routes` | Membuat rute baru |
| `PUT` | `/api/routes/:id` | Update seluruh data rute |
| `PATCH` | `/api/routes/:id` | Update sebagian data rute |
| `DELETE` | `/api/routes/:id` | Menghapus rute |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

### 1. GET /api/routes

Mendapatkan semua rute dengan pagination dan filtering.

**Query Parameters:**

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `status` | string | - | Filter berdasarkan status (`active`, `inactive`, `maintenance`) |
| `limit` | integer | 100 | Jumlah maksimal rute |
| `offset` | integer | 0 | Offset untuk pagination |

**Example Request:**
```bash
curl http://localhost:3000/api/routes?status=active&limit=10&offset=0
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayId": 1,
      "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
      "routeCode": "RT-001",
      "description": "Rute utama menghubungkan terminal kota dengan bandara",
      "status": "active",
      "createdAt": "2025-11-04T10:00:00.000Z",
      "updatedAt": "2025-11-04T10:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

---

### 2. GET /api/routes/:id

Mendapatkan rute berdasarkan ID beserta daftar halte.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID rute |

**Example Request:**
```bash
curl http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
    "routeCode": "RT-001",
    "description": "Rute utama menghubungkan terminal kota dengan bandara",
    "status": "active",
    "stops": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "stopName": "Halte Terminal Kota",
        "stopCode": "STP-001",
        "latitude": -6.2088,
        "longitude": 106.8456,
        "sequence": 1
      }
    ],
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 3. POST /api/routes

Membuat rute baru beserta halte-haltenya.

**Request Body:**

```json
{
  "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
  "routeCode": "RT-001",
  "description": "Rute utama menghubungkan terminal kota dengan bandara",
  "status": "active",
  "stops": [
    {
      "stopName": "Halte Terminal Kota",
      "stopCode": "STP-001",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "sequence": 1
    },
    {
      "stopName": "Halte Terminal Bandara",
      "stopCode": "STP-002",
      "latitude": -6.1256,
      "longitude": 106.6556,
      "sequence": 2
    }
  ]
}
```

**Required Fields:**
- ✅ `routeName` - Nama rute
- ✅ `routeCode` - Kode unik rute (harus unique)
- ✅ `stops` - Array halte (minimal 1 halte)

**Optional Fields:**
- `description` - Deskripsi rute
- `status` - Status rute (default: `active`)

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeName": "Rute A",
    "routeCode": "RT-001",
    "stops": [
      {
        "stopName": "Halte 1",
        "stopCode": "STP-001",
        "latitude": -6.2088,
        "longitude": 106.8456
      }
    ]
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Rute berhasil dibuat",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "routeName": "Rute A",
    "routeCode": "RT-001",
    "description": "",
    "status": "active",
    "stops": [...],
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 4. PUT /api/routes/:id

Update seluruh data rute (full update).

**Request Body:** Sama seperti POST, semua field wajib diisi.

---

### 5. PATCH /api/routes/:id

Update sebagian data rute (partial update).

**Request Body:** Hanya field yang ingin diupdate.

**Example Request:**
```bash
curl -X PATCH http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance"
  }'
```

---

### 6. DELETE /api/routes/:id

Menghapus rute. Halte akan terhapus otomatis (CASCADE).

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "success": true,
  "message": "Rute berhasil dihapus"
}
```

---

### 7. GET /health

Health check endpoint.

**Example Response:**
```json
{
  "status": "OK",
  "service": "RouteService",
  "pesan": "Layanan berjalan dengan baik",
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

## 📊 Database Schema

### Tabel `routes`

| Column | Type | Constraints | Deskripsi |
|--------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY | ID rute (auto-generated) |
| `route_name` | TEXT | NOT NULL | Nama rute |
| `route_code` | TEXT | NOT NULL, UNIQUE | Kode unik rute |
| `description` | TEXT | NOT NULL, DEFAULT '' | Deskripsi rute |
| `status` | route_status | NOT NULL, DEFAULT 'active' | Status rute |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

### Tabel `stops`

| Column | Type | Constraints | Deskripsi |
|--------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY | ID halte (auto-generated) |
| `route_id` | UUID | NOT NULL, FOREIGN KEY | ID rute (references routes) |
| `stop_name` | TEXT | NOT NULL | Nama halte |
| `stop_code` | TEXT | NOT NULL | Kode halte |
| `latitude` | NUMERIC(10,6) | NOT NULL | Koordinat latitude |
| `longitude` | NUMERIC(10,6) | NOT NULL | Koordinat longitude |
| `sequence` | INTEGER | NOT NULL | Urutan halte dalam rute |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

### Enum `route_status`

- `active` - Rute aktif
- `inactive` - Rute tidak aktif
- `maintenance` - Rute sedang dalam perbaikan

### Indexes

- `routes.status` - Index untuk filtering berdasarkan status
- `stops.route_id, stops.sequence` - Index untuk query halte per rute

---

## 🧪 Testing

### Menggunakan Swagger UI

1. Buka `http://localhost:3000/api-docs`
2. Pilih endpoint yang ingin diuji
3. Klik **"Try it out"**
4. Isi request body (jika diperlukan)
5. Klik **"Execute"**

### Contoh curl Commands

```bash
# Get all routes
curl http://localhost:3000/api/routes

# Get routes with filter
curl http://localhost:3000/api/routes?status=active&limit=10

# Get route by ID
curl http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000

# Create route
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeName": "Rute A",
    "routeCode": "RT-001",
    "stops": [
      {
        "stopName": "Halte 1",
        "stopCode": "STP-001",
        "latitude": -6.2088,
        "longitude": 106.8456
      }
    ]
  }'

# Update route (partial)
curl -X PATCH http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"status": "maintenance"}'

# Delete route
curl -X DELETE http://localhost:3000/api/routes/550e8400-e29b-41d4-a716-446655440000
```

---

## 🔧 Development

### Scripts Available

```bash
npm start              # Run server (production)
npm run dev            # Run server dengan auto-check (dependencies, .env, database)
npm run setup          # Setup database saja (fix migrations + run migrations)
npm run setup:full     # Setup lengkap (install deps + setup .env + setup database + verify)
npm run migrate        # Run database migration
npm run verify         # Verify migrations dan database structure
npm run assign-buses   # Auto-assign buses ke routes (perlu BusService atau database)
npm run assign-buses-manual # Manual assign buses ke routes (interaktif)
npm run check-services # Check status semua service (RouteService, BusService, Gateway)
```

### Struktur Folder

```
routeservice/
├── config/
│   ├── db.js                   # Database connection
│   ├── swagger.js              # Swagger configuration
│   └── migration.config.js     # Migration configuration
├── migrations/
│   ├── 20251105000000_initial_schema.js
│   ├── 20251106000000_add_numeric_id.js
│   └── 20251109000000_add_bus_id_to_routes.js
├── routes/
│   └── routes.js               # API routes
├── scripts/
│   ├── dev.js                  # Development script (auto-check)
│   ├── setup.js                # Full setup script
│   ├── setup-database.js       # Database setup script
│   ├── migrate.js              # Migration script
│   ├── verify-migrations.js    # Verify migrations
│   ├── assign-buses-to-routes.js # Auto-assign buses
│   ├── assign-buses-manual.js  # Manual assign buses
│   └── check-services.js       # Check service status
├── services/
│   └── busService.js           # BusService integration
├── server.js                   # Entry point
├── package.json
└── env.example
```

---

## 📝 Migration

Service ini menggunakan `node-pg-migrate` untuk migration.

### Migration Table

- **Table:** `pgmigrations`
- **Schema:** `public`

### Menjalankan Migration

```bash
npm run migrate
```

### Membuat Migration Baru

```bash
# Install node-pg-migrate globally (jika belum)
npm install -g node-pg-migrate

# Create new migration
node-pg-migrate create migration_name --config config/migration.config.js
```

---

## ❌ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detail error message"
}
```

### Status Codes

| Code | Deskripsi | Contoh |
|------|-----------|--------|
| `200` | Success | GET request berhasil |
| `201` | Created | POST request berhasil |
| `400` | Bad Request | Validation error, duplicate route_code |
| `404` | Not Found | Route dengan ID tidak ditemukan |
| `500` | Internal Server Error | Database error, server error |

### Common Errors

#### 1. Duplicate Route Code (400)
```json
{
  "success": false,
  "error": "Kode rute duplikat",
  "message": "Rute dengan kode tersebut sudah ada"
}
```

#### 2. Route Not Found (404)
```json
{
  "success": false,
  "error": "Route not found",
  "message": "Route dengan ID xxx tidak ditemukan"
}
```

#### 3. Validation Error (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi"
}
```

---

## 📝 Notes

- ✅ Service menggunakan database yang sama dengan services lain (`transtrack_db`)
- ✅ Migration table terpisah: `pgmigrations`
- ✅ Port default: `3000`
- ✅ Semua endpoint menggunakan format JSON
- ✅ Unique constraint pada `route_code` - akan menghasilkan error 400 jika duplikat
- ✅ CASCADE delete: Menghapus rute akan menghapus semua halte terkait

---

<div align="center">

**RouteService** - Part of TransTrack Microservice Architecture

Made with ❤️ using Node.js & Express

</div>

