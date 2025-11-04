# 🚌 TransTrack - Microservice Architecture

<div align="center">

**Sistem Transportasi Berbasis Microservice untuk Mengelola Data Master Transportasi**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

</div>

---

## 📑 Table of Contents

- [🏗️ Arsitektur](#️-arsitektur)
- [📦 Services yang Tersedia](#-services-yang-tersedia)
- [📁 Struktur Proyek](#-struktur-proyek)
- [🚀 Quick Start](#-quick-start)
- [🔧 Konfigurasi Environment](#-konfigurasi-environment)
- [📊 Database Schema](#-database-schema)
- [🌐 API Endpoints Overview](#-api-endpoints-overview)
- [🛠️ Teknologi yang Digunakan](#️-teknologi-yang-digunakan)
- [📝 Migration & Database Setup](#-migration--database-setup)
- [🧪 Testing](#-testing)
- [⚙️ Menjalankan Semua Services](#️-menjalankan-semua-services)
- [📚 Dokumentasi Detail](#-dokumentasi-detail)
- [⚠️ Catatan Penting](#️-catatan-penting)
- [🔒 Security Notes](#-security-notes)

---

## 🏗️ Arsitektur

Proyek ini menggunakan **arsitektur microservice** dengan setiap service sebagai penyedia API (Provider) yang independen. Setiap service memiliki:

- ✅ Database PostgreSQL terpisah (migration table terpisah)
- ✅ Port yang berbeda untuk menghindari konflik
- ✅ Dokumentasi API Swagger sendiri
- ✅ Struktur folder yang konsisten
- ✅ Setup dan deployment yang independen

```
┌─────────────────────────────────────────────────────────────┐
│                    TransTrack System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ RouteService │  │DriverService │  │ UserService  │      │
│  │   :3000      │  │   :3001      │  │   :3002      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────┴──────────────────┴──────────────────┴──────┐    │
│  │         PostgreSQL Database (transtrack_db)          │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │  routes    │  │  drivers   │  │   users    │   │    │
│  │  │   stops    │  │            │  │            │   │    │
│  │  └────────────┘  └────────────┘  └────────────┘   │    │
│  │                                                       │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │          maintenance                         │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         MaintenanceService  :3003                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Services yang Tersedia

| Service | Port | 🎯 Tugas | 📖 Dokumentasi | 🔗 Health Check |
|---------|------|----------|----------------|-----------------|
| **RouteService** | `3000` | Mengelola data master rute dan halte | [`/api-docs`](http://localhost:3000/api-docs) | [`/health`](http://localhost:3000/health) |
| **DriverService** | `3001` | Mengelola data master pengemudi | [`/api-docs`](http://localhost:3001/api-docs) | [`/health`](http://localhost:3001/health) |
| **UserService** | `3002` | Mengelola data master pengguna/penumpang | [`/api-docs`](http://localhost:3002/api-docs) | [`/health`](http://localhost:3002/health) |
| **MaintenanceService** | `3003` | Mengelola data master riwayat dan jadwal perbaikan bus | [`/api-docs`](http://localhost:3003/api-docs) | [`/health`](http://localhost:3003/health) |

---

## 📁 Struktur Proyek

```
TransTrack/
│
├── 📂 routeservice/                    # RouteService (Port 3000)
│   ├── 📂 config/
│   │   ├── 📄 db.js                   # Konfigurasi koneksi PostgreSQL
│   │   ├── 📄 swagger.js              # Konfigurasi Swagger
│   │   └── 📄 migration.config.js     # Konfigurasi migration
│   ├── 📂 migrations/
│   │   └── 📄 0001_initial_schema.js  # Migration initial schema
│   ├── 📂 routes/
│   │   └── 📄 routes.js               # Endpoint CRUD untuk rute
│   ├── 📂 scripts/
│   │   └── 📄 migrate.js              # Script untuk menjalankan migration
│   ├── 📄 server.js                   # Entry point aplikasi
│   ├── 📄 package.json                # Dependencies
│   ├── 📄 env.example                 # Template environment variables
│   └── 📄 README.md                   # Dokumentasi RouteService
│
├── 📂 driverservice/                   # DriverService (Port 3001)
│   ├── 📂 config/
│   ├── 📂 migrations/
│   │   └── 📄 20251105002950_initial_schema.js
│   ├── 📂 routes/
│   │   └── 📄 drivers.js              # Endpoint untuk drivers
│   ├── 📂 scripts/
│   │   ├── 📄 migrate.js
│   │   └── 📄 setup-database.js      # Script setup database
│   ├── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 env.example
│   └── 📄 README.md
│
├── 📂 userservice/                     # UserService (Port 3002)
│   ├── 📂 config/
│   ├── 📂 migrations/
│   │   └── 📄 20251105003100_initial_schema.js
│   ├── 📂 routes/
│   │   └── 📄 users.js                # Endpoint untuk users
│   ├── 📂 scripts/
│   │   ├── 📄 migrate.js
│   │   └── 📄 setup-database.js
│   ├── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 env.example
│   └── 📄 README.md
│
├── 📂 maintenanceservice/              # MaintenanceService (Port 3003)
│   ├── 📂 config/
│   ├── 📂 migrations/
│   │   └── 📄 20251105004443_initial_schema.js
│   ├── 📂 routes/
│   │   └── 📄 maintenance.js         # Endpoint untuk maintenance
│   ├── 📂 scripts/
│   │   ├── 📄 migrate.js
│   │   └── 📄 setup-database.js
│   ├── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 env.example
│   └── 📄 README.md
│
├── 📄 package.json                     # Root package.json
├── 📄 package-lock.json
└── 📄 README.md                        # Dokumentasi utama (file ini)
```

---

## 🚀 Quick Start

### 📋 Prasyarat

Pastikan Anda telah menginstal:

- [x] **Node.js** (v16 atau lebih tinggi)
- [x] **npm** atau **yarn**
- [x] **PostgreSQL 13+** (lokal atau managed)

### 💾 Setup Database

1. **Buat database PostgreSQL:**

```sql
CREATE DATABASE transtrack_db;
```

2. **Konfigurasi koneksi database** di setiap service (lihat bagian Setup per Service)

### ⚙️ Setup per Service

Setiap service memiliki setup yang sama. Berikut langkah-langkahnya:

#### 1️⃣ RouteService (Port 3000)

```bash
cd routeservice
npm install
cp env.example .env
# Edit .env sesuai konfigurasi database Anda
npm run migrate
npm run dev
```

**📡 Endpoint:**
- `GET /api/routes` - Mendapatkan semua rute
- `GET /api/routes/:id` - Mendapatkan rute berdasarkan ID
- `POST /api/routes` - Membuat rute baru
- `PUT /api/routes/:id` - Update seluruh data rute
- `PATCH /api/routes/:id` - Update sebagian data rute
- `DELETE /api/routes/:id` - Menghapus rute

#### 2️⃣ DriverService (Port 3001)

```bash
cd driverservice
npm install
cp env.example .env
# Edit .env (PORT=3001)
npm run setup    # atau npm run migrate
npm run dev
```

**📡 Endpoint:**
- `GET /api/drivers` - Mendapatkan semua pengemudi
- `GET /api/drivers/:id` - Mendapatkan pengemudi berdasarkan ID
- `POST /api/drivers` - Membuat pengemudi baru

#### 3️⃣ UserService (Port 3002)

```bash
cd userservice
npm install
cp env.example .env
# Edit .env (PORT=3002)
npm run setup    # atau npm run migrate
npm run dev
```

**📡 Endpoint:**
- `GET /api/users` - Mendapatkan semua pengguna
- `GET /api/users/:id` - Mendapatkan pengguna berdasarkan ID
- `POST /api/users/register` - Mendaftarkan pengguna baru

#### 4️⃣ MaintenanceService (Port 3003)

```bash
cd maintenanceservice
npm install
cp env.example .env
# Edit .env (PORT=3003)
npm run setup    # atau npm run migrate
npm run dev
```

**📡 Endpoint:**
- `POST /api/maintenance` - Membuat jadwal perbaikan baru
- `GET /api/maintenance/bus/:bus_id` - Mendapatkan riwayat perbaikan berdasarkan bus ID
- `PUT /api/maintenance/:id/complete` - Menandai perbaikan sebagai selesai atau update data

---

## 🔧 Konfigurasi Environment

Setiap service memiliki file `env.example`. Copy ke `.env` dan sesuaikan:

```env
# Server Configuration
PORT=3000                    # Port untuk service (beda untuk setiap service)
NODE_ENV=development

# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=                # Boleh kosong untuk trust auth
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transtrack_db       # Semua service menggunakan database yang sama
DB_SSL=false

# Optional
# DB_SCHEMA=public
```

> **💡 Tip:** Gunakan `env.example` sebagai template dan jangan commit file `.env` ke repository.

---

## 📊 Database Schema

Semua services menggunakan database PostgreSQL yang sama (`transtrack_db`), tetapi dengan **migration table terpisah**:

### 📋 Migration Tables

| Service | Migration Table |
|---------|----------------|
| RouteService | `pgmigrations` |
| DriverService | `pgmigrations_driver` |
| UserService | `pgmigrations_user` |
| MaintenanceService | `pgmigrations_maintenance` |

### 🗄️ Tabel Utama

#### 📍 routes (RouteService)
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY,
  route_name TEXT NOT NULL,
  route_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  status route_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 🚏 stops (RouteService)
```sql
CREATE TABLE stops (
  id UUID PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  stop_code TEXT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 🚗 drivers (DriverService)
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  license TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 👤 users (UserService)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 🔧 maintenance (MaintenanceService)
```sql
CREATE TABLE maintenance (
  id UUID PRIMARY KEY,
  bus_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  description TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  completed_date TIMESTAMPTZ,
  status maintenance_status NOT NULL DEFAULT 'scheduled',
  cost NUMERIC(12,2),
  mechanic_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🌐 API Endpoints Overview

### 🛣️ RouteService (Port 3000)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/routes` | Mendapatkan semua rute |
| `GET` | `/api/routes/:id` | Mendapatkan rute berdasarkan ID |
| `POST` | `/api/routes` | Membuat rute baru |
| `PUT` | `/api/routes/:id` | Update seluruh data rute |
| `PATCH` | `/api/routes/:id` | Update sebagian data rute |
| `DELETE` | `/api/routes/:id` | Menghapus rute |

**🔗 Links:**
- 📖 Swagger: `http://localhost:3000/api-docs`
- ❤️ Health: `http://localhost:3000/health`

### 🚗 DriverService (Port 3001)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/drivers` | Mendapatkan semua pengemudi |
| `GET` | `/api/drivers/:id` | Mendapatkan pengemudi berdasarkan ID |
| `POST` | `/api/drivers` | Membuat pengemudi baru |

**🔗 Links:**
- 📖 Swagger: `http://localhost:3001/api-docs`
- ❤️ Health: `http://localhost:3001/health`

### 👤 UserService (Port 3002)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/users` | Mendapatkan semua pengguna |
| `GET` | `/api/users/:id` | Mendapatkan pengguna berdasarkan ID |
| `POST` | `/api/users/register` | Mendaftarkan pengguna baru |

**🔗 Links:**
- 📖 Swagger: `http://localhost:3002/api-docs`
- ❤️ Health: `http://localhost:3002/health`

### 🔧 MaintenanceService (Port 3003)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/maintenance` | Membuat jadwal perbaikan baru |
| `GET` | `/api/maintenance/bus/:bus_id` | Mendapatkan riwayat perbaikan berdasarkan bus ID |
| `PUT` | `/api/maintenance/:id/complete` | Menandai perbaikan sebagai selesai |

**🔗 Links:**
- 📖 Swagger: `http://localhost:3003/api-docs`
- ❤️ Health: `http://localhost:3003/health`

---

## 🛠️ Teknologi yang Digunakan

Semua services menggunakan teknologi yang sama:

| Teknologi | Versi | Deskripsi |
|-----------|-------|-----------|
| **Node.js** | v16+ | Runtime environment |
| **Express.js** | 4.18+ | Web framework |
| **PostgreSQL** | 13+ | Database |
| **pg** | 8.16+ | PostgreSQL driver untuk Node.js |
| **node-pg-migrate** | 8.0+ | Database migrations |
| **Swagger (OpenAPI)** | 3.0 | Dokumentasi API |
| **swagger-jsdoc** | 6.2+ | Generate Swagger dari JSDoc comments |
| **swagger-ui-express** | 5.0+ | UI untuk dokumentasi Swagger |
| **cors** | 2.8+ | Cross-Origin Resource Sharing |
| **dotenv** | 16.3+ | Environment variables management |

---

## 📝 Migration & Database Setup

### 🆕 Setup Database (Pertama Kali)

Untuk setiap service, gunakan script setup:

```bash
cd <service-name>
npm run setup
```

**✨ Script ini akan:**
- ✅ Membuat extension `pgcrypto` jika belum ada
- ✅ Membuat migration table jika belum ada
- ✅ Membuat tabel utama jika belum ada
- ✅ Membuat constraint dan index yang diperlukan
- ✅ Mencatat migration

### 🔄 Migration Selanjutnya

Untuk migration berikutnya:

```bash
npm run migrate
```

---

## 🧪 Testing

### 📖 Menggunakan Swagger UI

Setiap service memiliki Swagger UI untuk testing:

1. 🚀 Buka `http://localhost:<port>/api-docs`
2. 📋 Pilih endpoint yang ingin diuji
3. 🔘 Klik **"Try it out"**
4. ✏️ Isi request body (jika diperlukan)
5. ▶️ Klik **"Execute"**

### 💻 Contoh curl Commands

#### RouteService

```bash
# Get all routes
curl http://localhost:3000/api/routes

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
```

#### DriverService

```bash
# Create driver
curl -X POST http://localhost:3001/api/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "license": "SIM-A-123456"
  }'
```

#### UserService

```bash
# Register user
curl -X POST http://localhost:3002/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+6281234567890",
    "password": "password123"
  }'
```

#### MaintenanceService

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
```

---

## ⚙️ Menjalankan Semua Services

Untuk development, buka **terminal terpisah** untuk setiap service:

### Terminal 1: RouteService
```bash
cd routeservice && npm run dev
```

### Terminal 2: DriverService
```bash
cd driverservice && npm run dev
```

### Terminal 3: UserService
```bash
cd userservice && npm run dev
```

### Terminal 4: MaintenanceService
```bash
cd maintenanceservice && npm run dev
```

> **💡 Tip:** Gunakan terminal multiplexer seperti `tmux` atau `screen` untuk menjalankan semua services dalam satu window.

---

## 📚 Dokumentasi Detail

Setiap service memiliki README.md sendiri dengan dokumentasi lengkap:

- 📖 [`routeservice/README.md`](routeservice/README.md)
- 📖 [`driverservice/README.md`](driverservice/README.md)
- 📖 [`userservice/README.md`](userservice/README.md)
- 📖 [`maintenanceservice/README.md`](maintenanceservice/README.md)

---

## ⚠️ Catatan Penting

### 🔢 Port Configuration

Setiap service menggunakan port yang berbeda. Pastikan tidak ada konflik port:

| Service | Default Port |
|---------|--------------|
| RouteService | `3000` |
| DriverService | `3001` |
| UserService | `3002` |
| MaintenanceService | `3003` |

### 💾 Database

- Semua service menggunakan database yang sama (`transtrack_db`)
- Setiap service memiliki migration table terpisah
- Pastikan PostgreSQL sudah berjalan sebelum menjalankan services

### 🔐 Password Security

- UserService menyimpan password sebagai **plain text**
- Untuk production, **WAJIB** menggunakan bcrypt atau hashing lainnya

### 🌍 Environment Variables

- ❌ Jangan commit file `.env` ke repository
- ✅ Gunakan `env.example` sebagai template
- ✅ Tambahkan `.env` ke `.gitignore`

---

## 🔒 Security Notes

### ⚠️ Production Checklist

- [ ] **Password Hashing**: Implement bcrypt untuk UserService
- [ ] **HTTPS**: Gunakan HTTPS untuk production
- [ ] **Environment Variables**: Jangan expose credentials
- [ ] **CORS**: Konfigurasi CORS dengan benar
- [ ] **Rate Limiting**: Implement rate limiting
- [ ] **Input Validation**: Validasi semua input
- [ ] **SQL Injection**: Gunakan parameterized queries (sudah diimplementasi)

### 🔐 Best Practices

```javascript
// ❌ JANGAN: Plain text password
const user = {
  password: "password123"  // Tidak aman!
}

// ✅ BENAR: Hashed password
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash("password123", 10);
const user = {
  password: hashedPassword  // Aman!
}
```

---

## 📋 Error Handling

Semua services menggunakan format error response yang konsisten:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detail error message"
}
```

### 📊 Status Codes

| Code | Deskripsi |
|------|-----------|
| `200` | ✅ Success |
| `201` | ✅ Created |
| `400` | ❌ Bad Request (validation error) |
| `404` | ❌ Not Found |
| `500` | ❌ Internal Server Error |

---

## 🗂️ .gitignore

File `.gitignore` di root mengabaikan:

```
# Dependencies
**/node_modules

# Environment variables
**/.env
**/.env.local
**/.env.*.local

# Logs
**/logs
**/*.log

# OS files
.DS_Store
Thumbs.db
```

---

## 👥 Kontributor

<div align="center">

**Zaki Affandi**  
*Perwakilan Kelompok 1 - UTS base projek matkul IAE*

</div>

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademis.

---

<div align="center">

**Last Updated:** November 2025

Made with ❤️ using Node.js & Express

</div>
