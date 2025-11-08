# Modul Pembelajaran: Jadwal (Schedule)

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Arsitektur & Komunikasi API](#arsitektur--komunikasi-api)
3. [Fungsionalitas Sistem](#fungsionalitas-sistem)
4. [Dokumentasi API (Swagger)](#dokumentasi-api-swagger)
5. [Presentasi & Pemahaman Konsep](#presentasi--pemahaman-konsep)
6. [Testing & Validasi](#testing--validasi)

---

## Overview

**Jadwal** adalah fitur yang memungkinkan pengguna untuk melihat jadwal bus yang sedang beroperasi dan jadwal aktif milik user. Fitur ini mencakup:
- Daftar bus yang sedang beroperasi (dari BusService + MaintenanceService)
- Jadwal aktif user (dari ScheduleService + TicketService)
- Auto-refresh setiap 5 detik untuk update real-time
- Auto-assign buses saat page refresh

**Lokasi File:**
- Frontend: `frontend/src/pages/SchedulePage.js`
- API Service: `frontend/src/services/apiService.js`
- Gateway Endpoint: `backend/gatewayservice/routes/gateway.js`
- RouteService Endpoint: `backend/routeservice/routes/routes.js`

---

## Arsitektur & Komunikasi API

### 1. Arsitektur Microservices

Fitur **Jadwal** menggunakan arsitektur microservices dengan **lebih dari 2 layanan** yang saling berkomunikasi:

```
┌─────────────┐
│   Frontend  │
│ (React App) │
└──────┬──────┘
       │ HTTP Request
       │ GET /api/dashboard/operating-buses
       │ GET /api/schedules
       │ GET /api/tickets?userId=:userId
       │ POST /api/routes/assign-buses
       ▼
┌─────────────────────────────────────────────────┐
│           API Gateway (Port 3007)                │
│  ┌───────────────────────────────────────────┐  │
│  │  Aggregate & Proxy to services           │  │
│  └───────────────────────────────────────────┘  │
└──────┬──────┬──────┬──────┬──────┬──────────────┘
       │      │      │      │      │
       │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼
   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
   │Bus  │ │Maint│ │Sched│ │Tick │ │Route│
   │Serv │ │Serv │ │Serv │ │Serv │ │Serv │
   │:3006│ │:3003│ │:3005│ │:3004│ │:3000│
   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
```

### 2. Komunikasi Dinamis Antar Layanan

#### A. Bus yang Sedang Beroperasi

**Endpoint**: `GET /api/dashboard/operating-buses`

**Komunikasi Dinamis:**
```
Frontend → Gateway → BusService (GET /api/buses)
                  → MaintenanceService (GET /api/maintenance)
                  → Gateway aggregates data
                  → Return to Frontend
```

**Detail Komunikasi:**
1. **Gateway memanggil BusService:**
   ```javascript
   GET http://localhost:3006/api/buses?limit=1000
   ```
   - Response: Daftar semua bus dengan `id`, `plate`, `model`, `capacity`

2. **Gateway memanggil MaintenanceService:**
   ```javascript
   GET http://localhost:3003/api/maintenance?limit=1000
   ```
   - Response: Daftar maintenance dengan `busId`, `status`

3. **Gateway melakukan aggregation:**
   - Match bus dengan maintenance berdasarkan `busId`
   - Tentukan status: "Beroperasi" jika tidak ada maintenance aktif, "Maintenance" jika ada
   - Gabungkan data bus dengan status

4. **Gateway mengembalikan data** yang sudah di-aggregate:
   ```json
   {
     "success": true,
     "data": [
       {
         "bus": "B 1234 CD",
         "model": "Mercedes-Benz",
         "capacity": 40,
         "rute": "Jakarta - Bandung",
         "status": "Beroperasi"
       }
     ]
   }
   ```

#### B. Jadwal Aktif User

**Endpoints yang digunakan:**
- `GET /api/schedules` - Mengambil semua schedule
- `GET /api/tickets?userId=:userId` - Mengambil tiket user

**Komunikasi Dinamis:**
```
Frontend → Gateway → ScheduleService (GET /api/schedules)
                  → TicketService (GET /api/tickets?userId=:userId)
                  → Frontend filters schedules based on tickets
                  → Display user schedules
```

**Detail Komunikasi:**
1. **Frontend memanggil ScheduleService:**
   ```javascript
   GET http://localhost:3007/api/schedules
   ```
   - Response: Daftar semua schedule

2. **Frontend memanggil TicketService:**
   ```javascript
   GET http://localhost:3007/api/tickets?userId=user-id-123
   ```
   - Response: Daftar tiket milik user dengan `scheduleId`

3. **Frontend melakukan filtering:**
   - Ambil `scheduleId` dari setiap tiket
   - Filter schedule berdasarkan `scheduleId`
   - Tampilkan schedule yang sesuai dengan tiket user

#### C. Auto-Assign Buses

**Endpoint**: `POST /api/routes/assign-buses`

**Komunikasi Dinamis:**
```
Frontend → Gateway → RouteService (POST /api/routes/assign-buses)
                  → RouteService calls ScheduleService (GET /api/schedules)
                  → RouteService calls BusService (GET /api/buses)
                  → RouteService updates routes table
                  → Return success to Frontend
```

**Detail Komunikasi:**
1. **RouteService menerima request** dari Gateway
2. **RouteService memanggil ScheduleService:**
   ```javascript
   GET http://localhost:3005/api/schedules?limit=1000
   ```
   - Response: Daftar schedule dengan `busId` dan `routeId`

3. **RouteService memanggil BusService:**
   ```javascript
   GET http://localhost:3006/api/buses?limit=1000
   ```
   - Response: Daftar bus dengan `id`

4. **RouteService melakukan auto-assign:**
   - Map `busId` dari schedule ke `routeId`
   - Update `routes` table dengan `bus_id`
   - Assign unused buses ke routes yang masih null

5. **RouteService mengembalikan success:**
   ```json
   {
     "success": true,
     "message": "Proses assign buses sedang berjalan di background"
   }
   ```

### 3. Metode API Lengkap

Fitur ini menggunakan **semua metode HTTP**:

#### GET - Mengambil Data
- ✅ `GET /api/dashboard/operating-buses` → Bus yang beroperasi
- ✅ `GET /api/schedules` → Daftar schedule
- ✅ `GET /api/tickets?userId=:userId` → Tiket user

#### POST - Membuat Data Baru / Trigger Action
- ✅ `POST /api/routes/assign-buses` → Trigger assign buses

#### PUT/PATCH - Update Data (Tersedia di API, tidak digunakan di fitur ini)
- ✅ `PUT /api/schedules/:id` → Update schedule
- ✅ `PATCH /api/schedules/:id` → Update sebagian schedule

#### DELETE - Hapus Data (Tersedia di API, tidak digunakan di fitur ini)
- ✅ `DELETE /api/schedules/:id` → Hapus schedule

### 4. Integrasi Lancar

- **Error Handling**: 
  - Jika salah satu service tidak tersedia, data tetap ditampilkan dari service yang tersedia
  - Error ditangani dengan graceful degradation

- **Auto-Refresh**: 
  - Data di-refresh setiap 5 detik untuk update real-time
  - Tidak menampilkan loading indicator saat auto-refresh

- **Auto-Assign on Refresh**: 
  - Saat user refresh browser (F5), assign buses otomatis dijalankan
  - Menunggu 2 detik agar proses selesai sebelum load data

---

## Fungsionalitas Sistem

### 1. Fitur yang Berfungsi

✅ **Daftar Bus yang Sedang Beroperasi**
- Menampilkan semua bus dari database
- Status bus (Beroperasi/Maintenance) berdasarkan MaintenanceService
- Informasi: Plat nomor, Model, Kapasitas, Rute, Status
- Auto-refresh setiap 5 detik

✅ **Jadwal Aktif User**
- Hanya ditampilkan jika user sudah login
- Menampilkan schedule berdasarkan tiket yang dimiliki user
- Informasi: Rute, Bus, Pengemudi, Waktu, Status
- Status: "Terjadwal" atau "Beroperasi" (berdasarkan waktu)
- Auto-refresh setiap 5 detik

✅ **Auto-Assign Buses**
- Otomatis dijalankan saat page refresh (browser refresh)
- Assign buses dari ScheduleService ke RouteService
- Assign unused buses ke routes yang masih null
- Berjalan di background, tidak blocking UI

✅ **Real-time Updates**
- Auto-refresh setiap 5 detik
- Data selalu up-to-date
- Tidak perlu manual refresh

### 2. Stabilitas dan Kecepatan

- **Optimized API Calls**: 
  - Data di-fetch sekali saat component mount
  - Auto-refresh tanpa loading indicator (silent refresh)
  - Parallel API calls untuk multiple endpoints

- **Loading States**: 
  - Loading indicator hanya saat initial load
  - Silent refresh untuk auto-update

- **Error Handling**:
  - Try-catch untuk setiap API call
  - Graceful degradation jika service tidak tersedia
  - User-friendly error messages

### 3. Tanpa Error

- **Validasi Data**:
  - Check null/undefined sebelum render
  - Validasi array sebelum map
  - Default values untuk data yang tidak tersedia

- **Error Messages**:
  - "Gagal memuat data. Silakan refresh halaman." (Error loading)
  - Data kosong ditampilkan dengan pesan yang jelas

- **Null Safety**:
  - Check null/undefined untuk setiap field
  - Fallback values untuk data yang tidak tersedia

### 4. Consumer (Frontend) Berhasil

Frontend berhasil memanggil API Gateway dan menampilkan data dari **5 layanan**:
- ✅ BusService → Data bus
- ✅ MaintenanceService → Status maintenance
- ✅ ScheduleService → Data schedule
- ✅ TicketService → Tiket user
- ✅ RouteService → Auto-assign buses

---

## Dokumentasi API (Swagger)

### 1. Endpoint yang Didokumentasikan

**Endpoints:**
- `GET /api/dashboard/operating-buses` - Bus yang beroperasi
- `GET /api/schedules` - Daftar schedule
- `GET /api/tickets?userId=:userId` - Tiket user
- `POST /api/routes/assign-buses` - Trigger assign buses

**Swagger Documentation** tersedia di:
```
http://localhost:3007/api-docs
http://localhost:3005/api-docs (ScheduleService)
http://localhost:3004/api-docs (TicketService)
http://localhost:3000/api-docs (RouteService)
```

### 2. Detail Endpoint

#### A. GET /api/dashboard/operating-buses

**Request:**
```http
GET /api/dashboard/operating-buses
Host: localhost:3007
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "bus": "B 1234 CD",
      "model": "Mercedes-Benz",
      "capacity": 40,
      "rute": "Jakarta - Bandung",
      "status": "Beroperasi"
    },
    {
      "bus": "B 5678 EF",
      "model": "Scania",
      "capacity": 45,
      "rute": "Bandung - Yogyakarta",
      "status": "Maintenance"
    }
  ]
}
```

#### B. GET /api/schedules

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
      "driverId": "driver-id-123",
      "busPlate": "B 1234 CD",
      "driverName": "Budi Santoso"
    }
  ]
}
```

#### C. GET /api/tickets?userId=:userId

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

#### D. POST /api/routes/assign-buses

**Request:**
```http
POST /api/routes/assign-buses
Host: localhost:3007
Content-Type: application/json
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Proses assign buses sedang berjalan di background",
  "data": {
    "status": "processing",
    "message": "Assign buses akan dijalankan di background"
  }
}
```

### 3. Parameter dan Contoh

#### Parameter untuk GET /api/tickets:
- `userId` (string, query parameter) - Filter tiket berdasarkan user ID

**Contoh Request menggunakan cURL:**
```bash
# Get Operating Buses
curl -X GET http://localhost:3007/api/dashboard/operating-buses

# Get Schedules
curl -X GET http://localhost:3007/api/schedules

# Get User Tickets
curl -X GET "http://localhost:3007/api/tickets?userId=user-id-123"

# Trigger Assign Buses
curl -X POST http://localhost:3007/api/routes/assign-buses
```

### 4. Mudah Dipahami

Dokumentasi Swagger mencakup:
- ✅ Deskripsi endpoint yang jelas
- ✅ Contoh request dan response
- ✅ Schema untuk setiap field
- ✅ Tag untuk grouping (Dashboard, Schedules, Tickets, Routes)
- ✅ Response codes (200, 500, 503)

### 5. Dapat Diakses

Swagger UI dapat diakses di:
- Gateway: `http://localhost:3007/api-docs`
- ScheduleService: `http://localhost:3005/api-docs`
- TicketService: `http://localhost:3004/api-docs`
- RouteService: `http://localhost:3000/api-docs`

### 6. File Spesifikasi

File OpenAPI Specification dapat di-generate dari Swagger UI atau tersedia di:
- `backend/gatewayservice/config/swagger.js`
- `backend/scheduleservice/config/swagger.js`
- `backend/ticketservice/config/swagger.js`
- `backend/routeservice/config/swagger.js`

---

## Presentasi & Pemahaman Konsep

### 1. Konsep API

**RESTful API** menggunakan metode HTTP standar:

- **GET**: Mengambil data (Read)
  - `GET /api/dashboard/operating-buses` → Ambil bus yang beroperasi
  - `GET /api/schedules` → Ambil daftar schedule
  - `GET /api/tickets?userId=:userId` → Ambil tiket user

- **POST**: Membuat data baru / Trigger action (Create/Action)
  - `POST /api/routes/assign-buses` → Trigger assign buses

**Data Aggregation:**
- Gateway mengumpulkan data dari multiple services
- Menggabungkan data berdasarkan key (busId, userId, scheduleId)
- Mengembalikan data yang sudah di-aggregate

### 2. Arsitektur Layanan

**Microservices Architecture** dengan komunikasi antar layanan:

**Gateway Aggregation Pattern:**
- Gateway mengumpulkan data dari multiple services
- Melakukan aggregation di Gateway
- Mengembalikan data yang sudah di-aggregate ke frontend

**Service-to-Service Communication:**
- RouteService memanggil ScheduleService untuk mendapatkan schedule
- RouteService memanggil BusService untuk mendapatkan bus
- RouteService melakukan auto-assign berdasarkan data dari services

**Flow Bus yang Beroperasi:**
```
1. Frontend → Gateway (GET /api/dashboard/operating-buses)
2. Gateway → BusService (GET /api/buses)
3. Gateway → MaintenanceService (GET /api/maintenance)
4. Gateway aggregates data (match by busId)
5. Gateway → Frontend (return aggregated data)
```

**Flow Jadwal Aktif User:**
```
1. Frontend → Gateway → ScheduleService (GET /api/schedules)
2. Frontend → Gateway → TicketService (GET /api/tickets?userId=:userId)
3. Frontend filters schedules based on tickets
4. Frontend displays user schedules
```

**Flow Auto-Assign Buses:**
```
1. Frontend → Gateway → RouteService (POST /api/routes/assign-buses)
2. RouteService → ScheduleService (GET /api/schedules)
3. RouteService → BusService (GET /api/buses)
4. RouteService updates routes table
5. RouteService → Gateway → Frontend (return success)
```

### 3. Komunikasi Antar Layanan

**Synchronous Communication (HTTP/REST):**
- Gateway melakukan HTTP request ke setiap service
- Menunggu response sebelum melanjutkan
- Cocok untuk real-time data aggregation

**Parallel vs Sequential:**
- **Parallel**: Gateway dapat memanggil multiple services secara parallel menggunakan `Promise.all()`
- **Sequential**: RouteService memanggil ScheduleService, lalu BusService secara sequential

**Error Handling:**
- Jika salah satu service tidak tersedia, Gateway tetap mengembalikan data dari service yang tersedia
- Graceful degradation untuk user experience yang baik

### 4. Penggunaan Swagger

**Swagger/OpenAPI** untuk dokumentasi dan testing:

**Fungsi:**
- ✅ Dokumentasi API yang interaktif
- ✅ Testing API langsung dari browser
- ✅ Validasi request/response
- ✅ Generate client code

**Cara Menggunakan:**
1. Buka `http://localhost:3007/api-docs`
2. Pilih endpoint (misal: `GET /api/dashboard/operating-buses`)
3. Klik "Try it out"
4. Klik "Execute"
5. Lihat response

---

## Testing & Validasi

### 1. Testing dengan Swagger UI

#### Test GET /api/dashboard/operating-buses

1. **Buka Swagger UI:**
   ```
   http://localhost:3007/api-docs
   ```

2. **Pilih Endpoint:**
   - Cari `GET /api/dashboard/operating-buses` di bagian Dashboard

3. **Test Endpoint:**
   - Klik "Try it out"
   - Klik "Execute"
   - Lihat response

4. **Validasi Response:**
   - ✅ Status code: 200
   - ✅ `success: true`
   - ✅ `data` adalah array
   - ✅ Setiap item memiliki: `bus`, `model`, `capacity`, `rute`, `status`

#### Test GET /api/schedules

1. **Pilih Endpoint:**
   - Cari `GET /api/schedules` di bagian Schedules

2. **Test Endpoint:**
   - Klik "Try it out"
   - Klik "Execute"
   - Lihat response

3. **Validasi Response:**
   - ✅ Status code: 200
   - ✅ `success: true`
   - ✅ `data` adalah array
   - ✅ Setiap item memiliki: `id`, `routeName`, `time`, `busId`, `driverId`

#### Test POST /api/routes/assign-buses

1. **Pilih Endpoint:**
   - Cari `POST /api/routes/assign-buses` di bagian Routes

2. **Test Endpoint:**
   - Klik "Try it out"
   - Klik "Execute"
   - Lihat response

3. **Validasi Response:**
   - ✅ Status code: 200
   - ✅ `success: true`
   - ✅ `message` berisi informasi proses

### 2. Testing dengan Postman

**Get Operating Buses:**
```http
GET http://localhost:3007/api/dashboard/operating-buses
```

**Get Schedules:**
```http
GET http://localhost:3007/api/schedules
```

**Get User Tickets:**
```http
GET http://localhost:3007/api/tickets?userId=user-id-123
```

**Trigger Assign Buses:**
```http
POST http://localhost:3007/api/routes/assign-buses
```

### 3. Testing dengan Frontend

1. **Buka aplikasi frontend:**
   ```
   http://localhost:3000
   ```

2. **Navigasi ke halaman "Jadwal"**

3. **Test Bus yang Beroperasi:**
   - ✅ Daftar bus ditampilkan
   - ✅ Status bus ditampilkan (Beroperasi/Maintenance)
   - ✅ Auto-refresh setiap 5 detik

4. **Test Jadwal Aktif User:**
   - ✅ Login sebagai user
   - ✅ Jadwal aktif user ditampilkan
   - ✅ Hanya menampilkan schedule berdasarkan tiket user
   - ✅ Auto-refresh setiap 5 detik

5. **Test Auto-Assign Buses:**
   - ✅ Refresh browser (F5)
   - ✅ Assign buses otomatis dijalankan
   - ✅ Data ter-update setelah assign selesai

### 4. Testing Error Handling

**Test jika service tidak tersedia:**
1. Stop salah satu service (misal: BusService)
2. Refresh halaman Jadwal
3. Validasi: ✅ Aplikasi tidak crash, menampilkan data kosong atau error message

### 5. Checklist Validasi

- [ ] Endpoint dapat diakses via Swagger UI
- [ ] Response format sesuai dokumentasi
- [ ] Frontend berhasil menampilkan bus yang beroperasi
- [ ] Frontend berhasil menampilkan jadwal aktif user
- [ ] Auto-refresh bekerja setiap 5 detik
- [ ] Auto-assign buses bekerja saat page refresh
- [ ] Error handling bekerja dengan baik
- [ ] Loading state ditampilkan saat initial load
- [ ] Data kosong ditampilkan dengan pesan yang jelas

---

## Kesimpulan

Fitur **Jadwal** adalah contoh implementasi yang baik dari:
- ✅ **Microservices Architecture** dengan lebih dari 2 layanan
- ✅ **Komunikasi dinamis** antar layanan melalui API Gateway
- ✅ **Data aggregation** di Gateway
- ✅ **Auto-assign logic** yang kompleks dengan komunikasi service-to-service
- ✅ **Dokumentasi API** yang lengkap dengan Swagger
- ✅ **Error handling** yang robust
- ✅ **Real-time updates** dengan auto-refresh
- ✅ **User experience** yang baik dengan data yang selalu up-to-date

**Teknologi yang digunakan:**
- Frontend: React
- Backend: Node.js, Express.js
- API: RESTful API, JSON
- Dokumentasi: Swagger/OpenAPI

---

## Referensi

- **File terkait:**
  - `frontend/src/pages/SchedulePage.js`
  - `frontend/src/services/apiService.js`
  - `backend/gatewayservice/routes/gateway.js`
  - `backend/routeservice/routes/routes.js`
  - `backend/routeservice/scripts/auto-assign-from-schedule.js`

- **Dokumentasi:**
  - Swagger UI Gateway: `http://localhost:3007/api-docs`
  - Swagger UI ScheduleService: `http://localhost:3005/api-docs`
  - Swagger UI TicketService: `http://localhost:3004/api-docs`
  - Swagger UI RouteService: `http://localhost:3000/api-docs`
  - OpenAPI Specification: https://swagger.io/specification/

