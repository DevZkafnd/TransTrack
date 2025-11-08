# GatewayService - API Gateway

API Gateway sebagai entry point tunggal untuk semua service TransTrack.

## Deskripsi

GatewayService bertindak sebagai reverse proxy yang meneruskan request dari frontend ke service-service backend yang sesuai. Ini memungkinkan frontend hanya perlu mengetahui satu URL (gateway) daripada harus mengetahui semua URL service.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy env.example ke .env:
```bash
cp env.example .env
```

3. Sesuaikan .env jika diperlukan (default sudah sesuai untuk development)

4. Jalankan service:
```bash
npm run dev
```

## Port

Default port: `8000`

## Endpoints

- `/health` - Health check
- `/api-docs` - Swagger documentation
- `/api/routes` - Proxy ke RouteService (port 3000)
- `/api/drivers` - Proxy ke DriverService (port 3001)
- `/api/users` - Proxy ke UserService (port 3002)
- `/api/maintenance` - Proxy ke MaintenanceService (port 3003)
- `/api/tickets` - Proxy ke TicketService (port 3004)
- `/api/schedules` - Proxy ke ScheduleService (port 3005)

## Environment Variables

- `PORT` - Port untuk gateway service (default: 8000)
- `ROUTE_SERVICE_URL` - URL RouteService (default: http://localhost:3000)
- `DRIVER_SERVICE_URL` - URL DriverService (default: http://localhost:3001)
- `USER_SERVICE_URL` - URL UserService (default: http://localhost:3002)
- `MAINTENANCE_SERVICE_URL` - URL MaintenanceService (default: http://localhost:3003)
- `TICKET_SERVICE_URL` - URL TicketService (default: http://localhost:3004)
- `SCHEDULE_SERVICE_URL` - URL ScheduleService (default: http://localhost:3005)

## Cara Kerja

GatewayService menggunakan Express.js dan Axios untuk memproksi request:
1. Frontend mengirim request ke GatewayService (port 8000)
2. GatewayService meneruskan request ke service yang sesuai berdasarkan path
3. Service memproses request dan mengembalikan response
4. GatewayService meneruskan response kembali ke frontend

## Catatan

- GatewayService tidak menyimpan data, hanya meneruskan request
- Semua request/response di-log untuk debugging
- Timeout default: 10 detik
- CORS sudah diaktifkan untuk semua origin (development)
