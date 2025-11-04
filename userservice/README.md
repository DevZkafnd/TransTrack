# 👤 UserService

<div align="center">

**API Provider untuk Mengelola Data Master Pengguna/Penumpang**

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D.svg)](https://swagger.io/)

**Port:** `3002` | **Base URL:** `http://localhost:3002`

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
- [🔒 Security Notes](#-security-notes)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env dengan konfigurasi database Anda (PORT=3002)

# 3. Setup database
npm run setup

# 4. Run server
npm run dev
```

Server akan berjalan di `http://localhost:3002`

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
PORT=3002
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
- ✅ Membuat tabel `users` jika belum ada
- ✅ Membuat constraint unique pada `email` dan `phone`
- ✅ Membuat index pada `email` dan `phone`
- ✅ Mencatat migration di tabel `pgmigrations_user`

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
http://localhost:3002/api/users
```

### 📋 Endpoints Overview

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/users` | Mendapatkan semua pengguna |
| `GET` | `/api/users/:id` | Mendapatkan pengguna berdasarkan ID |
| `POST` | `/api/users/register` | Mendaftarkan pengguna baru |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

### 1. GET /api/users

Mendapatkan semua pengguna dengan pagination.

**Query Parameters:**

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `limit` | integer | 100 | Jumlah maksimal pengguna |
| `offset` | integer | 0 | Offset untuk pagination |

**Example Request:**
```bash
curl http://localhost:3002/api/users?limit=10&offset=0
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayId": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+6281234567890",
      "createdAt": "2025-11-04T10:00:00.000Z",
      "updatedAt": "2025-11-04T10:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

> **⚠️ Note:** Password tidak ditampilkan dalam response untuk keamanan.

---

### 2. GET /api/users/:id

Mendapatkan pengguna berdasarkan ID.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID pengguna |

**Example Request:**
```bash
curl http://localhost:3002/api/users/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+6281234567890",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

---

### 3. POST /api/users/register

Mendaftarkan pengguna baru.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+6281234567890",
  "password": "SecurePassword123!"
}
```

**Required Fields:**
- ✅ `name` - Nama lengkap pengguna
- ✅ `email` - Email pengguna (harus unique, format email valid)
- ✅ `phone` - Nomor telepon (harus unique)
- ✅ `password` - Password pengguna

**Example Request:**
```bash
curl -X POST http://localhost:3002/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+6281234567890",
    "password": "SecurePassword123!"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Pengguna berhasil didaftarkan",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayId": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+6281234567890",
    "createdAt": "2025-11-04T10:00:00.000Z",
    "updatedAt": "2025-11-04T10:00:00.000Z"
  }
}
```

> **⚠️ Security Note:** Password disimpan sebagai plain text. Untuk production, WAJIB menggunakan bcrypt.

---

### 4. GET /health

Health check endpoint.

**Example Response:**
```json
{
  "status": "OK",
  "service": "UserService",
  "pesan": "Layanan berjalan dengan baik",
  "timestamp": "2025-11-04T10:00:00.000Z"
}
```

---

## 📊 Database Schema

### Tabel `users`

| Column | Type | Constraints | Deskripsi |
|--------|------|-------------|-----------|
| `id` | UUID | PRIMARY KEY | ID pengguna (auto-generated) |
| `name` | TEXT | NOT NULL | Nama lengkap pengguna |
| `email` | TEXT | NOT NULL, UNIQUE | Email pengguna (unique) |
| `phone` | TEXT | NOT NULL, UNIQUE | Nomor telepon (unique) |
| `password` | TEXT | NOT NULL | Password pengguna |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu pembuatan |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Waktu update |

### Indexes

- `users.email` - Index untuk query berdasarkan email
- `users.phone` - Index untuk query berdasarkan phone

### Constraints

- Unique constraint pada `email` - Mencegah duplikasi email
- Unique constraint pada `phone` - Mencegah duplikasi nomor telepon

---

## 🧪 Testing

### Menggunakan Swagger UI

1. Buka `http://localhost:3002/api-docs`
2. Pilih endpoint yang ingin diuji
3. Klik **"Try it out"**
4. Isi request body (jika diperlukan)
5. Klik **"Execute"**

### Contoh curl Commands

```bash
# Get all users
curl http://localhost:3002/api/users

# Get users with pagination
curl http://localhost:3002/api/users?limit=10&offset=0

# Get user by ID
curl http://localhost:3002/api/users/550e8400-e29b-41d4-a716-446655440000

# Register new user
curl -X POST http://localhost:3002/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+6281234567890",
    "password": "SecurePassword123!"
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
userservice/
├── config/
│   ├── db.js                   # Database connection
│   ├── swagger.js              # Swagger configuration
│   └── migration.config.js     # Migration configuration
├── migrations/
│   └── 20251105003100_initial_schema.js  # Initial migration
├── routes/
│   └── users.js                # API routes
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

- **Table:** `pgmigrations_user`
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
| `400` | Bad Request | Validation error, duplicate email/phone |
| `404` | Not Found | User dengan ID tidak ditemukan |
| `500` | Internal Server Error | Database error, server error |

### Common Errors

#### 1. Duplicate Email (400)
```json
{
  "success": false,
  "error": "Email duplikat",
  "message": "Email sudah terdaftar"
}
```

#### 2. Duplicate Phone (400)
```json
{
  "success": false,
  "error": "Nomor telepon duplikat",
  "message": "Nomor telepon sudah terdaftar"
}
```

#### 3. Invalid Email Format (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "Format email tidak valid"
}
```

#### 4. User Not Found (404)
```json
{
  "success": false,
  "error": "Pengguna tidak ditemukan",
  "message": "Pengguna dengan ID xxx tidak ditemukan"
}
```

#### 5. Validation Error (400)
```json
{
  "success": false,
  "error": "Kesalahan validasi",
  "message": "name, email, phone, dan password wajib diisi"
}
```

---

## 🔒 Security Notes

### ⚠️ Password Storage

**Current Implementation:**
- Password disimpan sebagai **plain text** di database
- **TIDAK AMAN** untuk production

### ✅ Recommended Implementation

Untuk production, gunakan bcrypt untuk hashing password:

```javascript
const bcrypt = require('bcrypt');

// Hash password sebelum menyimpan
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verifikasi password saat login
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### 📋 Production Checklist

- [ ] Install bcrypt: `npm install bcrypt`
- [ ] Hash password sebelum menyimpan ke database
- [ ] Jangan return password dalam response API
- [ ] Implement rate limiting untuk endpoint register
- [ ] Gunakan HTTPS untuk production
- [ ] Validasi strength password (minimal 8 karakter, kombinasi huruf/angka)

---

## 📝 Notes

- ✅ Service menggunakan database yang sama dengan services lain (`transtrack_db`)
- ✅ Migration table terpisah: `pgmigrations_user`
- ✅ Port default: `3002`
- ✅ Semua endpoint menggunakan format JSON
- ✅ Unique constraint pada `email` dan `phone` - akan menghasilkan error 400 jika duplikat
- ✅ Email validation menggunakan regex pattern
- ✅ Password tidak ditampilkan dalam response (write-only)
- ⚠️ **Password disimpan sebagai plain text** - WAJIB hash dengan bcrypt untuk production

---

<div align="center">

**UserService** - Part of TransTrack Microservice Architecture

Made with ❤️ using Node.js & Express

</div>
