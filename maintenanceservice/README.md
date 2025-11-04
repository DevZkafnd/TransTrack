# 🔧 MaintenanceService

<div align="center">

**API Provider untuk Mengelola Data Master Riwayat dan Jadwal Perbaikan Bus**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

**Port:** `3003` | **Base URL:** `http://localhost:3003`

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
- [📋 Maintenance Status Flow](#-maintenance-status-flow)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env dengan konfigurasi database Anda (PORT=3003)

# 3. Setup database
npm run setup

# 4. Run server
npm run dev
```

Server akan berjalan di `http://localhost:3003`

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
PORT=3003
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
- ✅ Membuat enum `maintenance_status` (scheduled, in_progress, completed, cancelled)
- ✅ Membuat tabel `maintenance` jika belum ada
- ✅ Membuat index pada `bus_id`, `status`, dan `scheduled_date`
- ✅ Mencatat migration di tabel `pgmigrations_maintenance`

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
http://localhost:3003/api/maintenance
```

### 📋 Endpoints Overview

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/maintenance` | Membuat jadwal perbaikan baru |
| `GET` | `/api/maintenance/bus/:bus_id` | Mendapatkan riwayat perbaikan berdasarkan bus ID |
| `PUT` | `/api/maintenance/:id/complete` | Menandai perbaikan sebagai selesai atau update data |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

### 1. POST /api/maintenance

Membuat jadwal perbaikan baru.

**Request Body:**

```json
{
  "busId": "BUS-001",
  "maintenanceType": "Routine Service",
  "description": "Ganti oli mesin dan filter udara",
  "scheduledDate": "2025-11-10T10:00:00Z",
  "status": "scheduled",
  "cost": 500000,
  "mechanicName": "Budi Santoso",
  "notes": "Perlu pengecekan rem setelah service"
}
```

**Required Fields:**
- ✅ `busId` - ID bus yang akan diperbaiki
- ✅ `maintenanceType` - Jenis perbaikan
- ✅ `description` - Deskripsi perbaikan
- ✅ `scheduledDate` - Tanggal dan waktu jadwal perbaikan (ISO 8601 format)

**Optional Fields:**
- `status` - Status perbaikan (default: `scheduled`)
  - Values: `scheduled`, `in_progress`, `completed`, `cancelled`
- `cost` - Biaya perbaikan
- `mechanicName` - Nama mekanik yang menangani
- `notes` - Catatan tambahan

**Example Request:**
```bash
curl -X POST http://localhost:3003/api/maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "BUS-001",
    "maintenanceType": "Routine Service",
    "description": "Ganti oli mesin dan filter udara",
    "scheduledDate": "2025-11-10T10:00:00Z",
    "status": "scheduled",
    "cost": 500000,
    "mechanicName": "Budi Santoso",
    "notes": "Perlu pengecekan rem setelah service"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Jadwal perbaikan berhasil dibuat",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "busId": "BUS-001",
    "maintenanceType": "Routine Service",
    "description": "Ganti oli mesin dan filter udara",
    "scheduledDate": "2025-11-10T10:00:00.000Z",
    "completedDate": null,
    "status": "scheduled",
    "cost": 500000,
    "mechanicName": "Budi Santoso",
    "notes": "Perlu pengecekan rem setelah service",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 2. GET /api/maintenance/bus/:bus_id

Mendapatkan riwayat perbaikan berdasarkan ID bus.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `bus_id` | string | Yes | ID bus |

**Query Parameters:**

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `status` | string | - | Filter berdasarkan status (`scheduled`, `in_progress`, `completed`, `cancelled`) |
| `limit` | integer | 100 | Jumlah maksimal data |
| `offset` | integer | 0 | Offset untuk pagination |

**Example Request:**
```bash
# Get all maintenance for bus
curl http://localhost:3003/api/maintenance/bus/BUS-001

# Get only scheduled maintenance
curl http://localhost:3003/api/maintenance/bus/BUS-001?status=scheduled

# Get with pagination
curl http://localhost:3003/api/maintenance/bus/BUS-001?limit=10&offset=0
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "busId": "BUS-001",
      "maintenanceType": "Routine Service",
      "description": "Ganti oli mesin dan filter udara",
      "scheduledDate": "2025-11-10T10:00:00.000Z",
      "completedDate": "2025-11-10T12:00:00.000Z",
      "status": "completed",
      "cost": 500000,
      "mechanicName": "Budi Santoso",
      "notes": "Semua komponen sudah diganti",
      "createdAt": "2025-11-04T10:00:00.000Z",
      "updatedAt": "2025-11-10T12:00:00.000Z"
    }
  ],
  "total": 5,
  "limit": 100,
  "offset": 0
}
```

---

### 3. PUT /api/maintenance/:id/complete

Menandai perbaikan sebagai selesai atau mengupdate data perbaikan yang sudah selesai.

**Behavior:**
- **Jika status belum `completed`**: Mengubah status menjadi `completed` dan mengisi `completed_date` dengan waktu sekarang
- **Jika status sudah `completed`**: Hanya mengupdate `cost`, `mechanicName`, dan `notes` tanpa mengubah `completed_date`

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID maintenance |

**Request Body (Optional):**

```json
{
  "cost": 500000,
  "mechanicName": "Budi Santoso",
  "notes": "Semua komponen sudah diganti"
}
```

**Example Request:**
```bash
# Complete maintenance (first time)
curl -X PUT http://localhost:3003/api/maintenance/550e8400-e29b-41d4-a716-446655440000/complete \
  -H "Content-Type: application/json" \
  -d '{
    "cost": 500000,
    "mechanicName": "Budi Santoso",
    "notes": "Semua komponen sudah diganti"
  }'

