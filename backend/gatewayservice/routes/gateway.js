const express = require('express');
const axios = require('axios');
const router = express.Router();

require('dotenv').config();

// Service URLs from environment variables
const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'http://localhost:3000';
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const MAINTENANCE_SERVICE_URL = process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:3003';
const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3004';
const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005';
const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';

// Helper function untuk safe axios calls dengan timeout dan error handling
const safeAxiosGet = async (url, options = {}) => {
  try {
    const method = options.method || 'GET';
    const axiosOptions = {
      timeout: options.timeout || 5000,
      validateStatus: (status) => status < 500, // Accept 200-499
      ...options
    };
    
    // Remove method from options to avoid conflict
    delete axiosOptions.method;
    
    let response;
    if (method === 'POST') {
      response = await axios.post(url, options.data, axiosOptions);
    } else {
      response = await axios.get(url, axiosOptions);
    }
    
    return response;
  } catch (error) {
    // Handle connection errors gracefully
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return null; // Return null untuk connection errors
    }
    // Re-throw other errors
    throw error;
  }
};

// Helper function to proxy requests
const proxyRequest = async (req, res, serviceUrl, servicePath = '') => {
  try {
    // req.url is already relative to the matched route prefix
    // e.g., for router.use('/tickets', ...):
    //   - /api/tickets -> req.url = ''
    //   - /api/tickets/123 -> req.url = '/123'
    //   - /api/tickets/123/status -> req.url = '/123/status'
    // We construct the target URL: serviceUrl + servicePath + req.url
    const targetPath = `${servicePath}${req.url}`;
    const targetUrl = `${serviceUrl}${targetPath}`;
    
    const config = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header to avoid issues
        'x-forwarded-for': req.ip || req.connection.remoteAddress,
        'x-forwarded-proto': req.protocol,
      },
      params: req.query,
      data: req.body,
      timeout: 5000, // Reduce timeout to 5 seconds
      validateStatus: (status) => {
        // Accept status 200-399 (including 304 Not Modified)
        return status >= 200 && status < 400;
      },
    };

    const response = await axios(config);
    // Status 304 (Not Modified) adalah response yang valid, bukan error
    if (response.status === 304) {
      return res.status(304).end();
    }
    res.status(response.status).json(response.data);
  } catch (error) {
    // Handle connection errors gracefully - jangan log berulang kali
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      // Silent log untuk connection errors (tidak spam console)
      // Hanya log sekali per service dengan rate limiting
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: `Service tidak dapat dijangkau: ${serviceUrl}`,
      });
      return;
    }
    
    // Log error lain yang tidak terkait connection
    if (error.response) {
      // Server error (5xx) - log untuk debugging
      if (error.response.status >= 500) {
        console.error(`Error proxying to ${serviceUrl}:`, error.response.status, error.message);
      }
      res.status(error.response.status).json(error.response.data);
    } else {
      // Other errors - log untuk debugging
      console.error(`Error proxying to ${serviceUrl}:`, error.message);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: `Terjadi kesalahan saat memproses request: ${error.message}`,
      });
    }
  }
};

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Get all routes (proxied to RouteService)
 *     tags: [Routes]
 *     responses:
 *       200:
 *         description: List of routes
 */
router.use('/routes', (req, res) => proxyRequest(req, res, ROUTE_SERVICE_URL, '/api/routes'));

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Get all drivers (proxied to DriverService)
 *     tags: [Drivers]
 *     responses:
 *       200:
 *         description: List of drivers
 */
router.use('/drivers', (req, res) => proxyRequest(req, res, DRIVER_SERVICE_URL, '/api/drivers'));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (proxied to UserService)
 *     tags: [Users]
 *   post:
 *     summary: Register new user (proxied to UserService)
 *     tags: [Users]
 */
router.use('/users', (req, res) => proxyRequest(req, res, USER_SERVICE_URL, '/api/users'));

/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     summary: Get maintenance data (proxied to MaintenanceService)
 *     tags: [Maintenance]
 *   post:
 *     summary: Create maintenance record (proxied to MaintenanceService)
 *     tags: [Maintenance]
 */
router.use('/maintenance', (req, res) => proxyRequest(req, res, MAINTENANCE_SERVICE_URL, '/api/maintenance'));

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get tickets (proxied to TicketService)
 *     tags: [Tickets]
 *   post:
 *     summary: Create ticket (proxied to TicketService)
 *     tags: [Tickets]
 */
