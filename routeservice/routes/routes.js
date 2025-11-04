const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

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
    const { status, limit = 100, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    const listSql = `
      WITH filtered AS (
        SELECT id,
               route_name,
               route_code,
               description,
               status,
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
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked
      ORDER BY display_id ASC
      LIMIT $${params.push(limitNum)} OFFSET $${params.push(offsetNum)}
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM routes ${where}`;

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, params),
      pool.query(countSql, params.slice(0, status ? 1 : 0)),
    ]);

    res.json({
      success: true,
      data: listResult.rows,
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
    const { routeName, routeCode, description, stops, status = 'active' } = req.body;

    if (!routeName || !routeCode || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
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
        INSERT INTO routes (numeric_id, route_name, route_code, description, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, created_at AS "createdAt", updated_at AS "updatedAt";
      `;
      routeResult = await client.query(insertWithNumeric, [nextVal, routeName, routeCode, description || '', status]);
    } else {
      const insertRouteSql = `
        INSERT INTO routes (route_name, route_code, description, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, created_at AS "createdAt", updated_at AS "updatedAt";
      `;
      routeResult = await client.query(insertRouteSql, [routeName, routeCode, description || '', status]);
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
    const { routeName, routeCode, description, stops, status } = req.body;

    if (!routeName || !routeCode || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
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
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const routeResult = await client.query(updateRouteSql, [routeName, routeCode, description || '', status || null, id]);
    const route = routeResult.rows[0];

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

    // Build dynamic update
    const cols = [];
    const vals = [];
    let idx = 1;
    if (updateFields.routeName !== undefined) { cols.push(`route_name = $${idx++}`); vals.push(updateFields.routeName); }
    if (updateFields.routeCode !== undefined) { cols.push(`route_code = $${idx++}`); vals.push(updateFields.routeCode); }
    if (updateFields.description !== undefined) { cols.push(`description = $${idx++}`); vals.push(updateFields.description); }
    if (updateFields.status !== undefined) { cols.push(`status = $${idx++}`); vals.push(updateFields.status); }
    if (cols.length > 0) {
      const sql = `UPDATE routes SET ${cols.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, route_name AS "routeName", route_code AS "routeCode", description, status, created_at AS "createdAt", updated_at AS "updatedAt"`;
      vals.push(id);
      var routeResult = await client.query(sql, vals);
    } else {
      var routeResult = await client.query('SELECT id, route_name AS "routeName", route_code AS "routeCode", description, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM routes WHERE id = $1', [id]);
    }

    let route = routeResult.rows[0];

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

