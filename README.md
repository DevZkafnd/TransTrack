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

- [🧭 Deskripsi Singkat](#-deskripsi-singkat)
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
- [⚙️ Menjalankan Semua Services (concurrently)](#️-menjalankan-semua-services-concurrently)
  - [Alternatif: Jalankan per Service (manual)](#alternatif-jalankan-per-service-manual)
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
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │          schedules                          │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         MaintenanceService  :3003                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         ScheduleService  :3005                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧭 Deskripsi Singkat

TransTrack adalah sistem manajemen transportasi berbasis arsitektur microservice. Setiap service bertanggung jawab pada domain tertentu (rute, pengemudi, pengguna, perawatan), menggunakan PostgreSQL, terdokumentasi dengan Swagger, dan dapat dijalankan mandiri. Frontend React disediakan sebagai antarmuka dasar untuk demonstrasi.

---

## 🚀 Mulai Cepat (Clone & Jalankan)

1) Clone repo

```bash
git clone https://github.com/DevZkafnd/TransTrack.git
cd TransTrack
```

2) Jalankan semua service + frontend (auto install deps + migrate semua service):

```bash
npm run dev
```

3) Buka aplikasi dan dokumentasi:

- Frontend (React): `http://localhost:4000`
- **GatewayService Swagger**: `http://localhost:8000/api-docs` (Entry point tunggal)
- RouteService Swagger: `http://localhost:3000/api-docs`
- DriverService Swagger: `http://localhost:3001/api-docs`
- UserService Swagger: `http://localhost:3002/api-docs`
- MaintenanceService Swagger: `http://localhost:3003/api-docs`
- TicketService Swagger: `http://localhost:3004/api-docs`
- ScheduleService Swagger: `http://localhost:3005/api-docs`

4) Variabel lingkungan (.env) per service

- Salin `env.example` → `.env` di setiap folder service dalam `backend/*service/` lalu sesuaikan koneksi PostgreSQL.
- Untuk frontend, Anda tidak wajib mengubah `.env` saat pengembangan: klien otomatis menggunakan GatewayService di `http://localhost:8000/api` (default).
- GatewayService mengkonfigurasi URL semua service melalui environment variables (lihat `backend/gatewayservice/env.example`).

5) Login/Daftar & Pembelian Tiket

- Gunakan modal login/daftar dari frontend (menyambung ke `UserService` via GatewayService).
- Halaman pembelian tiket ada di `/ticket`. Saat "Bayar Sekarang":
  - Frontend mengirim request ke GatewayService
  - GatewayService meneruskan ke TicketService
  - **TicketService memvalidasi user dengan memanggil UserService** (inter-service communication)
  - Jika user valid, tiket dibuat dan ditandai success

6) Troubleshooting umum

- Port bentrok → hentikan proses lama (Windows PowerShell: `netstat -ano | findstr :<PORT>` lalu kill PID) atau ubah `PORT` di `.env` service terkait.
- Connection refused ke API → pastikan service tujuan up (cek `/health`) dan base URL frontend sesuai (frontend fallback otomatis ke 3002 untuk user saat dev).
- Tabel database hilang → jalankan ulang `npm run dev` (script `predev` akan menjalankan migrasi semua service otomatis).
- Atau jalankan `npm run setup` untuk install dependencies + migrasi semua service.

7) Repository

- GitHub: `https://github.com/DevZkafnd/TransTrack.git`

---

## 📦 Services yang Tersedia

