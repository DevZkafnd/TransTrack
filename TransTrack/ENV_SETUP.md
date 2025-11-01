# Setup Environment Variables

## Konfigurasi Firebase

File service account key Firebase Anda sudah ada di root directory:
```
transtrack-86fba-firebase-adminsdk-fbsvc-fd4ee18a0d.json
```

### Opsi 1: Menggunakan File Default (Direkomendasikan)
Konfigurasi sudah otomatis menggunakan file default jika ada. Tidak perlu setup tambahan.

### Opsi 2: Menggunakan Environment Variable
Buat file `.env` di root directory dengan konten berikut:

```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY=./transtrack-86fba-firebase-adminsdk-fbsvc-fd4ee18a0d.json
FIREBASE_PROJECT_ID=transtrack-86fba

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Project ID
Project ID Firebase Anda: `transtrack-86fba`

### Catatan Keamanan
- File service account key sudah ditambahkan ke `.gitignore` untuk keamanan
- Jangan commit file `*-firebase-adminsdk-*.json` ke repository
- Gunakan environment variables untuk production

