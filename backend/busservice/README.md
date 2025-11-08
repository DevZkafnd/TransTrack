# 🚌 BusService

<div align="center">

**API Provider untuk Mengelola Data Master Armada Bus**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

**Port:** `3006` | **Base URL:** `http://localhost:3006`

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
# Edit .env dengan konfigurasi database Anda (PORT=3006)

# 3. Setup database
npm run setup

# 4. Run server
npm run dev
```

Server akan berjalan di `http://localhost:3006`

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
PORT=3006
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
- ✅ Membuat tabel `buses` jika belum ada
- ✅ Membuat constraint unique pada `plate`
- ✅ Membuat index pada `plate`
- ✅ Mencatat migration di tabel `pgmigrations_bus`

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:3006/api/buses
```

### Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/buses` | Mendapatkan semua bus |
| `GET` | `/api/buses/:id` | Mendapatkan bus berdasarkan ID |
| `POST` | `/api/buses` | Membuat bus baru |

### 📖 Dokumentasi API

Swagger UI tersedia di: `http://localhost:3006/api-docs`

---

## 📊 Database Schema

### Tabel: `buses`

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key (auto-generated) |
| `plate` | TEXT | Nomor plat bus (unique) |
| `capacity` | INTEGER | Kapasitas penumpang |
| `model` | TEXT | Model bus |
| `created_at` | TIMESTAMPTZ | Timestamp pembuatan |
| `updated_at` | TIMESTAMPTZ | Timestamp pembaruan terakhir |

### Constraints

- `buses_plate_unique`: Unique constraint pada kolom `plate`
- Index pada `plate` untuk performa query

---

## 🧪 Testing

### Menggunakan cURL

#### 1. Mendapatkan semua bus

```bash
curl http://localhost:3006/api/buses
```

#### 2. Mendapatkan bus berdasarkan ID

```bash
curl http://localhost:3006/api/buses/{id}
```

#### 3. Membuat bus baru

```bash
curl -X POST http://localhost:3006/api/buses \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "B 1234 CD",
    "capacity": 40,
    "model": "Mercedes-Benz Tourismo"
  }'
```

---

## 🔧 Development

### Menjalankan Server

```bash
npm run dev
```

Server akan berjalan dengan nodemon untuk auto-reload saat development.

### Menjalankan Production

```bash
npm start
```

---

## 📝 Migration

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

API mengembalikan response dengan format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detail error message"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validasi error)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📚 Contoh Response

### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayId": 1,
      "plate": "B 1234 CD",
      "capacity": 40,
      "model": "Mercedes-Benz Tourismo",
      "createdAt": "2025-11-05T12:00:00.000Z",
      "updatedAt": "2025-11-05T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

### Error Response

```json
{
  "success": false,
  "error": "Plat duplikat",
  "message": "Bus dengan plat tersebut sudah ada"
}
```

---

## 🔗 Integrasi dengan Gateway

BusService terintegrasi dengan API Gateway di `http://localhost:8000/api/buses`

Semua request dari frontend akan melalui Gateway yang kemudian meneruskan ke BusService.

---

## 📝 Catatan

- BusService menggunakan PostgreSQL sebagai database
- Setiap bus memiliki plat yang unik
- Kapasitas harus berupa angka positif
- Model bus adalah teks bebas

---

## 🤝 Kontribusi

Untuk kontribusi, silakan buat issue atau pull request di repository utama.

---

**Dibuat dengan ❤️ untuk TransTrack**

