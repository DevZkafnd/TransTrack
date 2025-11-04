# RouteService - TransTrack Microservice

RouteService adalah layanan backend dalam arsitektur microservice TransTrack yang berfungsi sebagai penyedia API (Provider) untuk mengelola data master rute dan halte menggunakan PostgreSQL.

## Fitur

- ✅ RESTful API dengan operasi CRUD lengkap untuk rute
- ✅ Persistensi data dengan PostgreSQL
- ✅ Database migration dengan node-pg-migrate
- ✅ Dokumentasi API interaktif menggunakan Swagger/OpenAPI
- ✅ Validasi data request
- ✅ Error handling yang komprehensif
- ✅ Pagination dan filtering
- ✅ Health check endpoint

## Teknologi

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **pg** - PostgreSQL driver untuk Node.js
- **node-pg-migrate** - Database migrations
- **Swagger (OpenAPI)** - Dokumentasi API
- **swagger-jsdoc** - Generate Swagger dari JSDoc comments
- **swagger-ui-express** - UI untuk dokumentasi Swagger

## Struktur Proyek

```
TransTrack/                    # Root repository
│
├── routeservice/              # Layanan RouteService
│   ├── config/
│   │   ├── db.js             # Koneksi Pool PostgreSQL (pg)
│   │   ├── swagger.js        # Konfigurasi Swagger
│   │   └── migration.config.js # Konfigurasi node-pg-migrate
│   ├── migrations/
│   │   └── 0001_initial_schema.js  # Migrasi skema awal
│   ├── routes/
│   │   └── routes.js         # Endpoint CRUD untuk rute (pakai PostgreSQL)
│   ├── server.js             # Entry point aplikasi
│   ├── package.json          # Dependencies RouteService
│   └── package-lock.json
│
├── .gitignore                # Gitignore utama (root)
└── README.md                 # Dokumentasi utama
```

### Konfigurasi .gitignore Utama (Root)

Untuk menjaga agar monorepo ini bersih dan aman, file `.gitignore` di root direktori (`TransTrack/.gitignore`) berisi aturan untuk mengabaikan file di semua layanan:

```gitignore
# Mengabaikan SEMUA folder node_modules
**/node_modules

# Mengabaikan SEMUA file environment
**/.env
**/.env.local
**/.env.*.local

# Mengabaikan SEMUA kunci service account Firebase
**/transtrack-86fba-*.json
**/serviceAccountKey.json
**/*-firebase-adminsdk-*.json

# File sistem operasi
.DS_Store
Thumbs.db

# Logs
**/logs
**/*.log
```

**Catatan Penting:** Setiap folder service (routeservice, busservice, dll.) memiliki `.gitignore` sendiri untuk aturan spesifik service tersebut.

## Prasyarat

- Node.js (v16 atau lebih tinggi)
- npm atau yarn
- PostgreSQL 13+ (lokal atau managed)

## Instalasi

1. **Clone repository atau buat direktori proyek**

```bash
cd TransTrack
```

2. **Masuk ke folder routeservice dan install dependencies**

```bash
cd routeservice
npm install
```

3. **Setup Environment (.env)**

   Buat file `.env` di folder `routeservice` dengan isi:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=transtrack
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_SSL=false
   ```

4. **Jalankan migrasi database**

   ```bash
   npm run migrate
   ```

## Menjalankan Aplikasi

**Pastikan Anda berada di folder routeservice:**
```bash
cd routeservice
```

**Development mode (dengan auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:3000` (atau port yang dikonfigurasi di `.env`)

## API Endpoints

### Base URL
```
http://localhost:3000/api/routes
```

### Endpoints

#### 1. GET /api/routes
Mendapatkan semua rute dengan pagination dan filtering.

**Query Parameters:**
- `status` (optional): Filter berdasarkan status (`active`, `inactive`, `maintenance`)
- `limit` (optional): Jumlah maksimal rute (default: 100)
- `offset` (optional): Offset untuk pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "route_abc123",
      "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
      "routeCode": "RT-001",
      "description": "Rute utama menghubungkan terminal kota dengan bandara",
      "stops": [
        {
          "stopName": "Halte Terminal Kota",
          "stopCode": "STP-001",
          "latitude": -6.2088,
          "longitude": 106.8456,
          "address": "Jl. Terminal Kota No. 1",
          "sequence": 1
        }
      ],
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

