# Troubleshooting Guide

## Deprecation Warning: punycode module

Jika Anda melihat warning seperti ini:
```
(node:7440) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
```

**Ini adalah warning, bukan error.** Aplikasi tetap berfungsi dengan baik. Warning ini berasal dari dependency (kemungkinan `firebase-admin` atau dependency lainnya) dan tidak mempengaruhi operasi aplikasi.

### Solusi (Opsional)
Jika ingin menghilangkan warning ini, Anda bisa:
1. Update dependencies ke versi terbaru (jika tersedia)
2. Atau abaikan warning ini karena tidak mempengaruhi fungsi aplikasi

## Masalah Umum Lainnya

### 1. Firestore Index Error
**Gejala:** Error tentang composite index yang diperlukan

**Solusi:** 
- Query sudah dioptimasi untuk menghindari kebutuhan composite index
- Jika masih muncul error, lihat bagian Troubleshooting di README.md

### 2. Port Already in Use
**Gejala:** Error "EADDRINUSE: address already in use"

**Solusi:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Atau ubah PORT di file `.env`

### 3. Firebase Connection Error
**Gejala:** Error saat menginisialisasi Firebase

**Solusi:**
- Pastikan file service account key ada dan valid
- Pastikan project ID sesuai dengan proyek Firebase Anda
- Pastikan Firestore API sudah diaktifkan di Firebase Console

### 4. CORS Error (saat akses dari browser)
**Gejala:** CORS policy error di browser

**Solusi:**
- CORS sudah diaktifkan di server
- Pastikan Anda mengakses dari origin yang diizinkan
- Untuk development, CORS sudah dikonfigurasi untuk menerima semua origin

### 5. Sorting tidak bekerja dengan benar
**Gejala:** Data tidak terurut dengan benar saat menggunakan filter status

**Solusi:**
- Sudah diperbaiki dengan handling Firestore Timestamp yang lebih baik
- Pastikan menggunakan versi terbaru dari kode

## Testing Endpoints

Untuk memastikan semua endpoint berfungsi:

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Get All Routes:**
   ```bash
   curl http://localhost:3000/api/routes
   ```

3. **Get Routes dengan Filter:**
   ```bash
   curl http://localhost:3000/api/routes?status=active
   ```

4. **Create Route:**
   ```bash
   curl -X POST http://localhost:3000/api/routes \
     -H "Content-Type: application/json" \
     -d '{
       "routeName": "Rute Test",
       "routeCode": "RT-TEST",
       "stops": [{
         "stopName": "Halte Test",
         "stopCode": "STP-TEST",
         "latitude": -6.2088,
         "longitude": 106.8456
       }]
     }'
   ```

## Log dan Debugging

Semua error akan dicatat di console. Untuk debugging:
- Periksa console output untuk error messages
- Gunakan Swagger UI di `/api-docs` untuk testing interaktif
- Pastikan Firestore collection `routes` sudah dibuat di Firebase Console

