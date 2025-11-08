const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const busService = require('../services/busService');

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Mendapatkan semua rute
 *     tags: [Routes]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Filter rute berdasarkan status
 *       - in: query
 *         name: busId
 *         schema:
 *           type: string
 *         description: Filter rute berdasarkan bus ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal rute yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Daftar rute berhasil diambil
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
 *                     $ref: '#/components/schemas/Route'
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
    const { status, busId, limit = 100, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const params = [];
    const conditions = [];
    
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    
    if (busId) {
      params.push(busId);
      conditions.push(`bus_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listSql = `
      WITH filtered AS (
        SELECT id,
               route_name,
               route_code,
               description,
               status,
               bus_id,
               created_at,
               updated_at
        FROM routes
        ${where}
      ), ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id,
               route_name,
               route_code,
               description,
               status,
               bus_id,
               created_at,
               updated_at
        FROM filtered
      )
      SELECT id,
             display_id AS "displayId",
             route_name AS "routeName",
             route_code AS "routeCode",
             description,
             status,
             bus_id AS "busId",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked
      ORDER BY display_id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM routes ${where}`;

    params.push(limitNum, offsetNum);

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, params),
      pool.query(countSql, params.slice(0, params.length - 2)),
    ]);

    // Enrich routes with bus information
    const routes = listResult.rows;
    const busIds = routes
      .map(route => route.busId)
      .filter(busId => busId); // Filter out null/undefined

    let busMap = {};
    if (busIds.length > 0) {
      busMap = await busService.getBusesByIds(busIds);
    }

    // Add bus information to each route
    const enrichedRoutes = routes.map(route => {
      const routeData = { ...route };
      if (route.busId && busMap[route.busId]) {
        routeData.bus = busMap[route.busId];
      }
      return routeData;
    });

    res.json({
      success: true,
      data: enrichedRoutes,
      total: countResult.rows[0].cnt,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil data rute:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data rute'
    });
  }
});

/**
 * @swagger
 * /api/routes/assign-buses:
 *   post:
 *     summary: Trigger assign buses ke routes (auto-assign)
 *     description: |
 *       Endpoint ini akan menjalankan proses assign buses ke routes:
 *       1. Auto-assign dari ScheduleService
 *       2. Assign unused buses ke routes yang masih null
 *       3. Assign buses ke routes yang masih null
 *     tags: [Routes]
 *     responses:
 *       200:
 *         description: Proses assign buses berhasil dijalankan
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
 *                   example: Proses assign buses berhasil dijalankan
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: processing
 *       500:
 *         description: Kesalahan server
 */
router.post('/assign-buses', async (req, res) => {
  try {
    console.log('🔄 [Assign Buses] Endpoint dipanggil');
    
    // Import functions
    const { autoAssignFromSchedule } = require('../scripts/auto-assign-from-schedule.js');
    const { assignBusesToRoutes } = require('../scripts/assign-buses-to-routes.js');

    console.log('🔄 [Assign Buses] Fungsi berhasil di-import, memulai proses...');

    // Run auto-assign processes (non-blocking, run in background)
    // Don't wait for completion, return immediately
    Promise.all([
      autoAssignFromSchedule().catch(err => {
        console.error('❌ [Assign Buses] Error in autoAssignFromSchedule:', err.message);
        console.error('❌ [Assign Buses] Stack:', err.stack);
        return { success: false, message: err.message };
      }),
      assignBusesToRoutes().catch(err => {
        console.error('❌ [Assign Buses] Error in assignBusesToRoutes:', err.message);
        console.error('❌ [Assign Buses] Stack:', err.stack);
        return { success: false, message: err.message };
      })
    ]).then(([autoAssignResult, assignBusesResult]) => {
      console.log('✅ [Assign Buses] Process completed:', {
        autoAssign: autoAssignResult,
        assignBuses: assignBusesResult
      });
    }).catch(err => {
      console.error('❌ [Assign Buses] Error in assign buses process:', err);
      console.error('❌ [Assign Buses] Stack:', err.stack);
    });

    console.log('🔄 [Assign Buses] Proses dimulai di background, mengembalikan response...');

    // Return immediately
    res.json({
      success: true,
      message: 'Proses assign buses sedang berjalan di background',
      data: {
        status: 'processing',
        message: 'Assign buses akan dijalankan di background'
      }
    });
  } catch (error) {
    console.error('❌ [Assign Buses] Error triggering assign buses:', error);
    console.error('❌ [Assign Buses] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat trigger assign buses'
    });
  }
});

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Mendapatkan rute berdasarkan ID
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID rute
 *     responses:
 *       200:
 *         description: Rute berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       404:
 *         description: Rute tidak ditemukan
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

    const routeSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id,
               route_name,
               route_code,
               description,
               status,
               bus_id,
               created_at,
               updated_at
        FROM routes
      )
      SELECT id,
             display_id AS "displayId",
             route_name AS "routeName",
             route_code AS "routeCode",
             description,
             status,
             bus_id AS "busId",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked WHERE id = $1
    `;
    const routeResult = await pool.query(routeSql, [id]);
    if (routeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Route dengan ID ${id} tidak ditemukan`
      });
    }

    const stopsSql = `
      SELECT id,
             stop_name AS "stopName",
             stop_code AS "stopCode",
             latitude::float AS latitude,
             longitude::float AS longitude,
             sequence
      FROM stops
      WHERE route_id = $1
      ORDER BY sequence ASC
    `;
    const stopsResult = await pool.query(stopsSql, [id]);

    const route = routeResult.rows[0];
    route.stops = stopsResult.rows;

    // Enrich route with bus information if bus_id exists
    if (route.busId) {
      const bus = await busService.getBusById(route.busId);
      if (bus) {
        route.bus = bus;
      }
    }

    res.json({ success: true, data: route });
  } catch (error) {
    console.error('Kesalahan saat mengambil rute:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data rute'
    });
  }
});

/**
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Membuat rute baru
 *     tags: [Routes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeName
 *               - routeCode
 *               - stops
 *             properties:
 *               routeName:
 *                 type: string
 *                 example: Rute A - Terminal Kota ke Terminal Bandara
 *               routeCode:
 *                 type: string
 *                 example: RT-001
 *               description:
 *                 type: string
 *                 example: Rute utama menghubungkan terminal kota dengan bandara
 *               stops:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Stop'
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *                 default: active
 *     responses:
 *       201:
 *         description: Rute berhasil dibuat
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
 *                   example: Rute berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       400:
 *         description: Permintaan tidak valid - Data tidak valid
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
  const client = await pool.connect();
  try {
    const { routeName, routeCode, description, stops, status = 'active', busId } = req.body;

    if (!routeName || !routeCode || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
    }

    // Validate busId jika diberikan (cek apakah bus exists di BusService)
    if (busId) {
      const bus = await busService.getBusById(busId);
      if (!bus) {
        return res.status(400).json({
          success: false,
          error: 'Bus tidak ditemukan',
          message: `Bus dengan ID ${busId} tidak ditemukan di BusService`
        });
      }
    }

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (!stop.stopName || !stop.stopCode || stop.latitude === undefined || stop.longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Kesalahan validasi',
          message: `Halte pada index ${i} harus memiliki stopName, stopCode, latitude, dan longitude`
        });
      }
    }

    await client.query('BEGIN');

    // Check if numeric_id column exists
    const hasNumericIdCol = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'routes' AND column_name = 'numeric_id'`
    );

    let routeResult;
    if (hasNumericIdCol.rowCount > 0) {
      // Compute next numeric_id (continue after the highest existing number)
      const nextNumeric = await client.query('SELECT COALESCE(MAX(numeric_id), 0) + 1 AS next FROM routes');
      const nextVal = nextNumeric.rows[0].next;
      const insertWithNumeric = `
        INSERT INTO routes (numeric_id, route_name, route_code, description, status, bus_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt";
      `;
      routeResult = await client.query(insertWithNumeric, [nextVal, routeName, routeCode, description || '', status, busId || null]);
    } else {
      const insertRouteSql = `
        INSERT INTO routes (route_name, route_code, description, status, bus_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt";
      `;
      routeResult = await client.query(insertRouteSql, [routeName, routeCode, description || '', status, busId || null]);
    }
    const route = routeResult.rows[0];

    // Compute displayId for the inserted route
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id
        FROM routes
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await client.query(displayIdSql, [route.id]);
    if (displayRow.rows[0]) {
      route.displayId = displayRow.rows[0].displayId;
    }

    // Insert stops
    const normalizedStops = stops.map((s, idx) => ({
      stopName: s.stopName,
      stopCode: s.stopCode,
      latitude: s.latitude,
      longitude: s.longitude,
      sequence: s.sequence !== undefined ? s.sequence : idx + 1,
    }));
    const values = [];
    const placeholders = normalizedStops.map((s, i) => {
      const base = i * 6;
      values.push(route.id, s.stopName, s.stopCode, s.latitude, s.longitude, s.sequence);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(',');

    const insertStopsSql = `
      INSERT INTO stops (route_id, stop_name, stop_code, latitude, longitude, sequence)
      VALUES ${placeholders}
      RETURNING id, stop_name AS "stopName", stop_code AS "stopCode", latitude::float AS latitude, longitude::float AS longitude, sequence;
    `;
    const stopsResult = await client.query(insertStopsSql, values);

    await client.query('COMMIT');

    route.stops = stopsResult.rows;

    res.status(201).json({ success: true, message: 'Rute berhasil dibuat', data: route });
  } catch (error) {
    await (async () => { try { await client.query('ROLLBACK'); } catch (_) {} })();
    if (error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Kode rute duplikat',
        message: 'Rute dengan kode tersebut sudah ada'
      });
    }
    console.error('Kesalahan saat membuat rute:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat rute'
    });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Update seluruh data rute
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID rute
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeName
 *               - routeCode
 *               - stops
 *             properties:
 *               routeName:
 *                 type: string
 *               routeCode:
 *                 type: string
 *               description:
 *                 type: string
 *               stops:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Stop'
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Rute berhasil diupdate
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
 *                   example: Rute berhasil diperbarui
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       404:
 *         description: Rute tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { routeName, routeCode, description, stops, status, busId } = req.body;

    if (!routeName || !routeCode || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
    }

    // Validate busId jika diberikan (cek apakah bus exists di BusService)
    if (busId) {
      const bus = await busService.getBusById(busId);
      if (!bus) {
        return res.status(400).json({
          success: false,
          error: 'Bus tidak ditemukan',
          message: `Bus dengan ID ${busId} tidak ditemukan di BusService`
        });
      }
    }

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (!stop.stopName || !stop.stopCode || stop.latitude === undefined || stop.longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Kesalahan validasi',
          message: `Halte pada index ${i} harus memiliki stopName, stopCode, latitude, dan longitude`
        });
      }
    }

    await client.query('BEGIN');

    // Ensure route exists
    const exists = await client.query('SELECT 1 FROM routes WHERE id = $1', [id]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    const updateRouteSql = `
      UPDATE routes
      SET route_name = $1,
          route_code = $2,
          description = $3,
          status = COALESCE($4, status),
          bus_id = COALESCE($5, bus_id),
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const routeResult = await client.query(updateRouteSql, [routeName, routeCode, description || '', status || null, busId || null, id]);
    const route = routeResult.rows[0];

    // Enrich route with bus information if bus_id exists
    if (route.busId) {
      const bus = await busService.getBusById(route.busId);
      if (bus) {
        route.bus = bus;
      }
    }

    // Compute displayId for the updated route
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id
        FROM routes
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await client.query(displayIdSql, [id]);
    if (displayRow.rows[0]) {
      route.displayId = displayRow.rows[0].displayId;
    }

    // Replace stops
    await client.query('DELETE FROM stops WHERE route_id = $1', [id]);
    const normalizedStops = stops.map((s, idx) => ({
      stopName: s.stopName,
      stopCode: s.stopCode,
      latitude: s.latitude,
      longitude: s.longitude,
      sequence: s.sequence !== undefined ? s.sequence : idx + 1,
    }));
    const values = [];
    const placeholders = normalizedStops.map((s, i) => {
      const base = i * 6;
      values.push(id, s.stopName, s.stopCode, s.latitude, s.longitude, s.sequence);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(',');
    if (placeholders.length > 0) {
      const insertStopsSql = `
        INSERT INTO stops (route_id, stop_name, stop_code, latitude, longitude, sequence)
        VALUES ${placeholders}
        RETURNING id, stop_name AS "stopName", stop_code AS "stopCode", latitude::float AS latitude, longitude::float AS longitude, sequence;
      `;
      const stopsResult = await client.query(insertStopsSql, values);
      route.stops = stopsResult.rows;
    } else {
      route.stops = [];
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Rute berhasil diperbarui', data: route });
  } catch (error) {
    await (async () => { try { await client.query('ROLLBACK'); } catch (_) {} })();
    if (error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Kode rute duplikat',
        message: 'Rute dengan kode tersebut sudah ada'
      });
    }
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/routes/{id}:
 *   patch:
 *     summary: Update sebagian data rute (partial update)
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID rute
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               routeName:
 *                 type: string
 *               routeCode:
 *                 type: string
 *               description:
 *                 type: string
 *               stops:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Stop'
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Rute berhasil diupdate
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
 *                   example: Rute berhasil diperbarui
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       404:
 *         description: Rute tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.patch('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const updateFields = req.body || {};

    await client.query('BEGIN');

    const exists = await client.query('SELECT 1 FROM routes WHERE id = $1', [id]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    // Validate busId jika diberikan (cek apakah bus exists di BusService)
    if (updateFields.busId !== undefined && updateFields.busId !== null) {
      const bus = await busService.getBusById(updateFields.busId);
      if (!bus) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Bus tidak ditemukan',
          message: `Bus dengan ID ${updateFields.busId} tidak ditemukan di BusService`
        });
      }
    }

    // Build dynamic update
    const cols = [];
    const vals = [];
    let idx = 1;
    if (updateFields.routeName !== undefined) { cols.push(`route_name = $${idx++}`); vals.push(updateFields.routeName); }
    if (updateFields.busId !== undefined) { cols.push(`bus_id = $${idx++}`); vals.push(updateFields.busId || null); }
    if (updateFields.routeCode !== undefined) { cols.push(`route_code = $${idx++}`); vals.push(updateFields.routeCode); }
    if (updateFields.description !== undefined) { cols.push(`description = $${idx++}`); vals.push(updateFields.description); }
    if (updateFields.status !== undefined) { cols.push(`status = $${idx++}`); vals.push(updateFields.status); }
    if (cols.length > 0) {
      const sql = `UPDATE routes SET ${cols.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt"`;
      vals.push(id);
      var routeResult = await client.query(sql, vals);
    } else {
      var routeResult = await client.query('SELECT id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt" FROM routes WHERE id = $1', [id]);
    }

    let route = routeResult.rows[0];

    // Enrich route with bus information if bus_id exists
    if (route.busId) {
      const bus = await busService.getBusById(route.busId);
      if (bus) {
        route.bus = bus;
      }
    }

    // Compute displayId for the route
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id
        FROM routes
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await client.query(displayIdSql, [id]);
    if (displayRow.rows[0]) {
      route.displayId = displayRow.rows[0].displayId;
    }

    if (Array.isArray(updateFields.stops)) {
      if (updateFields.stops.length === 0) {
        await client.query('DELETE FROM stops WHERE route_id = $1', [id]);
        route.stops = [];
      } else {
        // Validate stops
        for (let i = 0; i < updateFields.stops.length; i++) {
          const s = updateFields.stops[i];
          if (!s.stopName || !s.stopCode || s.latitude === undefined || s.longitude === undefined) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'Kesalahan validasi',
              message: `Halte pada index ${i} harus memiliki stopName, stopCode, latitude, dan longitude`
            });
          }
        }

        await client.query('DELETE FROM stops WHERE route_id = $1', [id]);
        const normalizedStops = updateFields.stops.map((s, idx2) => ({
          stopName: s.stopName,
          stopCode: s.stopCode,
          latitude: s.latitude,
          longitude: s.longitude,
          sequence: s.sequence !== undefined ? s.sequence : idx2 + 1,
        }));
        const values = [];
        const placeholders = normalizedStops.map((s, i) => {
          const base = i * 6;
          values.push(id, s.stopName, s.stopCode, s.latitude, s.longitude, s.sequence);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
        }).join(',');
        const insertStopsSql = `
          INSERT INTO stops (route_id, stop_name, stop_code, latitude, longitude, sequence)
          VALUES ${placeholders}
          RETURNING id, stop_name AS "stopName", stop_code AS "stopCode", latitude::float AS latitude, longitude::float AS longitude, sequence;
        `;
        const stopsResult = await client.query(insertStopsSql, values);
        route.stops = stopsResult.rows;
      }
    } else {
      const stops = await client.query('SELECT id, stop_name AS "stopName", stop_code AS "stopCode", latitude::float AS latitude, longitude::float AS longitude, sequence FROM stops WHERE route_id = $1 ORDER BY sequence ASC', [id]);
      route.stops = stops.rows;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Rute berhasil diperbarui', data: route });
  } catch (error) {
    await (async () => { try { await client.query('ROLLBACK'); } catch (_) {} })();
    if (error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Kode rute duplikat',
        message: 'Rute dengan kode tersebut sudah ada'
      });
    }
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/routes/{id}/assign-bus:
 *   post:
 *     summary: Assign bus ke route
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID rute
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *             properties:
 *               busId:
 *                 type: string
 *                 description: UUID bus dari BusService
 *                 example: "2dc317f0-416b-48be-943e-18c14d2e59xx"
 *     responses:
 *       200:
 *         description: Bus berhasil di-assign ke route
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
 *                   example: Bus berhasil di-assign ke route
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *       400:
 *         description: Bus tidak ditemukan atau data tidak valid
 *       404:
 *         description: Route tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/:id/assign-bus', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { busId } = req.body;

    if (!busId) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'busId wajib diisi'
      });
    }

    await client.query('BEGIN');

    // Check if route exists
    const routeCheck = await client.query('SELECT id, route_name, route_code FROM routes WHERE id = $1', [id]);
    if (routeCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Route tidak ditemukan',
        message: `Route dengan ID ${id} tidak ditemukan`
      });
    }

    // Validate bus exists in BusService
    const bus = await busService.getBusById(busId);
    if (!bus) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Bus tidak ditemukan',
        message: `Bus dengan ID ${busId} tidak ditemukan di BusService`
      });
    }

    // Update bus_id
    const updateSql = `
      UPDATE routes 
      SET bus_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, bus_id AS "busId", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const routeResult = await client.query(updateSql, [busId, id]);
    const route = routeResult.rows[0];

    // Enrich with bus information
    route.bus = bus;

    // Compute displayId
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS display_id,
               id
        FROM routes
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await client.query(displayIdSql, [id]);
    if (displayRow.rows[0]) {
      route.displayId = displayRow.rows[0].displayId;
    }

    // Get stops
    const stopsResult = await client.query(
      'SELECT id, stop_name AS "stopName", stop_code AS "stopCode", latitude::float AS latitude, longitude::float AS longitude, sequence FROM stops WHERE route_id = $1 ORDER BY sequence ASC',
      [id]
    );
    route.stops = stopsResult.rows;

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Bus ${bus.plate} berhasil di-assign ke route ${route.routeCode}`,
      data: route
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning bus to route:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat assign bus ke route'
    });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Menghapus rute
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID rute
 *     responses:
 *       200:
 *         description: Rute berhasil dihapus
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
 *                   example: Rute berhasil dihapus
 *       404:
 *         description: Rute tidak ditemukan
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM routes WHERE id = $1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    // If numeric_id column exists, resequence to start from 1 contiguously
    try {
      const hasNumericIdCol = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'routes' AND column_name = 'numeric_id'`
      );
      if (hasNumericIdCol.rowCount > 0) {
        const resequenceSql = `
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS rn
            FROM routes
          )
          UPDATE routes r
          SET numeric_id = o.rn
          FROM ordered o
          WHERE r.id = o.id
        `;
        await pool.query(resequenceSql);
      }
    } catch (_) {
      // ignore resequence errors; deletion already done
    }

    res.json({ success: true, message: 'Rute berhasil dihapus' });
  } catch (error) {
    console.error('Kesalahan saat menghapus rute:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat menghapus rute'
    });
  }
});

module.exports = router;

