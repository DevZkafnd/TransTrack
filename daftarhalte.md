# Modul Pembelajaran: Daftar Halte

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

Halaman **Daftar Halte** menampilkan daftar halte per rute, mendukung pencarian teks dan filter berdasarkan `routeId`. Dapat dibuka langsung dari navbar atau dari modal detail **Daftar Rute** (tautan mengirimkan `?routeId=<id>`). Semua panggilan data via **API Gateway**.

Lokasi file:
- Frontend: `frontend/src/pages/StopsPage.js`
- Gateway: `backend/gatewayservice/routes/gateway.js` (proxy/aggregator)
- RouteService: `backend/routeservice/routes/routes.js`

---

## Arsitektur & Komunikasi API

```
Frontend (StopsPage) → Gateway (/api/routes, /api/routes/:id)
                    ↳ RouteService (GET /api/routes, GET /api/routes/:id)
```

Komunikasi dinamis & integrasi:
- Untuk menampilkan semua halte, frontend memuat semua rute (`GET /api/routes`) kemudian memuat detail rute tertentu (`GET /api/routes/:id`) untuk mendapatkan daftar `stops` terurut (`sequence`).
- CRUD rute tersedia penuh di RouteService (GET/POST/PUT/PATCH/DELETE) dan didokumentasikan di Swagger. Halte dikelola sebagai bagian dari payload rute.

---

## Fungsionalitas Sistem

Fitur UI:
- Grouping halte berdasarkan rute.
- Filter by `routeId` (query param) dan pencarian nama halte.
- Menampilkan nama, kode, urutan (sequence), serta koordinat halte.
- Tautan balik ke **Daftar Rute** untuk eksplorasi lebih lanjut.

Stabilitas & performa:
- Memuat rute sekali; detail per rute on‑demand saat diperlukan.
- Error handling dan loading state yang jelas.

---

## Dokumentasi API (Swagger)

Akses dokumentasi:
- Gateway: `http://localhost:8000/api-docs`
- RouteService: `http://localhost:3000/api-docs`

Endpoint (via Gateway):
- `GET /api/routes` (list ringkas)
- `GET /api/routes/:id` (detail rute lengkap termasuk `stops` terurut)
- `POST /api/routes`, `PUT /api/routes/:id`, `PATCH /api/routes/:id`, `DELETE /api/routes/:id`

Parameter umum:
- `limit`, `offset` untuk paging daftar rute.

Contoh cURL:
```bash
curl "http://localhost:8000/api/routes?limit=100"
curl "http://localhost:8000/api/routes/<ROUTE_ID>"
```

---

## Presentasi & Pemahaman Konsep

Jelaskan secara runtut:
- Relasi rute → halte (1‑banyak) dan alasan menyimpan urutan (`sequence`) agar peta/daftar konsisten.
- Pola API Gateway sebagai single entry point yang menyederhanakan konsumen (frontend).
- Kenapa CRUD rute terpusat di RouteService dan dampaknya terhadap konsistensi data halte.

---

## Testing & Validasi

1) Swagger Gateway: uji `GET /api/routes` dan `GET /api/routes/:id`, pastikan `stops` terurut.
2) Frontend: buka “Daftar Halte”, terapkan filter `routeId` dari URL; cek hasil sesuai.
3) Edge case: rute tanpa `stops` → UI tetap stabil, tampilkan informasi kosong yang ramah pengguna.

---

## Checklist Penilaian (Rubrik)

- Arsitektur & Komunikasi API (30%)
  - [x] >2 layanan; akses konsisten melalui Gateway
  - [x] CRUD rute lengkap; data halte terkelola lewat payload rute
- Fungsionalitas Sistem (25%)
  - [x] Filter dan pencarian berjalan; grouping per rute
  - [x] Stabil dan responsif; tanpa error saat uji
- Dokumentasi API (20%)
  - [x] Swagger memuat list/detail rute dengan contoh dan parameter
  - [x] Dapat diakses di `/api-docs`
- Presentasi & Konsep (25%)
  - [x] Dapat menjelaskan arsitektur, relasi data, dan alasan desain