#### 2. GET /api/routes/:id
Mendapatkan rute berdasarkan ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "route_abc123",
    "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
    ...
  }
}
```

#### 3. POST /api/routes
Membuat rute baru.

**Request Body:**
```json
{
  "routeName": "Rute A - Terminal Kota ke Terminal Bandara",
  "routeCode": "RT-001",
  "description": "Rute utama menghubungkan terminal kota dengan bandara",
  "stops": [
    {
      "stopName": "Halte Terminal Kota",
      "stopCode": "STP-001",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "address": "Jl. Terminal Kota No. 1",
      "sequence": 1
    }
  ],
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Route created successfully",
  "data": {
    "id": "route_abc123",
    ...
  }
}
```

#### 4. PUT /api/routes/:id
Update seluruh data rute (full update).

**Request Body:** Sama seperti POST

#### 5. PATCH /api/routes/:id
Update sebagian data rute (partial update).

**Request Body:** Hanya field yang ingin diupdate

#### 6. DELETE /api/routes/:id
Menghapus rute.

**Response:**
```json
{
  "success": true,
  "message": "Route deleted successfully"
}
```

### Health Check

#### GET /health
Mengecek status kesehatan layanan.

**Response:**
```json
{
  "status": "OK",
  "service": "RouteService",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Dokumentasi API

Dokumentasi API interaktif tersedia di:
```
http://localhost:3000/api-docs
```

Dokumentasi menggunakan Swagger UI yang memungkinkan Anda untuk:
- Melihat semua endpoint yang tersedia
- Melihat struktur request/response
- Menguji endpoint langsung dari browser

## Struktur Data

### Route Schema

```javascript
{
  id: string,                    // UUID (generated oleh database)
  routeName: string,             // Required: Nama rute
  routeCode: string,             // Required: Kode unik rute
  description: string,           // Optional: Deskripsi rute
  stops: Array<Stop>,            // Required: Array halte
  status: string,                // Enum: 'active' | 'inactive' | 'maintenance'
  createdAt: string,             // ISO timestamp (timestamptz)
  updatedAt: string              // ISO timestamp (timestamptz)
}
```

### Stop Schema

```javascript
{
  stopName: string,              // Required: Nama halte
  stopCode: string,              // Required: Kode unik halte
  latitude: number,              // Required: Koordinat latitude
  longitude: number,             // Required: Koordinat longitude
  address: string,               // Optional: Alamat halte
  sequence: number               // Optional: Urutan halte dalam rute
}
```

## Skema Database (PostgreSQL)

Tabel utama:

- `routes`
  - `id UUID PRIMARY KEY`
  - `route_name TEXT NOT NULL`
  - `route_code TEXT NOT NULL UNIQUE`
  - `description TEXT NOT NULL DEFAULT ''`
  - `status route_status NOT NULL DEFAULT 'active'`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`

- `stops`
  - `id UUID PRIMARY KEY`
  - `route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE`
  - `stop_name TEXT NOT NULL`
  - `stop_code TEXT NOT NULL`
  - `latitude numeric(10,6) NOT NULL`
  - `longitude numeric(10,6) NOT NULL`
  - `sequence integer NOT NULL`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`

Enum: `route_status` dengan nilai `active | inactive | maintenance`.

## Error Handling

API mengembalikan error dalam format berikut:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detail error message"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Menambahkan Endpoint Baru

1. Edit `src/routes/routes.js` untuk menambahkan endpoint baru
2. Tambahkan dokumentasi Swagger menggunakan JSDoc comments
3. Dokumentasi akan otomatis muncul di `/api-docs`

### Testing

Untuk testing, Anda dapat menggunakan:
- Swagger UI di `/api-docs`
- Postman atau tools API testing lainnya
- curl command

**Contoh curl:**
```bash
# Get all routes
curl http://localhost:3000/api/routes

# Create route
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeName": "Rute A",
    "routeCode": "RT-001",
    "stops": [
      {
        "stopName": "Halte 1",
        "stopCode": "STP-001",
        "latitude": -6.2088,
        "longitude": 106.8456
      }
    ]
  }'
```

## Migrations & Operasional DB

- Buat/ubah skema: tambah file di `routeservice/migrations` lalu jalankan `npm run migrate`
- Unique constraint pada `route_code` akan menghasilkan error kode `23505`. Aplikasi sudah menangani ini dan mengembalikan HTTP 400.
- Port already in use: ubah `PORT` pada `.env` atau hentikan proses yang menggunakan port tersebut.

## Template untuk Layanan Lain

File README.md ini dapat digunakan sebagai **template standar** untuk semua layanan provider lainnya (BusService, DriverService, UserService, dll.).

### Cara Menggunakan Template:

1. **Salin folder `routeservice`** dan ganti namanya (misal: menjadi `busservice`)
2. **Salin file README.md ini** ke dalam folder service baru
3. **Lakukan "Find and Replace"** di dalam README.md untuk istilah-istilah berikut:

   | Cari Teks Ini | Ganti Dengan (Contoh untuk BusService) |
   |---------------|----------------------------------------|
   | `routeservice` | `busservice` |
   | `RouteService` | `BusService` |
   | `Rute` / `rute` | `Bus` / `bus` |
   | `Route Schema` | `Bus Schema` |
   | `/api/routes` | `/api/buses` |
   | `routeName`, `routeCode` | `busName`, `licensePlate` (sesuai skema) |
   | `Stop Schema` | (Hapus atau ganti sesuai kebutuhan) |

4. **Update skema data** sesuai dengan entitas yang dikelola service tersebut
5. **Update endpoint API** sesuai dengan operasi CRUD yang diperlukan

Dengan menggunakan template ini, semua layanan provider akan memiliki dokumentasi yang konsisten dan profesional.

## Lisensi

ISC

## Kontribusi

Silakan buat issue atau pull request untuk kontribusi.

