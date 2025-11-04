# MaintenanceService

API Provider untuk mengelola data master riwayat dan jadwal perbaikan bus pada TransTrack microservice architecture.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Environment

Copy file `env.example` menjadi `.env` dan sesuaikan konfigurasi database:

```bash
cp env.example .env
```

Edit file `.env` dan sesuaikan:
- `DB_HOST` - Host database PostgreSQL
- `DB_PORT` - Port database (default: 5432)
- `DB_NAME` - Nama database
- `DB_USER` - Username database
- `DB_PASSWORD` - Password database (boleh kosong untuk trust auth)
- `PORT` - Port untuk server (default: 3003)

### 3. Setup Database

**Opsi 1: Menggunakan script setup (Recommended untuk pertama kali)**
```bash
npm run setup
```

**Opsi 2: Menggunakan migration (jika sudah setup sebelumnya)**
```bash
npm run migrate
```

Script `setup` akan:
- Membuat extension `pgcrypto` jika belum ada
- Membuat enum `maintenance_status` (scheduled, in_progress, completed, cancelled)
- Membuat tabel `maintenance` jika belum ada
- Membuat index yang diperlukan
- Mencatat migration di tabel `pgmigrations_maintenance`

### 4. Jalankan Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:3003` (atau sesuai PORT di `.env`)

## API Endpoints

### Health Check
- `GET /health` - Cek status layanan

### Maintenance
- `POST /api/maintenance` - Membuat jadwal perbaikan baru
- `GET /api/maintenance/bus/:bus_id` - Mendapatkan riwayat perbaikan berdasarkan ID bus
- `PUT /api/maintenance/:id/complete` - Menandai perbaikan sebagai selesai

### Dokumentasi API
- `GET /api-docs` - Swagger UI documentation

## Struktur Database

### Tabel `maintenance`
- `id` (UUID) - Primary key
- `bus_id` (TEXT) - ID bus yang akan diperbaiki
- `maintenance_type` (TEXT) - Jenis perbaikan
- `description` (TEXT) - Deskripsi perbaikan
- `scheduled_date` (TIMESTAMPTZ) - Tanggal dan waktu jadwal perbaikan
- `completed_date` (TIMESTAMPTZ, nullable) - Tanggal dan waktu selesai perbaikan
- `status` (maintenance_status ENUM) - Status perbaikan (scheduled, in_progress, completed, cancelled)
- `cost` (NUMERIC, nullable) - Biaya perbaikan
- `mechanic_name` (TEXT, nullable) - Nama mekanik yang menangani
- `notes` (TEXT, nullable) - Catatan tambahan
- `created_at` (TIMESTAMPTZ) - Waktu pembuatan
- `updated_at` (TIMESTAMPTZ) - Waktu update terakhir

### Enum `maintenance_status`
- `scheduled` - Terjadwal
- `in_progress` - Sedang dikerjakan
- `completed` - Selesai
- `cancelled` - Dibatalkan

## Migration

Service ini menggunakan `node-pg-migrate` untuk migration. File migration berada di folder `migrations/`.

Migration table yang digunakan: `pgmigrations_maintenance` (terpisah dari services lainnya)

## Development

### Menjalankan Migration
```bash
npm run migrate
```

### Setup Database (untuk pertama kali)
```bash
npm run setup
```

## Notes

- Service ini menggunakan database yang sama dengan services lainnya, tapi dengan migration table terpisah (`pgmigrations_maintenance`)
- Port default: 3003 (berbeda dengan routeservice 3000, driverservice 3001, userservice 3002)
- Semua endpoint menggunakan format JSON
- Status maintenance default adalah `scheduled`
- Endpoint `PUT /api/maintenance/:id/complete` akan otomatis mengisi `completed_date` dengan waktu sekarang

