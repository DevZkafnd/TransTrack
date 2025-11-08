# Dokumentasi Alur API Live Schedule

## 📋 Ringkasan

Endpoint ini mengembalikan jadwal yang sedang beroperasi dengan data lengkap yang sudah digabungkan dari berbagai microservice.

## 🔄 Alur API Step-by-Step

### 1. Frontend → Gateway
**Request:**
```
GET /api/dashboard/live-schedule
```

**Lokasi:** Frontend memanggil endpoint di API Gateway (port 8000)

### 2. Gateway → ScheduleService
**Request:**
```
GET http://localhost:3005/api/schedules/live-schedule
```

**Lokasi:** `backend/gatewayservice/routes/gateway.js`
- Gateway menerima request dari frontend
- Gateway memproxikan request ke ScheduleService

### 3. ScheduleService - Langkah A: Ambil Data Jadwal
**Query Database:**
```sql
SELECT id, route_id, route_name, bus_id, bus_plate, driver_id, driver_name, time
FROM schedules
WHERE time <= NOW()
ORDER BY time DESC
LIMIT 100
```

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 601-618)

**Hasil:** Array jadwal dari database ScheduleService
```json
[
  {
    "id": "uuid-1",
    "routeId": "R-001",
    "routeName": "Rute B - Terminal Kota gambir ke Terminal kota Sawangan",
    "busId": "B-123",
    "busPlate": "B 1234 CD",
    "driverId": "D-456",
    "driverName": "Budi Santoso",
    "time": "2025-11-08T06:26:00Z"
  },
  {
    "id": "uuid-2",
    "routeId": "R-002",
    "busId": "B-789",
    "driverId": "D-789",
    "time": "2025-11-08T06:38:00Z"
  }
]
```

### 4. ScheduleService - Langkah B: Komunikasi Antar-Servis

Untuk setiap jadwal, ScheduleService melakukan Promise.all untuk mengambil data dari service lain:

#### 4.1. Panggil RouteService
**Request:**
```
GET http://localhost:3000/api/routes/{routeId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "R-001",
    "routeName": "Rute B - Terminal Kota gambir ke Terminal Kota Sawangan",
    ...
  }
}
```

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 640-648)

#### 4.2. Panggil BusService
**Request:**
```
GET http://localhost:3006/api/buses/{busId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "B-123",
    "plate": "B 1234 CD",
    ...
  }
}
```

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 650-659)

#### 4.3. Panggil DriverService
**Request:**
```
GET http://localhost:3001/api/drivers/{driverId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "D-456",
    "name": "Budi Santoso",
    ...
  }
}
```

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 661-670)

#### 4.4. Panggil MaintenanceService (Optional)
**Request:**
```
GET http://localhost:3003/api/maintenance/bus/{busId}?status=in_progress&limit=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "status": "in_progress",
      ...
    }
  ]
}
```

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 672-684)

### 5. ScheduleService - Langkah C: Gabungkan Data

ScheduleService menggabungkan semua data yang diperoleh menjadi respons yang bersih:

**Lokasi:** `backend/scheduleservice/routes/schedules.js` (line 686-728)

**Proses:**
1. Format waktu keberangkatan ke format Indonesia
2. Tentukan status berdasarkan:
   - Jika ada maintenance in_progress → "Maintenance"
   - Jika waktu > 24 jam yang lalu → "Sudah Tidak Beroperasi"
   - Jika waktu > 1 jam yang lalu → "Beroperasi"
   - Jika waktu <= 1 jam yang lalu → "Aktif"

### 6. ScheduleService → Gateway → Frontend

**Response Final:**
```json
{
  "success": true,
  "data": [
    {
      "rute": "Rute B - Terminal Kota gambir ke Terminal Kota Sawangan",
      "bus": "B 1234 CD",
      "pengemudi": "Budi Santoso",
      "waktu_keberangkatan": "8 Nov 2025, 06:26",
      "status": "Beroperasi"
    },
    {
      "rute": "Rute C - Terminal Blok M ke Stasiun Bogor",
      "bus": "B 5678 EF",
      "pengemudi": "Agus Setiawan",
      "waktu_keberangkatan": "8 Nov 2025, 06:38",
      "status": "Beroperasi"
    }
  ]
}
```

## 📊 Diagram Alur

```
Frontend
   │
   │ GET /api/dashboard/live-schedule
   ▼
Gateway (Port 8000)
   │
   │ Proxy ke ScheduleService
   ▼
ScheduleService (Port 3005)
   │
   ├─ Langkah A: Query Database
   │  └─ Ambil schedules WHERE time <= NOW()
   │
   ├─ Langkah B: Promise.all untuk setiap schedule
   │  ├─ GET RouteService /api/routes/{routeId}
   │  ├─ GET BusService /api/buses/{busId}
   │  ├─ GET DriverService /api/drivers/{driverId}
   │  └─ GET MaintenanceService /api/maintenance/bus/{busId}
   │
   └─ Langkah C: Gabungkan data
      └─ Format waktu, tentukan status, return JSON
   │
   │ Response JSON
   ▼
Gateway
   │
   │ Response JSON
   ▼
Frontend
```

## 🔧 Error Handling

### Jika Service Lain Tidak Tersedia
- ScheduleService akan menggunakan data fallback dari database (routeName, busPlate, driverName yang sudah ada di schedule)
- Response tetap dikembalikan dengan data yang tersedia

### Jika Database Error
- Response 500 dengan pesan error
- Frontend dapat menampilkan pesan error kepada user

## 📝 Catatan Penting

1. **Performance:** Menggunakan `Promise.all` untuk fetch data secara paralel, bukan sequential
2. **Fallback:** Jika service lain tidak tersedia, menggunakan data yang sudah ada di tabel `schedules`
3. **Status Logic:** Status ditentukan berdasarkan waktu dan maintenance status
4. **Format Waktu:** Waktu diformat menggunakan `toLocaleString('id-ID')` untuk format Indonesia

## 🧪 Testing

### Menggunakan cURL

```bash
# Test endpoint melalui Gateway
curl http://localhost:8000/api/dashboard/live-schedule

# Test endpoint langsung di ScheduleService
curl http://localhost:3005/api/schedules/live-schedule
```

### Expected Response

```json
{
  "success": true,
  "data": [
    {
      "rute": "Rute B - Terminal Kota gambir ke Terminal Kota Sawangan",
      "bus": "B 1234 CD",
      "pengemudi": "Budi Santoso",
      "waktu_keberangkatan": "8 Nov 2025, 06:26",
      "status": "Beroperasi"
    }
  ]
}
```