router.use('/tickets', (req, res) => proxyRequest(req, res, TICKET_SERVICE_URL, '/api/tickets'));

/**
 * @swagger
 * /api/dashboard/operating-buses:
 *   get:
 *     summary: Get all buses with their operating status and route (aggregated from BusService, MaintenanceService, ScheduleService, and RouteService)
 *     description: |
 *       Endpoint ini mengembalikan semua bus dari BusService dengan:
 *       - Status maintenance dari MaintenanceService
 *       - Rute terbaru dari ScheduleService (jika ada)
 *       - Detail rute dari RouteService
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Daftar bus dengan status operasi dan rute
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bus:
 *                         type: string
 *                         example: "B 1234 CD"
 *                       model:
 *                         type: string
 *                         example: "Mercedes-Benz Tourismo"
 *                       capacity:
 *                         type: integer
 *                         example: 40
 *                       rute:
 *                         type: string
 *                         example: "Rute A - Terminal Kota ke Terminal Bandara"
 *                       status:
 *                         type: string
 *                         example: "Beroperasi"
 *       500:
 *         description: Kesalahan server
 */
// Route ini harus ditempatkan SEBELUM /buses agar tidak tertangkap oleh router.use('/buses')
router.get('/dashboard/operating-buses', async (req, res) => {
  try {
    // LANGKAH 1: Ambil semua bus dari BusService
    const busesResponse = await safeAxiosGet(`${BUS_SERVICE_URL}/api/buses?limit=100`);
    if (!busesResponse || busesResponse.status !== 200) {
      return res.json({
        success: true,
        data: [],
        message: 'BusService tidak tersedia'
      });
    }
    const buses = busesResponse.data?.data || [];

    if (buses.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // LANGKAH 2: Untuk setiap bus, ambil data maintenance, schedule terbaru, dan route
    const enrichedBuses = await Promise.all(
      buses.map(async (bus) => {
        try {
          // Buat array promises untuk fetch data dari berbagai service
          const promises = [];

          // Cek apakah bus sedang dalam maintenance
          promises.push(
            safeAxiosGet(
              `${MAINTENANCE_SERVICE_URL}/api/maintenance/bus/${bus.id}?status=in_progress&limit=1`
            ).then(res => res || { data: { data: [] } }).catch(() => ({ data: { data: [] } }))
          );

          // Ambil schedule untuk bus ini (jika ada) untuk mendapatkan routeId
          // Ambil beberapa schedule untuk mendapatkan yang terbaru
          promises.push(
            safeAxiosGet(
              `${SCHEDULE_SERVICE_URL}/api/schedules?busId=${bus.id}&limit=10`
            ).then(res => res || { data: { data: [] } }).catch(() => ({ data: { data: [] } }))
          );

          // Tunggu semua promise selesai
          const [maintenanceResponse, scheduleResponse] = await Promise.all(promises);

          const maintenanceList = maintenanceResponse.data?.data || [];
          const isMaintenance = maintenanceList.length > 0;

          // Ambil route dari RouteService menggunakan filter busId
          let routeName = '-';
          let routeCode = '-';
          let routeId = null;
          let routeHasBusId = false;
          
          // Coba ambil route berdasarkan busId (prioritaskan active routes)
          const routeResponse = await safeAxiosGet(
            `${ROUTE_SERVICE_URL}/api/routes?busId=${encodeURIComponent(bus.id)}&status=active&limit=10`,
            { timeout: 3000 }
          );
          
          if (routeResponse && routeResponse.status === 200) {
            const routes = routeResponse.data?.data || [];
            if (routes.length > 0) {
              // Ambil route pertama (atau yang active jika ada)
              const activeRoute = routes.find(r => r.status === 'active') || routes[0];
              routeName = activeRoute.routeName || activeRoute.description || '-';
              routeCode = activeRoute.routeCode || '-';
              routeId = activeRoute.id || null;
              routeHasBusId = !!activeRoute.busId;
            }
          }
          
          // Jika tidak ada route dengan status active, coba ambil semua routes dengan busId ini
          if (routeName === '-' && routeCode === '-') {
            const allRoutesResponse = await safeAxiosGet(
              `${ROUTE_SERVICE_URL}/api/routes?busId=${encodeURIComponent(bus.id)}&limit=10`,
              { timeout: 3000 }
            );
            
            if (allRoutesResponse && allRoutesResponse.status === 200) {
              const allRoutes = allRoutesResponse.data?.data || [];
              if (allRoutes.length > 0) {
                // Prioritaskan active, lalu maintenance, lalu inactive
                const sortedRoutes = allRoutes.sort((a, b) => {
                  const statusOrder = { active: 1, maintenance: 2, inactive: 3 };
                  return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                });
                const selectedRoute = sortedRoutes[0];
                routeName = selectedRoute.routeName || selectedRoute.description || '-';
                routeCode = selectedRoute.routeCode || '-';
                routeId = selectedRoute.id || null;
                routeHasBusId = !!selectedRoute.busId;
              }
            }
          }
          
          // Ambil schedules untuk sync bus_id
          const schedules = scheduleResponse.data?.data || [];
          
          // Fallback: coba ambil dari schedule jika route tidak ditemukan
          // Dan sync bus_id dari schedule ke routes table
          if (routeName === '-' && routeCode === '-') {
            if (schedules.length > 0) {
              const sortedSchedules = schedules.sort((a, b) => {
                const timeA = a.time ? new Date(a.time).getTime() : 0;
                const timeB = b.time ? new Date(b.time).getTime() : 0;
                return timeB - timeA;
              });
              const latestSchedule = sortedSchedules[0];
              routeName = latestSchedule.routeName || '-';
              routeCode = latestSchedule.routeCode || '-';
              routeId = latestSchedule.routeId || null;
              
              // Sync bus_id dari schedule ke routes table (background, tidak blocking)
              if (latestSchedule.routeId && bus.id) {
                safeAxiosGet(
                  `${ROUTE_SERVICE_URL}/api/routes/${latestSchedule.routeId}/assign-bus`,
                  {
                    method: 'POST',
                    timeout: 2000,
                    data: { busId: bus.id }
                  }
                ).catch(() => {
                  // Silent fail, tidak perlu log
                });
              }
            }
          } else if (routeId && !routeHasBusId && schedules.length > 0) {
            // Jika route sudah ada tapi belum ada bus_id, sync dari schedule
            const sortedSchedules = schedules.sort((a, b) => {
              const timeA = a.time ? new Date(a.time).getTime() : 0;
              const timeB = b.time ? new Date(b.time).getTime() : 0;
              return timeB - timeA;
            });
            const latestSchedule = sortedSchedules[0];
            
            if (latestSchedule.routeId === routeId && bus.id) {
              // Sync bus_id dari schedule ke routes table (background, tidak blocking)
              safeAxiosGet(
                `${ROUTE_SERVICE_URL}/api/routes/${routeId}/assign-bus`,
                {
                  method: 'POST',
                  timeout: 2000,
                  data: { busId: bus.id }
                }
              ).catch(() => {
                // Silent fail, tidak perlu log
              });
            }
          }

          // Tentukan status bus
          let status = 'Beroperasi';
          if (isMaintenance) {
            status = 'Maintenance';
          }

          return {
            busId: bus.id,
            bus: bus.plate,
            model: bus.model,
            capacity: bus.capacity,
            routeId: routeId,
            routeCode: routeCode,
            rute: routeName,
            status: status
          };
        } catch (error) {
          // Log error hanya jika bukan connection error (untuk mengurangi noise)
          if (error.code !== 'ECONNRESET' && error.code !== 'ECONNREFUSED' && error.code !== 'ETIMEDOUT') {
            console.error(`Error enriching bus ${bus.id}:`, error.message);
          }
          // Fallback: anggap bus beroperasi jika error
          return {
            busId: bus.id,
            bus: bus.plate,
            model: bus.model || '-',
            capacity: bus.capacity || 0,
            routeId: null,
            routeCode: '-',
            rute: '-',
            status: 'Beroperasi'
          };
        }
      })
    );

    res.json({
      success: true,
      data: enrichedBuses
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil bus beroperasi:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil bus beroperasi'
    });
  }
});

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: Get schedules (proxied to ScheduleService)
 *     tags: [Schedules]
 *   post:
 *     summary: Create schedule (proxied to ScheduleService)
 *     tags: [Schedules]
 */
router.use('/schedules', (req, res) => proxyRequest(req, res, SCHEDULE_SERVICE_URL, '/api/schedules'));

/**
 * @swagger
 * /api/buses:
 *   get:
 *     summary: Get all buses (proxied to BusService)
 *     tags: [Buses]
 *   post:
 *     summary: Create bus (proxied to BusService)
 *     tags: [Buses]
 */
router.use('/buses', (req, res) => proxyRequest(req, res, BUS_SERVICE_URL, '/api/buses'));

/**
 * @swagger
 * /api/dashboard/tracking:
 *   get:
 *     summary: Get all buses with tracking information (routes, stops, drivers, schedules)
 *     description: |
 *       Endpoint ini mengembalikan semua bus dengan informasi tracking lengkap:
 *       - Data bus dari BusService
 *       - Route dan stops (coordinates) dari RouteService
 *       - Driver dari DriverService
 *       - Schedule terbaru dari ScheduleService
 *       - Posisi bus (simulasi berdasarkan schedule)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Daftar bus dengan informasi tracking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       busId:
 *                         type: string
 *                       bus:
 *                         type: string
 *                         example: "B 1234 CD"
 *                       model:
 *                         type: string
 *                       capacity:
 *                         type: integer
 *                       route:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           routeName:
 *                             type: string
 *                           routeCode:
 *                             type: string
 *                           stops:
 *                             type: array
 *                       driver:
 *                         type: object
 *                       position:
 *                         type: array
 *                         items:
 *                           type: number
 *                       status:
 *                         type: string
 *       500:
 *         description: Kesalahan server
 */
router.get('/dashboard/tracking', async (req, res) => {
  try {
    // LANGKAH 1: Ambil semua bus dari BusService
    const busesResponse = await safeAxiosGet(`${BUS_SERVICE_URL}/api/buses?limit=1000`);
    if (!busesResponse || busesResponse.status !== 200) {
      return res.json({
        success: true,
        data: [],
        message: 'BusService tidak tersedia'
      });
    }
    const buses = busesResponse.data?.data || [];

    if (buses.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // LANGKAH 2: Ambil semua routes dengan stops dari RouteService
    const routesResponse = await safeAxiosGet(`${ROUTE_SERVICE_URL}/api/routes?limit=1000`);
    const routes = routesResponse && routesResponse.status === 200 ? routesResponse.data?.data || [] : [];
    
    // Buat map route by busId untuk akses cepat
    const routeMapByBusId = new Map();
    routes.forEach(route => {
      if (route.busId) {
        routeMapByBusId.set(route.busId, route);
      }
    });

    // LANGKAH 3: Ambil semua drivers dari DriverService
    const driversResponse = await safeAxiosGet(`${DRIVER_SERVICE_URL}/api/drivers?limit=1000`);
    const drivers = driversResponse && driversResponse.status === 200 ? driversResponse.data?.data || [] : [];
    
    // Buat map driver by busId
    const driverMapByBusId = new Map();
    drivers.forEach(driver => {
      if (driver.busId) {
        driverMapByBusId.set(driver.busId, driver);
      }
    });

    // LANGKAH 4: Ambil schedules terbaru dari ScheduleService
    const schedulesResponse = await safeAxiosGet(`${SCHEDULE_SERVICE_URL}/api/schedules?limit=1000`);
    const schedules = schedulesResponse && schedulesResponse.status === 200 ? schedulesResponse.data?.data || [] : [];
    
    // Group schedules by busId, ambil yang terbaru
    const latestScheduleByBusId = new Map();
    schedules.forEach(schedule => {
      if (schedule.busId) {
        const existing = latestScheduleByBusId.get(schedule.busId);
        if (!existing || new Date(schedule.time) > new Date(existing.time)) {
          latestScheduleByBusId.set(schedule.busId, schedule);
        }
      }
    });

    // LANGKAH 5: Enrich setiap bus dengan data tracking
    const trackingData = await Promise.all(
      buses.map(async (bus) => {
        try {
          // Get route untuk bus ini
          let route = routeMapByBusId.get(bus.id);
          
          // Jika route belum ada di map atau route tidak punya stops, coba ambil detail dari RouteService
          if (!route || !route.stops || route.stops.length === 0) {
            if (!route) {
              // Cari route berdasarkan busId
              const routeResponse = await safeAxiosGet(
                `${ROUTE_SERVICE_URL}/api/routes?busId=${encodeURIComponent(bus.id)}&limit=1`,
                { timeout: 3000 }
              );
              if (routeResponse && routeResponse.status === 200) {
                const routes = routeResponse.data?.data || [];
                if (routes.length > 0) {
                  route = routes[0];
                }
              }
            }
            
            // Ambil detail route dengan stops jika route ditemukan
            if (route && route.id) {
              const routeDetailResponse = await safeAxiosGet(
                `${ROUTE_SERVICE_URL}/api/routes/${route.id}`,
                { timeout: 3000 }
              );
              if (routeDetailResponse && routeDetailResponse.status === 200) {
                route = routeDetailResponse.data?.data || route;
              }
            }
          }

          // Get driver untuk bus ini
          let driver = driverMapByBusId.get(bus.id);
          if (!driver) {
            const driverResponse = await safeAxiosGet(
              `${DRIVER_SERVICE_URL}/api/drivers?busId=${encodeURIComponent(bus.id)}&limit=1`,
              { timeout: 3000 }
            );
            if (driverResponse && driverResponse.status === 200) {
              const drivers = driverResponse.data?.data || [];
              if (drivers.length > 0) {
                driver = drivers[0];
              }
            }
          }

          // Get schedule terbaru
          const schedule = latestScheduleByBusId.get(bus.id);

          // Calculate position berdasarkan route stops dan schedule
          let position = null;
          if (route && route.stops && route.stops.length > 0) {
            // Jika ada schedule, gunakan untuk simulasi posisi
            if (schedule && schedule.time) {
              // Simulasi: posisi berdasarkan waktu schedule (0-1 progress)
              const scheduleTime = new Date(schedule.time).getTime();
              const now = Date.now();
              const elapsed = (now - scheduleTime) / (1000 * 60 * 60); // hours
              const progress = Math.min(Math.max(elapsed / 2, 0), 1); // 2 hours journey, clamp 0-1
              
              if (route.stops.length >= 2) {
                const startStop = route.stops[0];
                const endStop = route.stops[route.stops.length - 1];
                position = [
                  startStop.latitude + (endStop.latitude - startStop.latitude) * progress,
                  startStop.longitude + (endStop.longitude - startStop.longitude) * progress
                ];
              }
            } else {
              // Default: posisi di tengah route
              if (route.stops.length >= 2) {
                const startStop = route.stops[0];
                const endStop = route.stops[route.stops.length - 1];
                position = [
                  (startStop.latitude + endStop.latitude) / 2,
                  (startStop.longitude + endStop.longitude) / 2
                ];
              }
            }
          }

          // Get maintenance status
          const maintenanceResponse = await safeAxiosGet(
            `${MAINTENANCE_SERVICE_URL}/api/maintenance/bus/${bus.id}?status=in_progress&limit=1`
          );
          const isMaintenance = maintenanceResponse && maintenanceResponse.status === 200 && 
            (maintenanceResponse.data?.data || []).length > 0;

          return {
            busId: bus.id,
            bus: bus.plate,
            model: bus.model || '-',
            capacity: bus.capacity || 0,
            route: route ? {
              id: route.id,
              routeName: route.routeName || route.route_name || '-',
              routeCode: route.routeCode || route.route_code || '-',
              description: route.description || '',
              stops: route.stops || []
            } : null,
            driver: driver ? {
              id: driver.id,
              name: driver.name || driver.driverName || '-',
              contact: driver.contact || driver.phone || '-',
              license: driver.license || driver.licenseNumber || '-'
            } : null,
            schedule: schedule ? {
              id: schedule.id,
              time: schedule.time,
              routeName: schedule.routeName || schedule.route_name || '-',
              routeCode: schedule.routeCode || schedule.route_code || '-'
            } : null,
            position: position,
            status: isMaintenance ? 'Maintenance' : 'Beroperasi'
          };
        } catch (error) {
          // Log error hanya jika bukan connection error
          if (error.code !== 'ECONNRESET' && error.code !== 'ECONNREFUSED' && error.code !== 'ETIMEDOUT') {
            console.error(`Error enriching bus ${bus.id}:`, error.message);
          }
          // Fallback
          return {
            busId: bus.id,
            bus: bus.plate,
            model: bus.model || '-',
            capacity: bus.capacity || 0,
            route: null,
            driver: null,
            schedule: null,
            position: null,
            status: 'Beroperasi'
          };
        }
      })
    );

    // Filter hanya bus yang punya route dan position
    const filteredTrackingData = trackingData.filter(bus => bus.route && bus.position);

    res.json({
      success: true,
      data: filteredTrackingData
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil tracking data:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil tracking data'
    });
  }
});

module.exports = router;
