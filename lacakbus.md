# Modul Pembelajaran: Lacak Bus (Bus Tracking)

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Arsitektur & Komunikasi API](#arsitektur--komunikasi-api)
3. [Fungsionalitas Sistem](#fungsionalitas-sistem)
4. [Dokumentasi API (Swagger)](#dokumentasi-api-swagger)
5. [Presentasi & Pemahaman Konsep](#presentasi--pemahaman-konsep)
6. [Testing & Validasi](#testing--validasi)

---

## Overview

**Lacak Bus** adalah fitur yang memungkinkan pengguna untuk melihat posisi real-time bus di peta interaktif. Fitur ini menampilkan:
- Posisi bus di peta menggunakan koordinat GPS
- Rute bus dengan garis polyline yang menghubungkan halte-halte
- Detail bus (model, kapasitas, supir, jadwal, status)
- Informasi lengkap tentang rute dan halte

**Lokasi File:**
- Frontend: `frontend/src/pages/TrackPage.js`
- API Service: `frontend/src/services/apiService.js`
- Gateway Endpoint: `backend/gatewayservice/routes/gateway.js`

---

## Arsitektur & Komunikasi API

### 1. Arsitektur Microservices

Fitur **Lacak Bus** menggunakan arsitektur microservices dengan **lebih dari 2 layanan** yang saling berkomunikasi:

```
┌─────────────┐
│   Frontend  │
│ (React App) │
└──────┬──────┘
       │ HTTP Request
       │ GET /api/dashboard/tracking
       ▼
┌─────────────────────────────────────────────────┐
│           API Gateway (Port 3007)                 │
│  ┌───────────────────────────────────────────┐  │
│  │  GET /dashboard/tracking                  │  │
│  │  (Aggregates data from multiple services) │  │
│  └───────────────────────────────────────────┘  │
└──────┬──────┬──────┬──────┬──────┬──────────────┘
       │      │      │      │      │
       │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼
   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
   │Bus  │ │Route│ │Drive│ │Sched│ │Maint│
   │Serv │ │Serv │ │rServ│ │Serv │ │Serv │
   │:3006│ │:3000│ │:3001│ │:3005│ │:3003│
   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
```

### 2. Komunikasi Dinamis Antar Layanan

**API Gateway** melakukan komunikasi dinamis ke **5 layanan berbeda**:

#### Langkah 1: Ambil Data Bus dari BusService
```javascript
GET http://localhost:3006/api/buses?limit=1000
```
- **Service**: BusService (Port 3006)
- **Method**: GET
- **Response**: Daftar semua bus dengan informasi: `id`, `plate`, `model`, `capacity`

#### Langkah 2: Ambil Data Route dari RouteService
```javascript
GET http://localhost:3000/api/routes?limit=1000
```
- **Service**: RouteService (Port 3000)
- **Method**: GET
- **Response**: Daftar semua route dengan `busId`, `routeName`, `stops` (dengan koordinat latitude/longitude)

#### Langkah 3: Ambil Data Driver dari DriverService
```javascript
GET http://localhost:3001/api/drivers?limit=1000
```
- **Service**: DriverService (Port 3001)
- **Method**: GET
- **Response**: Daftar semua driver dengan informasi: `id`, `name`, `contact`

#### Langkah 4: Ambil Data Schedule dari ScheduleService
```javascript
GET http://localhost:3005/api/schedules?limit=1000
```
- **Service**: ScheduleService (Port 3005)
- **Method**: GET
- **Response**: Daftar schedule dengan `busId`, `routeId`, `time`, `driverId`

#### Langkah 5: Ambil Data Maintenance dari MaintenanceService
```javascript
GET http://localhost:3003/api/maintenance?limit=1000
```
- **Service**: MaintenanceService (Port 3003)
- **Method**: GET
- **Response**: Daftar maintenance dengan `busId`, `status`

### 3. Proses Aggregation di Gateway

Gateway melakukan **data aggregation** dengan langkah-langkah berikut:

1. **Mengambil data dari 5 layanan** secara paralel menggunakan `Promise.all()` atau sequential
2. **Menggabungkan data** berdasarkan `busId`:
   - Bus data + Route data (match by `busId`)
   - Bus data + Driver data (match by `driverId` dari schedule)
   - Bus data + Schedule data (match by `busId`)
   - Bus data + Maintenance data (match by `busId`)
3. **Menghitung posisi bus** berdasarkan schedule dan route stops
4. **Menentukan status** bus (Beroperasi/Maintenance) berdasarkan maintenance data
5. **Mengembalikan response** yang sudah di-aggregate ke frontend

### 4. Integrasi Lancar

- **Error Handling**: Jika salah satu service tidak tersedia, Gateway tetap mengembalikan data dari service yang tersedia
- **Timeout**: Setiap request memiliki timeout 5 detik untuk mencegah blocking
- **Fallback**: Jika service tidak tersedia, data tetap ditampilkan dengan informasi yang tersedia

---

## Fungsionalitas Sistem

### 1. Fitur yang Berfungsi

✅ **Menampilkan Peta Interaktif**
- Menggunakan library Leaflet untuk peta
- Tile layer dari OpenStreetMap
- Responsive dan dapat di-zoom

✅ **Menampilkan Posisi Bus**
- Marker bus dengan icon custom
- Animasi pulse pada marker
- Posisi bus dihitung berdasarkan schedule dan route stops

✅ **Menampilkan Rute Bus**
- Polyline yang menghubungkan halte-halte
- Warna biru (#008DA6) dengan opacity 0.6
- Hanya menampilkan route yang memiliki minimal 2 stops

✅ **Detail Bus (Info Panel)**
- Model bus
- Kapasitas penumpang
- Nama rute
- Kode rute
- Nama supir
- Kontak supir
- Jadwal terbaru
- Status operasi

✅ **Interaksi User**
- Klik marker untuk melihat detail bus
- Auto-fly ke posisi bus saat dipilih
- Tutup info panel

### 2. Stabilitas dan Kecepatan

- **Lazy Loading**: Data hanya di-fetch sekali saat component mount
- **Error Handling**: Menampilkan pesan error yang user-friendly jika gagal load data
- **Loading State**: Menampilkan loading indicator saat fetch data
- **Optimized Rendering**: Hanya render marker dan polyline yang memiliki data valid

### 3. Tanpa Error

- **Validasi Data**: Memastikan data yang diterima valid sebelum render
- **Null Safety**: Handle null/undefined dengan fallback values
- **Error Boundaries**: Catch error dan tampilkan pesan yang jelas

### 4. Consumer (Frontend) Berhasil

Frontend berhasil memanggil API Gateway dan menampilkan data dari **5 layanan**:
- ✅ BusService → Data bus
- ✅ RouteService → Data route dan stops
- ✅ DriverService → Data driver
- ✅ ScheduleService → Data schedule
- ✅ MaintenanceService → Data maintenance

---

## Dokumentasi API (Swagger)

### 1. Endpoint yang Didokumentasikan

**Endpoint**: `GET /api/dashboard/tracking`

**Swagger Documentation** tersedia di:
```
http://localhost:3007/api-docs
```

### 2. Detail Endpoint

#### Request
```http
GET /api/dashboard/tracking
Host: localhost:3007
Content-Type: application/json
```

#### Response Success (200)
```json
{
  "success": true,
  "data": [
    {
      "busId": "550e8400-e29b-41d4-a716-446655440000",
      "bus": "B 1234 CD",
      "model": "Mercedes-Benz",
      "capacity": 40,
      "route": {
        "id": "route-id-123",
        "routeName": "Jakarta - Bandung",
        "routeCode": "RT-001",
        "stops": [
          {
            "stopName": "Halte Jakarta",
            "latitude": -6.2088,
            "longitude": 106.8456
          },
          {
            "stopName": "Halte Bandung",
            "latitude": -6.9175,
            "longitude": 107.6191
          }
        ]
      },
      "driver": {
        "id": "driver-id-123",
        "name": "Budi Santoso",
        "contact": "081234567890"
      },
      "schedule": {
        "id": "schedule-id-123",
        "time": "2024-01-15T08:00:00Z"
      },
      "position": [-6.5, 107.0],
      "status": "Beroperasi"
    }
  ]
}
```

#### Response Error (500)
```json
{
  "success": false,
  "error": "Kesalahan server internal",
  "message": "Terjadi kesalahan saat mengambil data tracking"
}
```

### 3. Parameter dan Contoh

**Tidak ada parameter** yang diperlukan untuk endpoint ini.

**Contoh Request menggunakan cURL:**
```bash
curl -X GET http://localhost:3007/api/dashboard/tracking
```

**Contoh Request menggunakan JavaScript (Axios):**
```javascript
const response = await axios.get('http://localhost:3007/api/dashboard/tracking');
console.log(response.data);
```

### 4. Mudah Dipahami

Dokumentasi Swagger mencakup:
- ✅ Deskripsi endpoint yang jelas
- ✅ Contoh request dan response
- ✅ Schema untuk setiap field
- ✅ Tag untuk grouping (Dashboard)
- ✅ Response codes (200, 500)

### 5. Dapat Diakses

Swagger UI dapat diakses di:
```
http://localhost:3007/api-docs
```

Pastikan GatewayService berjalan di port 3007.

### 6. File Spesifikasi

File OpenAPI Specification dapat di-generate dari Swagger UI atau tersedia di:
- `backend/gatewayservice/config/swagger.js`

---

## Presentasi & Pemahaman Konsep

### 1. Konsep API

**API (Application Programming Interface)** adalah antarmuka yang memungkinkan aplikasi untuk berkomunikasi dengan aplikasi lain. Dalam konteks ini:

- **RESTful API**: Menggunakan metode HTTP (GET, POST, PUT, DELETE)
- **JSON Format**: Data ditukar dalam format JSON
- **Stateless**: Setiap request independen, tidak menyimpan state

**Endpoint yang digunakan:**
- `GET /api/dashboard/tracking` → Mengambil data tracking bus

### 2. Arsitektur Layanan

**Microservices Architecture** adalah pola arsitektur di mana aplikasi dibagi menjadi beberapa layanan kecil yang independen:

**Keuntungan:**
- ✅ **Scalability**: Setiap service dapat di-scale secara independen
- ✅ **Maintainability**: Mudah di-maintain karena terpisah
- ✅ **Technology Diversity**: Setiap service dapat menggunakan teknologi berbeda
- ✅ **Fault Isolation**: Jika satu service down, service lain tetap berjalan

**Dalam fitur Lacak Bus:**
- **5 Microservices** yang berbeda:
  1. BusService → Mengelola data bus
  2. RouteService → Mengelola data route dan halte
  3. DriverService → Mengelola data driver
  4. ScheduleService → Mengelola data schedule
  5. MaintenanceService → Mengelola data maintenance

**API Gateway Pattern:**
- **Single Entry Point**: Frontend hanya perlu memanggil 1 endpoint (Gateway)
- **Aggregation**: Gateway mengumpulkan data dari multiple services
- **Load Balancing**: Gateway dapat melakukan load balancing ke multiple instances
- **Authentication**: Gateway dapat menangani authentication/authorization

### 3. Komunikasi Antar Layanan

**Synchronous Communication** (HTTP/REST):
- Gateway melakukan HTTP request ke setiap service
- Menunggu response sebelum melanjutkan
- Cocok untuk real-time data

**Data Flow:**
```
Frontend → Gateway → BusService (GET /api/buses)
                  → RouteService (GET /api/routes)
                  → DriverService (GET /api/drivers)
                  → ScheduleService (GET /api/schedules)
                  → MaintenanceService (GET /api/maintenance)
                  → Aggregate Data
                  → Return to Frontend
```

### 4. Penggunaan Swagger

**Swagger/OpenAPI** adalah tool untuk dokumentasi API:

**Fungsi:**
- ✅ Dokumentasi API yang interaktif
- ✅ Testing API langsung dari browser
- ✅ Generate client code
- ✅ Validasi request/response

**Cara Menggunakan:**
1. Buka `http://localhost:3007/api-docs`
2. Pilih endpoint `/api/dashboard/tracking`
3. Klik "Try it out"
4. Klik "Execute"
5. Lihat response

---

## Testing & Validasi

### 1. Testing dengan Swagger UI

1. **Buka Swagger UI:**
   ```
   http://localhost:3007/api-docs
   ```

2. **Pilih Endpoint:**
   - Cari `GET /api/dashboard/tracking` di bagian Dashboard

3. **Test Endpoint:**
   - Klik "Try it out"
   - Klik "Execute"
   - Lihat response

4. **Validasi Response:**
   - ✅ Status code: 200
   - ✅ `success: true`
   - ✅ `data` adalah array
   - ✅ Setiap item memiliki: `busId`, `bus`, `model`, `capacity`, `route`, `driver`, `position`, `status`

### 2. Testing dengan Postman

**Request:**
```http
GET http://localhost:3007/api/dashboard/tracking
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### 3. Testing dengan Frontend

1. **Buka aplikasi frontend:**
   ```
   http://localhost:3000
   ```

2. **Navigasi ke halaman "Lacak Bus"**

3. **Validasi:**
   - ✅ Peta ditampilkan
   - ✅ Marker bus muncul di peta
   - ✅ Polyline route ditampilkan
   - ✅ Klik marker menampilkan detail bus
   - ✅ Tidak ada error di console

### 4. Testing Error Handling

**Test jika service tidak tersedia:**
1. Stop salah satu service (misal: BusService)
2. Refresh halaman Lacak Bus
3. Validasi: ✅ Aplikasi tidak crash, menampilkan pesan error atau data kosong

### 5. Checklist Validasi

- [ ] Endpoint dapat diakses via Swagger UI
- [ ] Response format sesuai dokumentasi
- [ ] Frontend berhasil menampilkan data
- [ ] Peta menampilkan marker bus
- [ ] Polyline route ditampilkan
- [ ] Detail bus muncul saat klik marker
- [ ] Error handling bekerja dengan baik
- [ ] Loading state ditampilkan saat fetch data

---

## Kesimpulan

Fitur **Lacak Bus** adalah contoh implementasi yang baik dari:
- ✅ **Microservices Architecture** dengan lebih dari 2 layanan
- ✅ **Komunikasi dinamis** antar layanan melalui API Gateway
- ✅ **Data aggregation** di Gateway
- ✅ **Dokumentasi API** yang lengkap dengan Swagger
- ✅ **Error handling** yang robust
- ✅ **User experience** yang baik dengan peta interaktif

**Teknologi yang digunakan:**
- Frontend: React, Leaflet (peta)
- Backend: Node.js, Express.js
- API: RESTful API, JSON
- Dokumentasi: Swagger/OpenAPI

---

## Referensi

- **File terkait:**
  - `frontend/src/pages/TrackPage.js`
  - `frontend/src/services/apiService.js`
  - `backend/gatewayservice/routes/gateway.js`
  - `backend/gatewayservice/config/swagger.js`

- **Dokumentasi:**
  - Swagger UI: `http://localhost:3007/api-docs`
  - Leaflet Documentation: https://leafletjs.com/
  - OpenAPI Specification: https://swagger.io/specification/

