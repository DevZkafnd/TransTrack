# 🚗 DriverService

<div align="center">

**API Provider untuk Mengelola Data Master Pengemudi**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

**Port:** `3001` | **Base URL:** `http://localhost:3001`

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

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env dengan konfigurasi database Anda (PORT=3001)

# 3. Setup database
npm run setup

# 4. Run server
npm run dev
```

Server akan berjalan di `http://localhost:3001`

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
PORT=3001
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

**Opsi 1: Menggunakan script setup (Recommended untuk pertama kali)**
```bash
npm run setup
```

**Opsi 2: Menggunakan migration**
```bash
npm run migrate
```

Script `setup` akan:
- ✅ Membuat extension `pgcrypto` jika belum ada
- ✅ Membuat tabel `drivers` jika belum ada
- ✅ Membuat constraint unique pada `license`
- ✅ Membuat index pada `license`
- ✅ Mencatat migration di tabel `pgmigrations_driver`

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
http://localhost:3001/api/drivers
```

### 📋 Endpoints Overview

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/drivers` | Mendapatkan semua pengemudi |
| `GET` | `/api/drivers/:id` | Mendapatkan pengemudi berdasarkan ID |
| `POST` | `/api/drivers` | Membuat pengemudi baru |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

### 1. GET /api/drivers

Mendapatkan semua pengemudi dengan pagination.

**Query Parameters:**

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `limit` | integer | 100 | Jumlah maksimal pengemudi |
| `offset` | integer | 0 | Offset untuk pagination |

**Example Request:**
```bash
curl http://localhost:3001/api/drivers?limit=10&offset=0
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayId": 1,
      "name": "Budi Santoso",
      "license": "SIM-A-1234567890",
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

### 2. GET /api/drivers/:id

Mendapatkan pengemudi berdasarkan ID.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID pengemudi |

**Example Request:**
```bash
curl http://localhost:3001/api/drivers/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "name": "Budi Santoso",
    "license": "SIM-A-1234567890",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 3. POST /api/drivers

Membuat pengemudi baru.

**Request Body:**

```json
{
  "name": "Budi Santoso",
  "license": "SIM-A-1234567890"
}
```

**Required Fields:**
- ✅ `name` - Nama pengemudi
- ✅ `license` - Nomor lisensi (harus unique)

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Santoso",
    "license": "SIM-A-1234567890"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Pengemudi berhasil dibuat",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "name": "Budi Santoso",
    "license": "SIM-A-1234567890",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 4. GET /health

Health check endpoint.

**Example Response:**
```json
{
  "status": "OK",
  "service": "DriverService",
  "pesan": "Layanan berjalan dengan baik",
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

## 📊 Database Schema

### Tabel `drivers`

| Column | Type | Constraints | Deskripsi |
|--------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY | ID pengemudi (auto-generated) |
| `name` | TEXT | NOT NULL | Nama pengemudi |
| `license` | TEXT | NOT NULL, UNIQUE | Nomor lisensi (unique) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

### Indexes

- `drivers.license` - Index untuk query berdasarkan lisensi

### Constraints

- Unique constraint pada `license` - Mencegah duplikasi nomor lisensi

---

## 🧪 Testing

### Menggunakan Swagger UI

1. Buka `http://localhost:3001/api-docs`
2. Pilih endpoint yang ingin diuji
3. Klik **"Try it out"**
4. Isi request body (jika diperlukan)
5. Klik **"Execute"**

### Contoh curl Commands

```bash
# Get all drivers
curl http://localhost:3001/api/drivers

# Get drivers with pagination
curl http://localhost:3001/api/drivers?limit=10&offset=0

# Get driver by ID
curl http://localhost:3001/api/drivers/550e8400-e29b-41d4-a716-446655440000

# Create driver
curl -X POST http://localhost:3001/api/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Santoso",
    "license": "SIM-A-1234567890"
  }'
```

---

## 🔧 Development

### Scripts Available

```bash
npm start        # Run server (production)
npm run dev      # Run server dengan nodemon (development)
npm run migrate  # Run database migration
npm run setup    # Setup database (first time)
```

### Struktur Folder

```
driverservice/
├── config/
│   ├── db.js                   # Database connection
│   ├── swagger.js              # Swagger configuration
│   └── migration.config.js     # Migration configuration
├── migrations/
│   └── 20251105002950_initial_schema.js  # Initial migration
├── routes/
│   └── drivers.js              # API routes
├── scripts/
│   ├── migrate.js              # Migration script
│   └── setup-database.js       # Setup database script
├── server.js                   # Entry point
├── package.json
└── env.example
```

---

## 📝 Migration

Service ini menggunakan `node-pg-migrate` untuk migration.

### Migration Table

- **Table:** `pgmigrations_driver`
- **Schema:** `public`

### Menjalankan Migration

```bash
npm run migrate
```

### Setup Database (Pertama Kali)

```bash
npm run setup
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
| `400` | Bad Request | Validation error, duplicate license |
| `404` | Not Found | Driver dengan ID tidak ditemukan |
| `500` | Internal Server Error | Database error, server error |

### Common Errors

#### 1. Duplicate License (400)
```json
{
  "success": false,
  "error": "Lisensi duplikat",
  "message": "Pengemudi dengan lisensi tersebut sudah ada"
}
```

#### 2. Driver Not Found (404)
```json
{
  "success": false,
  "error": "Pengemudi tidak ditemukan",
  "message": "Pengemudi dengan ID xxx tidak ditemukan"
}
```

#### 3. Validation Error (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "name dan license wajib diisi"
}
```

---

## 📝 Notes

- ✅ Service menggunakan database yang sama dengan services lain (`transtrack_db`)
- ✅ Migration table terpisah: `pgmigrations_driver`
- ✅ Port default: `3001`
- ✅ Semua endpoint menggunakan format JSON
- ✅ Unique constraint pada `license` - akan menghasilkan error 400 jika duplikat
- ✅ DisplayId otomatis dihitung untuk urutan tampilan

---

<div align="center">

**DriverService** - Part of TransTrack Microservice Architecture

Made with ❤️ using Node.js & Express

</div>