| Service | Port | 🎯 Tugas | 📖 Dokumentasi | 🔗 Health Check |
|---------|------|----------|----------------|-----------------|
| **GatewayService** | `8000` | API Gateway - Entry point tunggal untuk frontend | [`/api-docs`](http://localhost:8000/api-docs) | [`/health`](http://localhost:8000/health) |
| **RouteService** | `3000` | Mengelola data master rute dan halte | [`/api-docs`](http://localhost:3000/api-docs) | [`/health`](http://localhost:3000/health) |
| **DriverService** | `3001` | Mengelola data master pengemudi | [`/api-docs`](http://localhost:3001/api-docs) | [`/health`](http://localhost:3001/health) |
| **UserService** | `3002` | Mengelola data master pengguna/penumpang | [`/api-docs`](http://localhost:3002/api-docs) | [`/health`](http://localhost:3002/health) |
| **MaintenanceService** | `3003` | Mengelola data master riwayat dan jadwal perbaikan bus | [`/api-docs`](http://localhost:3003/api-docs) | [`/health`](http://localhost:3003/health) |
| **TicketService** | `3004` | Mengelola pembelian dan validasi tiket | [`/api-docs`](http://localhost:3004/api-docs) | [`/health`](http://localhost:3004/health) |
| **ScheduleService** | `3005` | Mengelola data jadwal perjalanan bus | [`/api-docs`](http://localhost:3005/api-docs) | [`/health`](http://localhost:3005/health) |

---

## 📁 Struktur Proyek

```
TransTrack/
│
├── 📂 backend/
│   ├── 📂 routeservice/                 # RouteService (Port 3000)
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
│   ├── 📂 driverservice/                # DriverService (Port 3001)
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
│   ├── 📂 userservice/                  # UserService (Port 3002)
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
│   ├── 📂 maintenanceservice/           # MaintenanceService (Port 3003)
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
│   ├── 📂 ticketservice/                # TicketService (Port 3004)
│   ├── 📂 config/
│   ├── 📂 routes/
│   │   └── 📄 tickets.js              # Endpoint untuk tickets
│   ├── 📂 scripts/
│   │   └── 📄 migrate.js
│   ├── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 env.example
│   └── 📄 README.md
│
│   ├── 📂 scheduleservice/              # ScheduleService (Port 3005)
│   ├── 📂 config/
│   ├── 📂 migrations/
│   │   └── 📄 20251105120000_initial_schema.js
│   ├── 📂 routes/
│   │   └── 📄 schedules.js            # Endpoint untuk schedules
│   ├── 📂 scripts/
│   │   ├── 📄 migrate.js
│   │   └── 📄 setup-database.js
│   ├── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 env.example
│   └── 📄 README.md
│
├── 📂 frontend/                         # Aplikasi React.js (homepage)
├── 📄 package.json                      # Root package.json
├── 📄 package-lock.json
└── 📄 README.md                         # Dokumentasi utama (file ini)
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
cd backend/routeservice
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
cd backend/driverservice
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
cd backend/userservice
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
cd backend/maintenanceservice
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

### 📅 ScheduleService (Port 3005)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/schedules` | Mendapatkan semua jadwal |
| `GET` | `/api/schedules/:id` | Mendapatkan jadwal berdasarkan ID |
| `POST` | `/api/schedules` | Membuat jadwal baru |
| `PUT` | `/api/schedules/:id` | Update seluruh data jadwal |
| `DELETE` | `/api/schedules/:id` | Menghapus jadwal |

**🔗 Links:**
- 📖 Swagger: `http://localhost:3005/api-docs`
- ❤️ Health: `http://localhost:3005/health`

---

## 🛠️ Teknologi yang Digunakan

Backend dan frontend menggunakan teknologi berikut:

| Teknologi | Versi | Deskripsi |
|-----------|-------|-----------|
| **Node.js** | v16+ | Runtime environment |
| **Express.js** | 4.18+ | Web framework (backend services) |
| **PostgreSQL** | 13+ | Database |
| **pg** | 8.16+ | PostgreSQL driver untuk Node.js |
| **node-pg-migrate** | 8.0+ | Database migrations |
| **Swagger (OpenAPI)** | 3.0 | Dokumentasi API |
| **swagger-jsdoc** | 6.2+ | Generate Swagger dari JSDoc comments |
| **swagger-ui-express** | 5.0+ | UI untuk dokumentasi Swagger |
| **cors** | 2.8+ | Cross-Origin Resource Sharing |
| **dotenv** | 16.3+ | Environment variables management |
| **React** | 18 | Frontend library |
| **react-scripts** | 5 | CRA tooling untuk development/build |
| **axios** | 1.x | HTTP client di frontend |
| **concurrently** | 8 | Menjalankan banyak perintah dev secara paralel (monorepo root) |

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

## ⚙️ Menjalankan Semua Services (concurrently)

Cara paling cepat untuk development adalah menggunakan `concurrently` dari root monorepo. Ini akan menjalankan frontend dan seluruh backend services sekaligus dalam satu terminal.

### 1) Instal dependencies

Jalankan per service (pertama kali saja):

```bash
# Backend services
cd backend/routeservice && npm install
cd ../driverservice && npm install
cd ../userservice && npm install
cd ../maintenanceservice && npm install

# Frontend
cd ../../../frontend && npm install
```

Di root monorepo, pastikan dev tool sudah terpasang (sudah disetup dalam repo):

```bash
cd ..
npm install   # memastikan devDependency root (concurrently) terpasang
```

### 2) Setup environment

Untuk tiap service, salin `env.example` ke `.env` lalu sesuaikan:

```bash
cd backend/<nama-service>
cp env.example .env
# edit .env (PORT, DB_*)
```

### 3) Jalankan migration/setup database

```bash
cd backend/<nama-service>
npm run setup    # atau: npm run migrate
```

### 4) Jalankan semua layanan sekaligus

Dari folder root proyek:

```bash
npm run dev
```

Perintah ini mengeksekusi skrip berikut dari `package.json` root:

```json
{
  "scripts": {
    "dev:frontend": "npm --prefix frontend start",
    "dev:driverservice": "npm --prefix backend/driverservice start",
    "dev:maintenanceservice": "npm --prefix backend/maintenanceservice start",
    "dev:routeservice": "npm --prefix backend/routeservice start",
    "dev:userservice": "npm --prefix backend/userservice start",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:driverservice\" \"npm run dev:maintenanceservice\" \"npm run dev:routeservice\" \"npm run dev:userservice\""
  }
}
```

### Menghentikan semua server

Tekan `Ctrl + C` sekali di terminal yang menjalankan `npm run dev`. `concurrently` akan meneruskan sinyal ke semua proses dan menghentikan semuanya.

Jika setelah berhenti masih ada port yang terpakai, tunggu beberapa detik lalu jalankan lagi. Bila perlu, tutup terminal lama atau restart proses Node yang tersisa.

### Catatan tentang Docker

Seluruh berkas Docker yang terdeteksi telah dihapus untuk menyederhanakan workflow development lokal berbasis `concurrently`.

### Alternatif: Jalankan per Service (manual)

Jika ingin menjalankan manual per terminal, ikuti pola berikut:

```bash
cd backend/routeservice && npm run dev
cd backend/driverservice && npm run dev
cd backend/userservice && npm run dev
cd backend/maintenanceservice && npm run dev
cd backend/ticketservice && npm run dev
```

---

## 🧭 Navigasi Dokumentasi Lanjutan

- Panduan Frontend (Color Palette, menambah halaman baru, integrasi API): `frontend/README.md`
- Panduan Backend (membuat provider/API baru, dependensi, wiring monorepo): `backend/README.md`

---

## 📚 Dokumentasi Detail

Setiap service memiliki README.md sendiri dengan dokumentasi lengkap:

- 📖 [`backend/routeservice/README.md`](backend/routeservice/README.md)
- 📖 [`backend/driverservice/README.md`](backend/driverservice/README.md)
- 📖 [`backend/userservice/README.md`](backend/userservice/README.md)
- 📖 [`backend/maintenanceservice/README.md`](backend/maintenanceservice/README.md)

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

Sekian terimakasih. Semoga bermanfaat

</div>
