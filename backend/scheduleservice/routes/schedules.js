const express = require('express');
const axios = require('axios');
const router = express.Router();
const { pool } = require('../config/db');

require('dotenv').config();

// Service URLs from environment variables
const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'http://localhost:3000';
const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3001';
const MAINTENANCE_SERVICE_URL = process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:3003';

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: Mendapatkan semua jadwal
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *         description: Filter jadwal berdasarkan route ID
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *         description: Filter jadwal berdasarkan bus ID
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *         description: Filter jadwal berdasarkan driver ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal jadwal yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Daftar jadwal berhasil diambil
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
 *                     $ref: '#/components/schemas/Schedule'
 *                 total:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Kesalahan server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { routeId, busId, driverId, limit = 100, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const params = [];
    const conditions = [];

    if (routeId) {
      params.push(routeId);
      conditions.push(`route_id = $${params.length}`);
    }
    if (busId) {
      params.push(busId);
      conditions.push(`bus_id = $${params.length}`);
    }
    if (driverId) {
      params.push(driverId);
      conditions.push(`driver_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listSql = `
      SELECT id,
             route_id AS "routeId",
             route_name AS "routeName",
             bus_id AS "busId",
             bus_plate AS "busPlate",
             driver_id AS "driverId",
             driver_name AS "driverName",
             time,
             ticket_id AS "ticketId",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM schedules
      ${whereClause}
      ORDER BY time ASC, created_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM schedules ${whereClause}`;

    params.push(limitNum, offsetNum);

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, params),
      pool.query(countSql, params.slice(0, params.length - 2)),
    ]);

    res.json({
      success: true,
      data: listResult.rows,
      total: countResult.rows[0].cnt,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil data jadwal:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data jadwal'
    });
  }
});

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     summary: Mendapatkan jadwal berdasarkan ID
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID jadwal
 *     responses:
 *       200:
 *         description: Jadwal berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Schedule'
 *       404:
 *         description: Jadwal tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Kesalahan server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scheduleSql = `
      SELECT id,
             route_id AS "routeId",
             route_name AS "routeName",
             bus_id AS "busId",
             bus_plate AS "busPlate",
             driver_id AS "driverId",
             driver_name AS "driverName",
             time,
             ticket_id AS "ticketId",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM schedules
      WHERE id = $1
    `;
    const scheduleResult = await pool.query(scheduleSql, [id]);
    
    if (scheduleResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jadwal tidak ditemukan',
        message: `Jadwal dengan ID ${id} tidak ditemukan`
      });
    }

    res.json({ success: true, data: scheduleResult.rows[0] });
  } catch (error) {
    console.error('Kesalahan saat mengambil jadwal:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data jadwal'
    });
  }
});

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Membuat jadwal baru
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - routeName
 *               - busId
 *               - busPlate
 *               - driverId
 *               - driverName
 *               - time
 *             properties:
 *               routeId:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               routeName:
 *                 type: string
 *                 example: "Jakarta - Bandung"
 *               busId:
 *                 type: string
 *                 example: "BUS-001"
 *               busPlate:
 *                 type: string
 *                 example: "B 1234 CD"
 *               driverId:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               driverName:
 *                 type: string
 *                 example: "Budi Santoso"
 *               time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-10T09:00:00Z"
 *               ticketId:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440003"
 *     responses:
 *       201:
 *         description: Jadwal berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Jadwal berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: Permintaan tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Kesalahan server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const { routeId, routeName, busId, busPlate, driverId, driverName, time, ticketId } = req.body;

    if (!routeId || !routeName || !busId || !busPlate || !driverId || !driverName || !time) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeId, routeName, busId, busPlate, driverId, driverName, dan time wajib diisi'
      });
    }

    // Validate time format
    const timeObj = new Date(time);
    if (isNaN(timeObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'time harus dalam format tanggal yang valid'
      });
    }

    const insertScheduleSql = `
      INSERT INTO schedules (route_id, route_name, bus_id, bus_plate, driver_id, driver_name, time, ticket_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id,
                route_id AS "routeId",
                route_name AS "routeName",
                bus_id AS "busId",
                bus_plate AS "busPlate",
                driver_id AS "driverId",
                driver_name AS "driverName",
                time,
                ticket_id AS "ticketId",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
    `;
    
    const scheduleResult = await pool.query(insertScheduleSql, [
      routeId,
      routeName,
      busId,
      busPlate,
      driverId,
      driverName,
      time,
      ticketId || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Jadwal berhasil dibuat',
      data: scheduleResult.rows[0]
    });
  } catch (error) {
    console.error('Kesalahan saat membuat jadwal:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat jadwal'
    });
  }
});

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: Update seluruh data jadwal
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID jadwal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - routeName
 *               - busId
 *               - busPlate
 *               - driverId
 *               - driverName
 *               - time
 *             properties:
 *               routeId:
 *                 type: string
 *               routeName:
 *                 type: string
 *               busId:
 *                 type: string
 *               busPlate:
 *                 type: string
 *               driverId:
 *                 type: string
 *               driverName:
 *                 type: string
 *               time:
 *                 type: string
 *                 format: date-time
 *               ticketId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Jadwal berhasil diupdate
 *       404:
 *         description: Jadwal tidak ditemukan
 *       400:
 *         description: Permintaan tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { routeId, routeName, busId, busPlate, driverId, driverName, time, ticketId } = req.body;

    if (!routeId || !routeName || !busId || !busPlate || !driverId || !driverName || !time) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeId, routeName, busId, busPlate, driverId, driverName, dan time wajib diisi'
      });
    }

    // Validate time format
    const timeObj = new Date(time);
    if (isNaN(timeObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'time harus dalam format tanggal yang valid'
      });
    }

    // Check if schedule exists
    const exists = await pool.query('SELECT 1 FROM schedules WHERE id = $1', [id]);
    if (exists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jadwal tidak ditemukan',
        message: `Jadwal dengan ID ${id} tidak ditemukan`
      });
    }

    const updateScheduleSql = `
      UPDATE schedules
      SET route_id = $1,
          route_name = $2,
          bus_id = $3,
          bus_plate = $4,
          driver_id = $5,
          driver_name = $6,
          time = $7,
          ticket_id = $8,
          updated_at = NOW()
      WHERE id = $9
      RETURNING id,
                route_id AS "routeId",
                route_name AS "routeName",
                bus_id AS "busId",
                bus_plate AS "busPlate",
                driver_id AS "driverId",
                driver_name AS "driverName",
                time,
                ticket_id AS "ticketId",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
    `;
    
    const scheduleResult = await pool.query(updateScheduleSql, [
      routeId,
      routeName,
      busId,
      busPlate,
      driverId,
      driverName,
      time,
      ticketId || null,
      id
    ]);

    res.json({
      success: true,
      message: 'Jadwal berhasil diperbarui',
      data: scheduleResult.rows[0]
    });
  } catch (error) {
    console.error('Kesalahan saat mengupdate jadwal:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengupdate jadwal'
    });
  }
});

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Menghapus jadwal
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID jadwal
 *     responses:
 *       200:
 *         description: Jadwal berhasil dihapus
 *       404:
 *         description: Jadwal tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
    
    if (del.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jadwal tidak ditemukan',
        message: `Jadwal dengan ID ${id} tidak ditemukan`
      });
    }

    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error('Kesalahan saat menghapus jadwal:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat menghapus jadwal'
    });
  }
});

/**
 * @swagger
 * /api/schedules/live-schedule:
 *   get:
 *     summary: Mendapatkan bus yang sedang beroperasi dengan data lengkap (aggregated)
 *     description: |
 *       Endpoint ini mengembalikan bus yang sedang beroperasi dengan menggabungkan data dari:
 *       - BusService: Data bus (plat, model, capacity)
 *       - ScheduleService: Schedule terbaru untuk setiap bus (jika ada, dari pembayaran user)
 *       - RouteService: Nama rute lengkap dari schedule
 *       - DriverService: Nama pengemudi dari schedule
 *       - MaintenanceService: Status maintenance bus
 *     tags: [Schedules]
 *     responses:
 *       200:
 *         description: Daftar bus beroperasi dengan data lengkap
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
 *                       rute:
 *                         type: string
 *                         example: "Rute B - Terminal Kota gambir ke Terminal Kota Sawangan"
 *                       bus:
 *                         type: string
 *                         example: "B 1234 CD"
 *                       pengemudi:
 *                         type: string
 *                         example: "Budi Santoso"
 *                       waktu_keberangkatan:
 *                         type: string
 *                         example: "8 Nov 2025, 06:26"
 *                       status:
 *                         type: string
 *                         example: "Beroperasi"
 *       500:
 *         description: Kesalahan server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/live-schedule', async (req, res) => {
  try {
    // ============================================
    // LANGKAH A: Ambil semua bus dari BusService
    // ============================================
    const busesResponse = await axios.get(`${BUS_SERVICE_URL}/api/buses?limit=100`);
    const buses = busesResponse.data?.data || [];

    if (buses.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // ============================================
    // LANGKAH B: Untuk setiap bus, ambil schedule terbaru dan data detail menggunakan Promise.all
    // ============================================
    const now = new Date();
    const enrichedBuses = await Promise.all(
      buses.map(async (bus) => {
        try {
          // Buat array promises untuk fetch data dari berbagai service
          const promises = [];

          // Fetch maintenance status untuk bus
          promises.push(
            axios.get(`${MAINTENANCE_SERVICE_URL}/api/maintenance/bus/${bus.id}?status=in_progress&limit=1`)
              .then(res => {
                const maintenance = res.data?.data || [];
                return maintenance.length > 0 ? 'Maintenance' : null;
              })
              .catch(() => null)
          );

          // Fetch schedule terbaru untuk bus ini (jika ada)
          // Schedule hanya menyimpan jadwal setelah pembayaran user
          promises.push(
            pool.query(`
              SELECT 
                route_id AS "routeId",
                route_name AS "routeName",
                driver_id AS "driverId",
                driver_name AS "driverName",
                time
              FROM schedules
              WHERE bus_id = $1
              ORDER BY time DESC
              LIMIT 1
            `, [bus.id])
              .then(result => result.rows[0] || null)
              .catch(() => null)
          );

          // Tunggu semua promise selesai
          const [maintenanceStatus, latestSchedule] = await Promise.all(promises);

          // Jika ada schedule terbaru, ambil detail route dan driver
          let routeName = '-';
          let driverName = '-';
          let waktuKeberangkatan = '-';

          if (latestSchedule) {
            // Fetch route detail jika ada routeId
            if (latestSchedule.routeId) {
              try {
                const routeResponse = await axios.get(`${ROUTE_SERVICE_URL}/api/routes/${latestSchedule.routeId}`);
                routeName = routeResponse.data?.data?.routeName || latestSchedule.routeName || '-';
              } catch (error) {
                routeName = latestSchedule.routeName || '-';
              }
            } else {
              routeName = latestSchedule.routeName || '-';
            }

            // Fetch driver detail jika ada driverId
            if (latestSchedule.driverId) {
              try {
                const driverResponse = await axios.get(`${DRIVER_SERVICE_URL}/api/drivers/${latestSchedule.driverId}`);
                driverName = driverResponse.data?.data?.name || latestSchedule.driverName || '-';
              } catch (error) {
                driverName = latestSchedule.driverName || '-';
              }
            } else {
              driverName = latestSchedule.driverName || '-';
            }

            // Format waktu keberangkatan
            if (latestSchedule.time) {
              waktuKeberangkatan = new Date(latestSchedule.time).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }

          // ============================================
          // LANGKAH C: Tentukan status bus
          // ============================================
          let status = 'Beroperasi';
          if (maintenanceStatus === 'Maintenance') {
            status = 'Maintenance';
          } else if (!latestSchedule) {
            // Bus tidak ada schedule aktif, mungkin tidak beroperasi
            status = 'Tidak Beroperasi';
          } else {
            // Ada schedule, cek apakah masih aktif
            const scheduleTime = new Date(latestSchedule.time);
            const hoursAgo = (now - scheduleTime) / (1000 * 60 * 60);
            
            if (hoursAgo >= 24) {
              status = 'Sudah Tidak Beroperasi';
            } else if (hoursAgo >= 1) {
              status = 'Beroperasi';
            } else {
              status = 'Aktif';
            }
          }

          return {
            rute: routeName,
            bus: bus.plate,
            pengemudi: driverName,
            waktu_keberangkatan: waktuKeberangkatan,
            status: status
          };
        } catch (error) {
          console.error(`Error enriching bus ${bus.id}:`, error);
          // Fallback ke data bus dasar jika terjadi error
          return {
            rute: '-',
            bus: bus.plate,
            pengemudi: '-',
            waktu_keberangkatan: '-',
            status: 'Tidak Beroperasi'
          };
        }
      })
    );

    // ============================================
    // Kirim respons final
    // ============================================
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

module.exports = router;

