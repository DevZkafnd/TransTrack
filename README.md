# RouteService - TransTrack Microservice

RouteService adalah layanan backend pertama dalam arsitektur microservice TransTrack yang berfungsi sebagai Penyedia API (Provider) murni untuk mengelola data master rute dan halte.

## Fitur

- ✅ RESTful API dengan operasi CRUD lengkap untuk rute
- ✅ Integrasi dengan Cloud Firestore (Firebase)
- ✅ Dokumentasi API interaktif menggunakan Swagger/OpenAPI
- ✅ Validasi data request
- ✅ Error handling yang komprehensif
- ✅ Pagination dan filtering
- ✅ Health check endpoint

## Teknologi

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Admin SDK** - Integrasi dengan Cloud Firestore
- **Swagger (OpenAPI)** - Dokumentasi API
- **swagger-jsdoc** - Generate Swagger dari JSDoc comments
- **swagger-ui-express** - UI untuk dokumentasi Swagger

## Struktur Proyek

```
TransTrack/                    # Root repository
│
├── routeservice/              # Layanan RouteService
│   ├── config/
│   │   ├── firebase.js       # Konfigurasi Firebase/Firestore
│   │   └── swagger.js        # Konfigurasi Swagger
│   ├── routes/
│   │   └── routes.js         # Endpoint CRUD untuk rute
│   ├── server.js             # Entry point aplikasi
│   ├── package.json          # Dependencies RouteService
│   ├── package-lock.json
│   ├── .gitignore            # Gitignore khusus RouteService
│   ├── transtrack-86fba-firebase-adminsdk-*.json  # Firebase Service Account Key
│   ├── ENV_SETUP.md          # Panduan setup environment variables
│   └── TROUBLESHOOTING.md    # Panduan troubleshooting
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

- Node.js (v14 atau lebih tinggi)
- npm atau yarn
- Akun Firebase dengan proyek "transtrack-86fba"
- Firebase Service Account Key sudah tersedia di root directory

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

3. **Setup Firebase (Kredensial Rahasia)**

   ⚠️ **PENTING: File Service Account Key adalah RAHASIA dan TIDAK BOLEH ada di dalam Git.**
   
   Layanan ini memerlukan Kunci Service Account Firebase untuk terhubung ke Cloud Firestore. Setiap developer harus mengunduh file kunci mereka sendiri.
   
   **Langkah Setup:**
   
   1. Buka [Firebase Console](https://console.firebase.google.com/) → Pilih project `transtrack-86fba`
   2. Buka **Project Settings** (ikon gear di sidebar) → Tab **Service accounts**
   3. Klik tombol **"Generate new private key"**
   4. Dialog akan muncul, klik **"Generate key"**
   5. File `.json` akan otomatis terunduh ke komputer Anda
   6. **Ubah namanya** menjadi `serviceAccountKey.json` (atau nama yang diinginkan)
   7. **Pindahkan file `.json` ini** ke dalam folder `routeservice/`
   
   **Catatan Keamanan:**
   
   - File `.gitignore` di root dan di `routeservice/` sudah dikonfigurasi untuk mengabaikan semua file kunci service account
   - File `.json` ini **TIDAK AKAN** ter-upload ke GitHub
   - Jangan pernah commit file kunci service account ke Git
   - Jangan bagikan file kunci ini kepada siapa pun
   
   **Konfigurasi Otomatis:**
   
   Aplikasi akan otomatis mendeteksi file kunci jika ditempatkan di folder `routeservice/` dengan nama:
   - `serviceAccountKey.json`, atau
   - `transtrack-86fba-firebase-adminsdk-*.json`
   
   **Alternatif: Menggunakan Environment Variable**
   
   Anda juga dapat menggunakan environment variable untuk menentukan path ke file kunci. Buat file `.env` di folder `routeservice`:
   
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
   FIREBASE_PROJECT_ID=transtrack-86fba
   PORT=3000
   NODE_ENV=development
   ```
   
   **Opsi Lain: Application Default Credentials**
   
   - Setup gcloud CLI dan autentikasi
   - Atau set environment variable `GOOGLE_APPLICATION_CREDENTIALS`

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
  id: string,                    // Auto-generated oleh Firestore
  routeName: string,             // Required: Nama rute
  routeCode: string,             // Required: Kode unik rute
  description: string,           // Optional: Deskripsi rute
  stops: Array<Stop>,            // Required: Array halte
  status: string,                // Enum: 'active' | 'inactive' | 'maintenance'
  createdAt: Timestamp,          // Auto-generated
  updatedAt: Timestamp            // Auto-generated
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

## Firestore Collection

Data rute disimpan dalam collection `routes` di Cloud Firestore dengan struktur berikut:

```
routes/
  ├── {routeId}/
  │   ├── routeName: string
  │   ├── routeCode: string
  │   ├── description: string
  │   ├── stops: array
  │   ├── status: string
  │   ├── createdAt: Timestamp
  │   └── updatedAt: Timestamp
```

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

## Troubleshooting

### Firebase Connection Error
- Pastikan Service Account Key valid dan memiliki akses ke Firestore
- Pastikan project ID sesuai dengan proyek Firebase Anda
- Pastikan Firestore API sudah diaktifkan di Firebase Console

### Firestore Index Error
Jika Anda mendapatkan error tentang composite index yang diperlukan, ada dua solusi:

**Solusi 1: Query sudah dioptimasi (Default)**
- Aplikasi sudah dioptimasi untuk menghindari kebutuhan composite index
- Ketika filter `status` digunakan, sorting dilakukan di aplikasi
- Ini bekerja tanpa perlu membuat index tambahan

**Solusi 2: Membuat Composite Index (Untuk Performa Lebih Baik)**
Jika Anda ingin performa yang lebih baik dengan banyak data, buat composite index di Firestore:

1. Buka Firebase Console: https://console.firebase.google.com/project/transtrack-86fba/firestore/indexes
2. Klik link yang muncul di error message, atau buat index manual dengan:
   - Collection ID: `routes`
   - Fields:
     - `status` (Ascending)
     - `createdAt` (Descending)
3. Tunggu sampai index selesai dibuat (biasanya beberapa menit)

Setelah index dibuat, query akan lebih efisien.

### Port Already in Use
- Ubah PORT di file `.env`
- Atau kill process yang menggunakan port tersebut

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

