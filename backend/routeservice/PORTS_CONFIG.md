# Port Configuration untuk RouteService

## Port yang Digunakan

### RouteService
- **Port:** `3000`
- **URL:** `http://localhost:3000`
- **File:** `backend/routeservice/.env` → `PORT=3000`

### BusService
- **Port:** `3006`
- **URL:** `http://localhost:3006`
- **File:** `backend/busservice/.env` → `PORT=3006`

## Konfigurasi .env

### backend/routeservice/.env
```env
PORT=3000
BUS_SERVICE_URL=http://localhost:3006
ROUTE_SERVICE_URL=http://localhost:3000
```

### backend/busservice/.env
```env
PORT=3006
```

## Verifikasi Port

### Check apakah BusService berjalan di port 3006:
```bash
# Test koneksi
curl http://localhost:3006/api/buses

# Atau test health
curl http://localhost:3006/health
```

### Check apakah RouteService berjalan di port 3000:
```bash
# Test koneksi
curl http://localhost:3000/api/routes

# Atau test health
curl http://localhost:3000/health
```

## Troubleshooting

### Error: "Tidak bisa terhubung ke BusService"
1. Pastikan BusService berjalan:
   ```bash
   cd backend/busservice
   npm run dev
   ```

2. Check port di .env:
   ```bash
   # File: backend/busservice/.env
   PORT=3006
   ```

3. Check apakah port 3006 sudah digunakan:
   ```bash
   # Windows
   netstat -ano | findstr :3006
   
   # Linux/Mac
   lsof -i :3006
   ```

### Error: "BUS_SERVICE_URL tidak benar"
1. Check file `.env` di routeservice:
   ```bash
   # File: backend/routeservice/.env
   BUS_SERVICE_URL=http://localhost:3006
   ```

2. Pastikan tidak ada typo atau spasi

## Script untuk Check

```bash
# Check semua service
cd backend/routeservice
npm run check-services

# Test koneksi ke BusService
npm run test-bus
```