# Update completed maintenance
curl -X PUT http://localhost:3003/api/maintenance/550e8400-e29b-41d4-a716-446655440000/complete \
  -H "Content-Type: application/json" \
  -d '{
    "cost": 550000,
    "notes": "Biaya tambahan untuk spare part"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Perbaikan berhasil ditandai selesai",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "busId": "BUS-001",
    "maintenanceType": "Routine Service",
    "description": "Ganti oli mesin dan filter udara",
    "scheduledDate": "2025-11-10T10:00:00.000Z",
    "completedDate": "2025-11-10T12:00:00.000Z",
    "status": "completed",
    "cost": 500000,
    "mechanicName": "Budi Santoso",
    "notes": "Semua komponen sudah diganti",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-10T12:00:00.000Z"
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
  "service": "MaintenanceService",
  "pesan": "Layanan berjalan dengan baik",
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

## 📊 Database Schema

### Tabel `maintenance`

| Column | Type | Constraints | Deskripsi |
|--------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY | ID maintenance (auto-generated) |
| `bus_id` | TEXT | NOT NULL | ID bus yang akan diperbaiki |
| `maintenance_type` | TEXT | NOT NULL | Jenis perbaikan |
| `description` | TEXT | NOT NULL | Deskripsi perbaikan |
| `scheduled_date` | TIMESTAMPTZ | NOT NULL | Tanggal dan waktu jadwal perbaikan |
| `completed_date` | TIMESTAMPTZ | NULLABLE | Tanggal dan waktu selesai perbaikan |
| `status` | maintenance_status | NOT NULL, DEFAULT 'scheduled' | Status perbaikan |
| `cost` | NUMERIC(12,2) | NULLABLE | Biaya perbaikan |
| `mechanic_name` | TEXT | NULLABLE | Nama mekanik yang menangani |
| `notes` | TEXT | NULLABLE | Catatan tambahan |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

### Enum `maintenance_status`

| Value | Deskripsi |
|-------|-----------|
| `scheduled` | Terjadwal |
| `in_progress` | Sedang dikerjakan |
| `completed` | Selesai |
| `cancelled` | Dibatalkan |

### Indexes

- `maintenance.bus_id` - Index untuk query berdasarkan bus ID
- `maintenance.status` - Index untuk filtering berdasarkan status
- `maintenance.scheduled_date` - Index untuk sorting berdasarkan tanggal

---

## 🧪 Testing

### Menggunakan Swagger UI

