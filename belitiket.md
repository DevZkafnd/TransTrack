# Modul Pembelajaran: Beli Tiket (Ticket Purchase)

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Arsitektur & Komunikasi API](#arsitektur--komunikasi-api)
3. [Fungsionalitas Sistem](#fungsionalitas-sistem)
4. [Dokumentasi API (Swagger)](#dokumentasi-api-swagger)
5. [Presentasi & Pemahaman Konsep](#presentasi--pemahaman-konsep)
6. [Testing & Validasi](#testing--validasi)

---

## Overview

**Beli Tiket** adalah fitur yang memungkinkan pengguna untuk mencari jadwal bus dan membeli tiket. Fitur ini mencakup:
- Pencarian jadwal berdasarkan rute
- Validasi tiket dengan kode tiket
- Riwayat pembelian tiket
- Proses pembayaran tiket

**Lokasi File:**
- Frontend: `frontend/src/components/TicketingPage.js`
- Modal: `frontend/src/components/TicketPurchaseModal.js`
- API Service: `frontend/src/services/apiService.js`
- Gateway Endpoint: `backend/gatewayservice/routes/gateway.js`

---

## Arsitektur & Komunikasi API

### 1. Arsitektur Microservices

Fitur **Beli Tiket** menggunakan arsitektur microservices dengan **lebih dari 2 layanan** yang saling berkomunikasi:

```
┌─────────────┐
│   Frontend  │
│ (React App) │
└──────┬──────┘
       │ HTTP Request
       │ POST /api/tickets
       │ GET /api/schedules
       │ GET /api/tickets/validate/:code
       ▼
┌─────────────────────────────────────────────────┐
│           API Gateway (Port 3007)               │
│  ┌───────────────────────────────────────────┐  │
│  │  Proxy to multiple services              │  │
│  └───────────────────────────────────────────┘  │
└──────┬──────┬──────┬──────┬─────────────────────┘
       │      │      │      │
       │      │      │      │
       ▼      ▼      ▼      ▼
   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
   │Tick │ │Sched│ │User │ │Route│
   │Serv │ │Serv │ │Serv │ │Serv │
   │:3004│ │:3005│ │:3002│ │:3000│
   └─────┘ └─────┘ └─────┘ └─────┘
```

### 2. Komunikasi Dinamis Antar Layanan

**TicketService** melakukan komunikasi dinamis ke **UserService** untuk validasi user:

#### Langkah 1: Pencarian Jadwal (ScheduleService)
```javascript
GET http://localhost:3007/api/schedules
```
- **Service**: ScheduleService (Port 3005) via Gateway
- **Method**: GET
- **Response**: Daftar semua schedule dengan informasi: `id`, `routeName`, `route`, `time`, `busId`, `driverId`

**Flow:**
```
Frontend → Gateway → ScheduleService
                  → Return schedules to Frontend
```

#### Langkah 2: Pembuatan Tiket (TicketService → UserService)
```javascript
POST http://localhost:3007/api/tickets
Body: {
  "userId": "user-id-123",
  "scheduleId": "schedule-id-456",
  "scheduleLabel": "Jakarta - Bandung",
  "amount": 20000,
  "currency": "IDR"
}
```

**Komunikasi Dinamis:**
```
Frontend → Gateway → TicketService
                  → TicketService validates userId
                  → TicketService calls UserService (GET /api/users/:userId)
                  → UserService returns user data
                  → TicketService creates ticket
                  → Return ticket to Frontend
```

**Detail Komunikasi:**
1. **TicketService menerima request** dari Gateway
2. **TicketService memvalidasi userId** dengan memanggil UserService:
   ```javascript
   GET http://localhost:3002/api/users/:userId
   ```
3. **UserService mengembalikan data user** atau 404 jika tidak ditemukan
4. **TicketService membuat tiket** jika user valid
5. **TicketService mengembalikan tiket** ke Gateway → Frontend

#### Langkah 3: Update Status Tiket
```javascript
PATCH http://localhost:3007/api/tickets/:id
Body: {
  "status": "success",
  "paymentRef": "wallet"
}
```
- **Service**: TicketService (Port 3004) via Gateway
- **Method**: PATCH
- **Response**: Tiket yang sudah di-update

#### Langkah 4: Validasi Tiket
```javascript
GET http://localhost:3007/api/tickets/validate/:code
```
- **Service**: TicketService (Port 3004) via Gateway
- **Method**: GET
- **Response**: Status validasi tiket

#### Langkah 5: Riwayat Tiket User
```javascript
GET http://localhost:3007/api/tickets?userId=:userId
```
- **Service**: TicketService (Port 3004) via Gateway
- **Method**: GET
- **Response**: Daftar tiket milik user

### 3. Metode API Lengkap

Fitur ini menggunakan **semua metode HTTP**:

#### GET - Mengambil Data
- ✅ `GET /api/schedules` → Mengambil daftar schedule
- ✅ `GET /api/tickets/validate/:code` → Validasi tiket
- ✅ `GET /api/tickets?userId=:userId` → Riwayat tiket user

#### POST - Membuat Data Baru
- ✅ `POST /api/tickets` → Membuat tiket baru

#### PATCH - Update Sebagian Data
- ✅ `PATCH /api/tickets/:id` → Update status tiket

#### DELETE - Hapus Data (Tersedia di API, tidak digunakan di fitur ini)
- ✅ `DELETE /api/tickets/:id` → Hapus tiket (jika diperlukan)

### 4. Integrasi Lancar

- **Error Handling**: 
  - Jika UserService tidak tersedia → TicketService mengembalikan error 503
  - Jika user tidak ditemukan → TicketService mengembalikan error 404
  - Jika schedule tidak ditemukan → Frontend menampilkan error message

- **Transaction-like Behavior**:
  - Tiket dibuat dengan status "pending"
  - Setelah pembayaran berhasil, status di-update menjadi "success"
  - Jika pembayaran gagal, tiket tetap "pending"

- **Validation Chain**:
  ```
  Frontend validates → Gateway validates → TicketService validates → UserService validates
  ```

---

## Fungsionalitas Sistem

### 1. Fitur yang Berfungsi

✅ **Pencarian Jadwal**
- Input field untuk mencari jadwal berdasarkan nama rute
- Filter jadwal secara real-time
- Menampilkan daftar jadwal yang tersedia

✅ **Pemilihan Jadwal**
- Dropdown untuk memilih jadwal dari hasil pencarian
- Menampilkan informasi jadwal: rute, waktu, bus, supir
- Validasi: jadwal harus dipilih sebelum membeli

✅ **Pembelian Tiket**
- Modal form untuk pembelian tiket
- Input: metode pembayaran, catatan
- Validasi: user harus login
- Proses: create ticket → update status → success notification

✅ **Validasi Tiket**
- Input field untuk kode tiket
- Validasi tiket dengan endpoint `/api/tickets/validate/:code`
- Menampilkan status validasi (valid/tidak valid)

✅ **Riwayat Tiket**
- Menampilkan daftar tiket milik user yang login
- Auto-load saat user login
- Refresh otomatis setelah pembelian tiket

### 2. Stabilitas dan Kecepatan

- **Optimized API Calls**: 
  - Pencarian schedule hanya di-fetch sekali saat component mount
  - Riwayat tiket di-fetch hanya saat user login
  - Validasi tiket hanya saat user submit

- **Loading States**: 
  - Loading indicator saat fetch data
  - Disable button saat proses pembelian
  - Loading state untuk setiap operasi async

- **Error Handling**:
  - Try-catch untuk setiap API call
  - User-friendly error messages
  - Fallback untuk service yang tidak tersedia

### 3. Tanpa Error

- **Validasi Input**:
  - Jadwal harus dipilih sebelum membeli
  - User harus login sebelum membeli
  - Kode tiket harus diisi sebelum validasi

- **Error Messages**:
  - "User tidak ditemukan. Silakan login kembali." (404)
  - "Service tidak tersedia. Silakan coba lagi nanti." (503)
  - "Gagal membuat tiket" (500)
  - "Tiket valid" / "Tiket tidak valid / belum dibayar" (validasi)

- **Null Safety**:
  - Check null/undefined sebelum menggunakan data
  - Default values untuk data yang tidak tersedia

### 4. Consumer (Frontend) Berhasil

Frontend berhasil memanggil API Gateway dan menampilkan data dari **4 layanan**:
- ✅ ScheduleService → Data schedule untuk pencarian
- ✅ TicketService → Membuat, update, validasi tiket
- ✅ UserService → Validasi user (via TicketService)
- ✅ RouteService → Data route (via ScheduleService)

---

## Dokumentasi API (Swagger)

### 1. Endpoint yang Didokumentasikan

**Endpoints:**
- `GET /api/schedules` - Mengambil daftar schedule
- `POST /api/tickets` - Membuat tiket baru
- `PATCH /api/tickets/:id` - Update status tiket
- `GET /api/tickets/validate/:code` - Validasi tiket
- `GET /api/tickets?userId=:userId` - Riwayat tiket user

**Swagger Documentation** tersedia di:
```
http://localhost:3007/api-docs
http://localhost:3004/api-docs (TicketService)
http://localhost:3005/api-docs (ScheduleService)
```

### 2. Detail Endpoint

#### A. GET /api/schedules

**Request:**
```http
GET /api/schedules
Host: localhost:3007
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-id-123",
      "routeName": "Jakarta - Bandung",
      "route": "Jakarta - Bandung",
      "time": "2024-01-15T08:00:00Z",
      "busId": "bus-id-123",
      "driverId": "driver-id-123"
    }
  ]
}
```

#### B. POST /api/tickets

**Request:**
```http
POST /api/tickets
Host: localhost:3007
Content-Type: application/json

{
  "userId": "user-id-123",
  "scheduleId": "schedule-id-456",
  "scheduleLabel": "Jakarta - Bandung",
  "amount": 20000,
  "currency": "IDR"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "ticket-id-789",
    "userId": "user-id-123",
    "scheduleId": "schedule-id-456",
    "scheduleLabel": "Jakarta - Bandung",
    "amount": 20000,
    "currency": "IDR",
    "status": "pending",
    "ticketCode": "TKT-20240115-001",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": "User tidak ditemukan",
  "message": "User dengan ID user-id-123 tidak ditemukan"
}
```

**Response Error (503):**
```json
{
  "success": false,
  "error": "Service tidak tersedia",
  "message": "UserService tidak dapat diakses"
}
```

#### C. PATCH /api/tickets/:id

**Request:**
```http
PATCH /api/tickets/ticket-id-789
Host: localhost:3007
Content-Type: application/json

{
  "status": "success",
  "paymentRef": "wallet"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "ticket-id-789",
    "status": "success",
    "paymentRef": "wallet",
    "updatedAt": "2024-01-15T10:05:00Z"
  }
}
```

#### D. GET /api/tickets/validate/:code

**Request:**
```http
GET /api/tickets/validate/TKT-20240115-001
Host: localhost:3007
```

**Response Success (200):**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "id": "ticket-id-789",
    "status": "success",
    "scheduleLabel": "Jakarta - Bandung"
  }
}
```

**Response Success (200) - Invalid:**
```json
{
  "success": true,
  "valid": false,
  "message": "Tiket tidak valid atau belum dibayar"
}
```

#### E. GET /api/tickets?userId=:userId

**Request:**
```http
GET /api/tickets?userId=user-id-123
Host: localhost:3007
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket-id-789",
      "userId": "user-id-123",
      "scheduleId": "schedule-id-456",
      "scheduleLabel": "Jakarta - Bandung",
      "amount": 20000,
      "status": "success",
      "ticketCode": "TKT-20240115-001",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 3. Parameter dan Contoh

#### Parameter untuk POST /api/tickets:
- `userId` (string, required) - ID user yang membeli tiket
- `scheduleId` (string, required) - ID schedule yang dipilih
- `scheduleLabel` (string, required) - Label schedule (untuk display)
- `amount` (number, required) - Harga tiket
- `currency` (string, optional, default: "IDR") - Mata uang

#### Parameter untuk GET /api/tickets:
- `userId` (string, query parameter) - Filter tiket berdasarkan user ID

#### Parameter untuk GET /api/tickets/validate/:code:
- `code` (string, path parameter) - Kode tiket untuk divalidasi

**Contoh Request menggunakan cURL:**

```bash
# Create Ticket
curl -X POST http://localhost:3007/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-123",
    "scheduleId": "schedule-id-456",
    "scheduleLabel": "Jakarta - Bandung",
    "amount": 20000,
    "currency": "IDR"
  }'

# Validate Ticket
curl -X GET http://localhost:3007/api/tickets/validate/TKT-20240115-001

# Get User Tickets
curl -X GET "http://localhost:3007/api/tickets?userId=user-id-123"
```

### 4. Mudah Dipahami

Dokumentasi Swagger mencakup:
- ✅ Deskripsi endpoint yang jelas
- ✅ Contoh request dan response untuk setiap endpoint
- ✅ Schema untuk setiap field (required, type, format)
- ✅ Tag untuk grouping (Tickets, Schedules)
- ✅ Response codes (200, 201, 404, 500, 503)
- ✅ Error responses dengan contoh

### 5. Dapat Diakses

Swagger UI dapat diakses di:
- Gateway: `http://localhost:3007/api-docs`
- TicketService: `http://localhost:3004/api-docs`
- ScheduleService: `http://localhost:3005/api-docs`

### 6. File Spesifikasi

File OpenAPI Specification dapat di-generate dari Swagger UI atau tersedia di:
- `backend/gatewayservice/config/swagger.js`
- `backend/ticketservice/config/swagger.js`
- `backend/scheduleservice/config/swagger.js`

---

## Presentasi & Pemahaman Konsep

### 1. Konsep API

**RESTful API** menggunakan metode HTTP standar:

- **GET**: Mengambil data (Read)
  - `GET /api/schedules` → Ambil daftar schedule
  - `GET /api/tickets/validate/:code` → Validasi tiket
  - `GET /api/tickets?userId=:userId` → Riwayat tiket

- **POST**: Membuat data baru (Create)
  - `POST /api/tickets` → Buat tiket baru

- **PATCH**: Update sebagian data (Update)
  - `PATCH /api/tickets/:id` → Update status tiket

- **DELETE**: Hapus data (Delete)
  - `DELETE /api/tickets/:id` → Hapus tiket (jika diperlukan)

**JSON Format**: Semua data ditukar dalam format JSON

### 2. Arsitektur Layanan

**Microservices Architecture** dengan komunikasi antar layanan:

**TicketService → UserService:**
- TicketService memvalidasi user sebelum membuat tiket
- Jika user tidak ditemukan, tiket tidak dibuat
- Ini adalah contoh **service-to-service communication**

**Flow Pembelian Tiket:**
```
1. User memilih schedule (ScheduleService)
2. User klik "Beli Tiket"
3. Frontend → Gateway → TicketService
4. TicketService → UserService (validasi user)
5. UserService → TicketService (return user data)
6. TicketService → Database (create ticket)
7. TicketService → Gateway → Frontend (return ticket)
8. Frontend → Gateway → TicketService (update status)
9. TicketService → Database (update ticket status)
10. Frontend menampilkan success message
```

### 3. Komunikasi Antar Layanan

**Synchronous Communication (HTTP/REST):**
- TicketService menunggu response dari UserService
- Jika UserService tidak tersedia, TicketService mengembalikan error 503
- Cocok untuk operasi yang memerlukan validasi real-time

**Error Handling:**
- **404**: User tidak ditemukan → Ticket tidak dibuat
- **503**: Service tidak tersedia → Error message ke user
- **500**: Server error → Error message ke user

### 4. Penggunaan Swagger

**Swagger/OpenAPI** untuk dokumentasi dan testing:

**Fungsi:**
- ✅ Dokumentasi API yang interaktif
- ✅ Testing API langsung dari browser
- ✅ Validasi request/response
- ✅ Generate client code

**Cara Menggunakan:**
1. Buka `http://localhost:3007/api-docs`
2. Pilih endpoint (misal: `POST /api/tickets`)
3. Klik "Try it out"
4. Isi request body
5. Klik "Execute"
6. Lihat response

---

## Testing & Validasi

### 1. Testing dengan Swagger UI

#### Test POST /api/tickets

1. **Buka Swagger UI:**
   ```
   http://localhost:3007/api-docs
   ```

2. **Pilih Endpoint:**
   - Cari `POST /api/tickets` di bagian Tickets

3. **Test Endpoint:**
   - Klik "Try it out"
   - Isi request body:
     ```json
     {
       "userId": "user-id-123",
       "scheduleId": "schedule-id-456",
       "scheduleLabel": "Jakarta - Bandung",
       "amount": 20000,
       "currency": "IDR"
     }
     ```
   - Klik "Execute"
   - Lihat response

4. **Validasi Response:**
   - ✅ Status code: 201 (Created)
   - ✅ `success: true`
   - ✅ `data.id` ada
   - ✅ `data.status: "pending"`
   - ✅ `data.ticketCode` ada

#### Test GET /api/tickets/validate/:code

1. **Pilih Endpoint:**
   - Cari `GET /api/tickets/validate/{code}`

2. **Test Endpoint:**
   - Klik "Try it out"
   - Isi `code` dengan kode tiket yang valid
   - Klik "Execute"
   - Lihat response

3. **Validasi Response:**
   - ✅ Status code: 200
   - ✅ `success: true`
   - ✅ `valid: true` (jika tiket valid dan sudah dibayar)

### 2. Testing dengan Postman

**Create Ticket:**
```http
POST http://localhost:3007/api/tickets
Content-Type: application/json

{
  "userId": "user-id-123",
  "scheduleId": "schedule-id-456",
  "scheduleLabel": "Jakarta - Bandung",
  "amount": 20000,
  "currency": "IDR"
}
```

**Validate Ticket:**
```http
GET http://localhost:3007/api/tickets/validate/TKT-20240115-001
```

**Get User Tickets:**
```http
GET http://localhost:3007/api/tickets?userId=user-id-123
```

### 3. Testing dengan Frontend

1. **Buka aplikasi frontend:**
   ```
   http://localhost:3000
   ```

2. **Navigasi ke halaman "Beli Tiket"**

3. **Test Pencarian Jadwal:**
   - ✅ Input nama rute
   - ✅ Daftar jadwal muncul
   - ✅ Dapat memilih jadwal

4. **Test Pembelian Tiket:**
   - ✅ Pilih jadwal
   - ✅ Klik "Beli Tiket"
   - ✅ Modal form muncul
   - ✅ Isi form dan submit
   - ✅ Success notification muncul
   - ✅ Tiket ditambahkan ke riwayat

5. **Test Validasi Tiket:**
   - ✅ Input kode tiket
   - ✅ Klik "Validasi"
   - ✅ Status validasi muncul

### 4. Testing Error Handling

**Test jika user tidak ditemukan:**
1. Buat tiket dengan `userId` yang tidak ada
2. Validasi: ✅ Error 404, pesan "User tidak ditemukan"

**Test jika service tidak tersedia:**
1. Stop UserService
2. Coba buat tiket
3. Validasi: ✅ Error 503, pesan "Service tidak tersedia"

### 5. Checklist Validasi

- [ ] Endpoint dapat diakses via Swagger UI
- [ ] Response format sesuai dokumentasi
- [ ] Frontend berhasil membuat tiket
- [ ] Frontend berhasil validasi tiket
- [ ] Frontend berhasil menampilkan riwayat tiket
- [ ] Error handling bekerja dengan baik
- [ ] Loading state ditampilkan saat proses
- [ ] User harus login sebelum membeli tiket
- [ ] Jadwal harus dipilih sebelum membeli tiket
- [ ] TicketService berhasil memvalidasi user via UserService

---

## Kesimpulan

Fitur **Beli Tiket** adalah contoh implementasi yang baik dari:
- ✅ **Microservices Architecture** dengan lebih dari 2 layanan
- ✅ **Komunikasi dinamis** antar layanan (TicketService → UserService)
- ✅ **Metode API lengkap** (GET, POST, PATCH)
- ✅ **Dokumentasi API** yang lengkap dengan Swagger
- ✅ **Error handling** yang robust
- ✅ **User experience** yang baik dengan validasi dan feedback

**Teknologi yang digunakan:**
- Frontend: React, React Icons
- Backend: Node.js, Express.js
- API: RESTful API, JSON
- Dokumentasi: Swagger/OpenAPI

---

## Referensi

- **File terkait:**
  - `frontend/src/components/TicketingPage.js`
  - `frontend/src/components/TicketPurchaseModal.js`
  - `frontend/src/services/apiService.js`
  - `backend/gatewayservice/routes/gateway.js`
  - `backend/ticketservice/routes/tickets.js`
  - `backend/scheduleservice/routes/schedules.js`

- **Dokumentasi:**
  - Swagger UI Gateway: `http://localhost:3007/api-docs`
  - Swagger UI TicketService: `http://localhost:3004/api-docs`
  - Swagger UI ScheduleService: `http://localhost:3005/api-docs`
  - OpenAPI Specification: https://swagger.io/specification/

