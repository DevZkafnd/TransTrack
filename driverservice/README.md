# DriverService

API Provider untuk mengelola data master pengemudi pada TransTrack microservice architecture.

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
- `PORT` - Port untuk server (default: 3001)

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
- Membuat tabel `drivers` jika belum ada
- Membuat constraint dan index yang diperlukan
- Mencatat migration di tabel `pgmigrations_driver`

### 4. Jalankan Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:3001` (atau sesuai PORT di `.env`)

## API Endpoints

### Health Check
- `GET /health` - Cek status layanan

### Drivers
- `GET /api/drivers` - Mendapatkan semua pengemudi (dengan pagination)
- `POST /api/drivers` - Membuat pengemudi baru
- `GET /api/drivers/:id` - Mendapatkan pengemudi berdasarkan ID

### Dokumentasi API
- `GET /api-docs` - Swagger UI documentation

## Struktur Database

### Tabel `drivers`
- `id` (UUID) - Primary key
- `name` (TEXT) - Nama pengemudi
- `license` (TEXT) - Nomor lisensi (unique)
- `created_at` (TIMESTAMPTZ) - Waktu pembuatan
- `updated_at` (TIMESTAMPTZ) - Waktu update terakhir

## Migration

Service ini menggunakan `node-pg-migrate` untuk migration. File migration berada di folder `migrations/`.

Migration table yang digunakan: `pgmigrations_driver` (terpisah dari routeservice)

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

- Service ini menggunakan database yang sama dengan routeservice, tapi dengan migration table terpisah (`pgmigrations_driver`)
- Port default: 3001 (berbeda dengan routeservice yang menggunakan 3000)
- Semua endpoint menggunakan format JSON

