# ScheduleService - API Provider untuk Jadwal Perjalanan Bus

**API Provider untuk Mengelola Data Jadwal Perjalanan Bus**

## Deskripsi

ScheduleService adalah microservice yang bertanggung jawab untuk mengelola data jadwal perjalanan bus pada sistem TransTrack. Service ini menyediakan CRUD operations untuk jadwal perjalanan yang menghubungkan rute, bus, dan pengemudi.

## Fitur

- ✅ CRUD operations untuk jadwal perjalanan
- ✅ Filter berdasarkan route, bus, atau driver
- ✅ Pagination support
- ✅ Swagger documentation
- ✅ Health check endpoint
- ✅ PostgreSQL database dengan migration

## Setup

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Setup Database

Copy `env.example` ke `.env`:

```bash
cp env.example .env
```

Sesuaikan konfigurasi database di `.env` sesuai dengan setup PostgreSQL Anda.

### 3️⃣ Jalankan Migrasi

```bash
npm run migrate
```

Script `migrate` akan:
- ✅ Membuat extension `pgcrypto` jika belum ada
- ✅ Membuat tabel `schedules` jika belum ada
- ✅ Membuat index pada `route_id`, `bus_id`, `driver_id`, `time`, dan `ticket_id`
- ✅ Mencatat migration di tabel `pgmigrations_schedules`

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
http://localhost:3005/api/schedules
```

### 📋 Endpoints Overview

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/schedules` | Mendapatkan semua jadwal |
| `GET` | `/api/schedules/:id` | Mendapatkan jadwal berdasarkan ID |
| `POST` | `/api/schedules` | Membuat jadwal baru |
| `PUT` | `/api/schedules/:id` | Update seluruh data jadwal |
| `DELETE` | `/api/schedules/:id` | Menghapus jadwal |
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger documentation |

---

### 1. GET /api/schedules

Mendapatkan semua jadwal dengan pagination dan filtering.

**Query Parameters:**

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `routeId` | string | - | Filter berdasarkan route ID |
| `busId` | string | - | Filter berdasarkan bus ID |
| `driverId` | string | - | Filter berdasarkan driver ID |
| `limit` | integer | 100 | Jumlah maksimal jadwal |
| `offset` | integer | 0 | Offset untuk pagination |

**Example Request:**
```bash
curl http://localhost:3005/api/schedules?routeId=550e8400-e29b-41d4-a716-446655440001&limit=10&offset=0
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "routeId": "550e8400-e29b-41d4-a716-446655440001",
      "routeName": "Jakarta - Bandung",
      "busId": "BUS-001",
      "busPlate": "B 1234 CD",
      "driverId": "550e8400-e29b-41d4-a716-446655440002",
      "driverName": "Budi Santoso",
      "time": "2025-11-10T09:00:00.000Z",
      "ticketId": "550e8400-e29b-41d4-a716-446655440003",
      "createdAt": "2025-11-05T10:00:00.000Z",
      "updatedAt": "2025-11-05T10:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

---

### 2. GET /api/schedules/:id

Mendapatkan jadwal berdasarkan ID.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID jadwal |

**Example Request:**
```bash
curl http://localhost:3005/api/schedules/550e8400-e29b-41d4-a716-446655440000
```

---

### 3. POST /api/schedules

Membuat jadwal baru.

**Request Body:**

```json
{
  "routeId": "550e8400-e29b-41d4-a716-446655440001",
  "routeName": "Jakarta - Bandung",
  "busId": "BUS-001",
  "busPlate": "B 1234 CD",
  "driverId": "550e8400-e29b-41d4-a716-446655440002",
  "driverName": "Budi Santoso",
  "time": "2025-11-10T09:00:00Z",
  "ticketId": "550e8400-e29b-41d4-a716-446655440003"
}
```

**Required Fields:**
- ✅ `routeId` - ID rute
- ✅ `routeName` - Nama rute
- ✅ `busId` - ID bus
- ✅ `busPlate` - Plat nomor bus
- ✅ `driverId` - ID pengemudi
- ✅ `driverName` - Nama pengemudi
- ✅ `time` - Waktu keberangkatan (ISO 8601 format)

**Optional Fields:**
- `ticketId` - ID tiket terkait

**Example Request:**
```bash
curl -X POST http://localhost:3005/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "550e8400-e29b-41d4-a716-446655440001",
    "routeName": "Jakarta - Bandung",
    "busId": "BUS-001",
    "busPlate": "B 1234 CD",
    "driverId": "550e8400-e29b-41d4-a716-446655440002",
    "driverName": "Budi Santoso",
    "time": "2025-11-10T09:00:00Z"
  }'
```

---

### 4. PUT /api/schedules/:id

Update seluruh data jadwal.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID jadwal |

**Request Body:** Sama seperti POST

---

### 5. DELETE /api/schedules/:id

Menghapus jadwal.

**Path Parameters:**

| Parameter | Type | Required | Deskripsi |
|-----------|------|----------|-----------|
| `id` | UUID | Yes | ID jadwal |

**Example Request:**
```bash
curl -X DELETE http://localhost:3005/api/schedules/550e8400-e29b-41d4-a716-446655440000
```

---

## 📊 Database Schema

### Tabel: schedules

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key (auto-generated) |
| `route_id` | TEXT | ID rute |
| `route_name` | TEXT | Nama rute |
| `bus_id` | TEXT | ID bus |
| `bus_plate` | TEXT | Plat nomor bus |
| `driver_id` | TEXT | ID pengemudi |
| `driver_name` | TEXT | Nama pengemudi |
| `time` | TIMESTAMPTZ | Waktu keberangkatan |
| `ticket_id` | TEXT | ID tiket terkait (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp pembuatan |
| `updated_at` | TIMESTAMPTZ | Timestamp pembaruan |

### Indexes

- `schedules_route_id_idx` - Index untuk query berdasarkan route ID
- `schedules_bus_id_idx` - Index untuk query berdasarkan bus ID
- `schedules_driver_id_idx` - Index untuk query berdasarkan driver ID
- `schedules_time_idx` - Index untuk sorting berdasarkan waktu
- `schedules_ticket_id_idx` - Index untuk query berdasarkan ticket ID

---

## 🔗 Links

- 📖 Swagger: `http://localhost:3005/api-docs`
- ❤️ Health: `http://localhost:3005/health`

---

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | 3005 | Port untuk ScheduleService |
| `NODE_ENV` | development | Environment mode |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | transtrack_db | Nama database |
| `DB_USER` | postgres | PostgreSQL user |
| `DB_PASSWORD` | - | PostgreSQL password (boleh kosong untuk trust auth) |
| `DB_SSL` | false | Enable SSL untuk database connection |

---

## Error Handling

Semua error response mengikuti format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detail error message"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Catatan

- ✅ Semua timestamp menggunakan format ISO 8601
- ✅ ID menggunakan UUID format
- ✅ Data diurutkan berdasarkan waktu (`time ASC`) secara default
- ✅ Pagination default: limit 100, offset 0