1. Buka `http://localhost:3003/api-docs`
2. Pilih endpoint yang ingin diuji
3. Klik **"Try it out"**
4. Isi request body (jika diperlukan)
5. Klik **"Execute"**

### Contoh curl Commands

```bash
# Create maintenance
curl -X POST http://localhost:3003/api/maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "BUS-001",
    "maintenanceType": "Routine Service",
    "description": "Ganti oli mesin",
    "scheduledDate": "2025-11-10T10:00:00Z"
  }'

# Get maintenance by bus ID
curl http://localhost:3003/api/maintenance/bus/BUS-001

# Get maintenance with filter
curl http://localhost:3003/api/maintenance/bus/BUS-001?status=completed

# Complete maintenance
curl -X PUT http://localhost:3003/api/maintenance/550e8400-e29b-41d4-a716-446655440000/complete \
  -H "Content-Type: application/json" \
  -d '{
    "cost": 500000,
    "mechanicName": "Budi Santoso",
    "notes": "Semua komponen sudah diganti"
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
maintenanceservice/
├── config/
│   ├── db.js                   # Database connection
│   ├── swagger.js              # Swagger configuration
│   └── migration.config.js     # Migration configuration
├── migrations/
│   └── 20251105004443_initial_schema.js  # Initial migration
├── routes/
│   └── maintenance.js         # API routes
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

- **Table:** `pgmigrations_maintenance`
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
| `200` | Success | GET/PUT request berhasil |
| `201` | Created | POST request berhasil |
| `400` | Bad Request | Validation error, invalid status |
| `404` | Not Found | Maintenance dengan ID tidak ditemukan |
| `500` | Internal Server Error | Database error, server error |

### Common Errors

#### 1. Maintenance Not Found (404)
```json
{
  "success": false,
  "error": "Maintenance tidak ditemukan",
  "message": "Maintenance dengan ID xxx tidak ditemukan"
}
```

#### 2. Validation Error (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "busId, maintenanceType, description, dan scheduledDate wajib diisi"
}
```

#### 3. Invalid Status (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "Status harus salah satu dari: scheduled, in_progress, completed, cancelled"
}
```

#### 4. Invalid Date Format (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "scheduledDate harus dalam format tanggal yang valid"
}
```

---

## 📋 Maintenance Status Flow

```
┌─────────────┐
│  scheduled  │  ← Default status saat membuat maintenance
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ in_progress │  ← Status saat maintenance sedang dikerjakan
└──────┬──────┘
       │
       ├──────────────────────┐
       │                      │
       ▼                      ▼
┌─────────────┐      ┌─────────────┐
│  completed  │      │  cancelled  │
└─────────────┘      └─────────────┘
       │
       │ (dapat diupdate cost, mechanicName, notes)
       │
       └──────────────┐
                      │
                      ▼
              (tetap completed)
```

### Status Transitions

- `scheduled` → `in_progress` → `completed`
- `scheduled` → `completed` (direct)
- `scheduled` → `cancelled`
- `in_progress` → `completed`
- `completed` → (tidak bisa diubah lagi, hanya update data)

---

## 📝 Notes

- ✅ Service menggunakan database yang sama dengan services lain (`transtrack_db`)
- ✅ Migration table terpisah: `pgmigrations_maintenance`
- ✅ Port default: `3003`
- ✅ Semua endpoint menggunakan format JSON
- ✅ Status default: `scheduled`
- ✅ Endpoint `PUT /api/maintenance/:id/complete`:
  - Jika belum completed: akan mengubah status menjadi `completed` dan mengisi `completed_date`
  - Jika sudah completed: hanya mengupdate `cost`, `mechanicName`, dan `notes`
- ✅ `completed_date` tidak akan berubah jika sudah di-set sebelumnya
- ✅ Endpoint `GET /api/maintenance/bus/:bus_id` mendukung filter berdasarkan status
- ✅ Data diurutkan berdasarkan `scheduled_date DESC` (terbaru dulu)

---

<div align="center">

**MaintenanceService** - Part of TransTrack Microservice Architecture

Made with ❤️ using Node.js & Express

</div>
