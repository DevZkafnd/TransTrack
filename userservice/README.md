# UserService

API Provider untuk mengelola data master pengguna/penumpang pada TransTrack microservice architecture.

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
- `PORT` - Port untuk server (default: 3002)

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
- Membuat tabel `users` jika belum ada
- Membuat constraint dan index yang diperlukan
- Mencatat migration di tabel `pgmigrations_user`

### 4. Jalankan Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:3002` (atau sesuai PORT di `.env`)

## API Endpoints

### Health Check
- `GET /health` - Cek status layanan

### Users
- `GET /api/users` - Mendapatkan semua pengguna (dengan pagination)
- `POST /api/users/register` - Mendaftarkan pengguna baru
- `GET /api/users/:id` - Mendapatkan pengguna berdasarkan ID

### Dokumentasi API
- `GET /api-docs` - Swagger UI documentation

## Struktur Database

### Tabel `users`
- `id` (UUID) - Primary key
- `name` (TEXT) - Nama lengkap pengguna
- `email` (TEXT) - Email pengguna (unique)
- `phone` (TEXT) - Nomor telepon (unique)
- `password` (TEXT) - Password (disimpan sebagai plain text, direkomendasikan untuk di-hash dengan bcrypt di production)
- `created_at` (TIMESTAMPTZ) - Waktu pembuatan
- `updated_at` (TIMESTAMPTZ) - Waktu update terakhir

## Migration

Service ini menggunakan `node-pg-migrate` untuk migration. File migration berada di folder `migrations/`.

Migration table yang digunakan: `pgmigrations_user` (terpisah dari routeservice dan driverservice)

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

- Service ini menggunakan database yang sama dengan routeservice dan driverservice, tapi dengan migration table terpisah (`pgmigrations_user`)
- Port default: 3002 (berbeda dengan routeservice 3000 dan driverservice 3001)
- Semua endpoint menggunakan format JSON
- Password saat ini disimpan sebagai plain text. Untuk production, direkomendasikan menggunakan bcrypt untuk hashing password
- Email dan phone harus unique (tidak boleh duplikat)

