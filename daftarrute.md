# Modul Pembelajaran: Daftar Rute

## 📋 Daftar Isi
1. Overview
2. Arsitektur & Komunikasi API
3. Fungsionalitas Sistem
4. Dokumentasi API (Swagger)
5. Presentasi & Pemahaman Konsep
6. Testing & Validasi
7. Checklist Penilaian (Rubrik)

---

## Overview

Halaman **Daftar Rute** menampilkan semua rute dalam bentuk kartu ringkas. Klik kartu membuka modal detail berisi informasi lengkap (stops/halte terurut, jadwal terkait, bus yang terasosiasi) dan tombol menuju **Daftar Halte** ter-filter `routeId`. Semua pemanggilan data dilakukan melalui **API Gateway**.

Lokasi file:
- Frontend: `frontend/src/pages/RoutesPage.js`
- Gateway: `backend/gatewayservice/routes/gateway.js` (agregasi/proxy)
- RouteService: `backend/routeservice/routes/routes.js`
- ScheduleService: `backend/scheduleservice/routes/schedules.js`
- BusService: `backend/busservice/routes/buses.js`

---

## Arsitektur & Komunikasi API

```
Frontend (RoutesPage) → Gateway (/api/routes, /api/buses, /api/schedules?routeId=...)
                     ↳ RouteService (GET/POST/PUT/DELETE /api/routes)
                     ↳ BusService (GET /api/buses)
                     ↳ ScheduleService (GET /api/schedules?routeId=...)
```

Karakteristik arsitektur:
- >2 layanan terlibat (Route, Bus, Schedule; juga Gateway sebagai entry point).
- Komunikasi dinamis: modal detail memicu pemanggilan jadwal (`routeId`) dan matching bus (via `busId`) melalui Gateway.
- CRUD lengkap tersedia di RouteService (GET/POST/PUT/PATCH/DELETE).
- Integrasi lancar: validasi `limit/offset` di ScheduleService mencegah error `NaN`; pengurutan halte berdasarkan `sequence`.

Contoh pemanggilan via Gateway:
```http
GET http://localhost:8000/api/routes?limit=1000
GET http://localhost:8000/api/routes/:id
GET http://localhost:8000/api/buses?limit=1000
GET http://localhost:8000/api/schedules?routeId=<ROUTE_ID>&limit=1000
```

---

## Fungsionalitas Sistem

Fitur UI:
- Kartu rute: nama rute, kode, jumlah halte, status/warna status.
- Modal detail: deskripsi rute, daftar halte terurut, jadwal terkait (dengan `estimatedDurationMinutes` bila tersedia), info bus.
- Aksi: tombol “Lihat Halte” → navigasi ke `Daftar Halte` dengan query `?routeId=...`.
- Pencarian dan filter status di sisi klien.

Stabilitas & performa:
- Data rute/bus dimuat saat mount; jadwal dimuat saat modal dibuka (on‑demand).
- Penanganan error/empty state yang jelas; loading indicator.

---

## Dokumentasi API (Swagger)

Akses dokumentasi:
- Gateway: `http://localhost:8000/api-docs`
- RouteService: `http://localhost:3000/api-docs`
- ScheduleService: `http://localhost:3005/api-docs`
- BusService: `http://localhost:3006/api-docs` (jika diaktifkan)

Endpoint utama (via Gateway):
- `GET /api/routes`, `GET /api/routes/:id`
- `POST /api/routes`, `PUT /api/routes/:id`, `PATCH /api/routes/:id`, `DELETE /api/routes/:id`
- `GET /api/buses?limit=...`
- `GET /api/schedules?routeId=...&limit=...&offset=...`

Parameter penting dan contoh:
- `limit` (default 100), `offset` (default 0): integer positif; ScheduleService melakukan sanitasi nilai.
- `routeId`: filter jadwal by rute.

---

## Presentasi & Pemahaman Konsep

Jelaskan secara runtut:
- Pola API Gateway (single entry point) → konsistensi, keamanan, dan kemudahan frontend.
- Mengapa stops tersimpan terurut (`sequence`) dan dipakai untuk menggambar jalur peta/menampilkan halte berurutan.
- Alasan validasi `limit/offset` untuk mencegah error DB.
- Dinamika data: relasi rute ↔ jadwal ↔ bus dan kapan masing‑masing dipanggil.

---

## Testing & Validasi

1) Swagger (Gateway): uji `GET /api/routes` dan `GET /api/routes/:id` (cek stops), serta `GET /api/schedules?routeId=...` (cek `estimatedDurationMinutes`).
2) Frontend: buka “Daftar Rute”, cari/klik kartu, verifikasi modal memuat halte dan jadwal. Klik “Lihat Halte” → diarahkan ke halaman Daftar Halte dengan filter benar.
3) Robustness: matikan RouteService sementara → UI tidak crash; tampilkan pesan error/fallback.

---

## Checklist Penilaian (Rubrik)

- Arsitektur & Komunikasi API (30%)
  - [x] >2 layanan; komunikasi dinamis via Gateway
  - [x] CRUD lengkap di RouteService (GET/POST/PUT/PATCH/DELETE)
  - [x] Integrasi lancar (rute ↔ bus ↔ jadwal), validasi parameter
- Fungsionalitas Sistem (25%)
  - [x] Kartu/Modal bekerja; navigasi ke Daftar Halte
  - [x] Stabil, responsif, tanpa error
  - [x] Frontend hanya panggil Gateway
- Dokumentasi API (20%)
  - [x] Swagger lengkap; endpoint dan parameter terdokumentasi dengan contoh
  - [x] Dapat diakses via `/api-docs`; spesifikasi bisa diekspor
- Presentasi & Konsep (25%)
  - [x] Penjelasan arsitektur, data flow, alasan desain, dan trade‑off

