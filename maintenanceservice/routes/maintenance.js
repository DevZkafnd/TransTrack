const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @swagger
 * /api/maintenance:
 *   post:
 *     summary: Membuat jadwal perbaikan baru
 *     tags: [Maintenance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - maintenanceType
 *               - description
 *               - scheduledDate
 *             properties:
 *               busId:
 *                 type: string
 *                 example: BUS-001
 *               maintenanceType:
 *                 type: string
 *                 example: Routine Service
 *               description:
 *                 type: string
 *                 example: Ganti oli mesin dan filter udara
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-11-10T10:00:00Z
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *                 default: scheduled
 *               cost:
 *                 type: number
 *                 example: 500000.00
 *               mechanicName:
 *                 type: string
 *                 example: Budi Santoso
 *               notes:
 *                 type: string
 *                 example: Perlu pengecekan rem setelah service
 *     responses:
 *       201:
 *         description: Jadwal perbaikan berhasil dibuat
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
 *                   example: Jadwal perbaikan berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Maintenance'
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
    const { 
      busId, 
      maintenanceType, 
      description, 
      scheduledDate, 
      status = 'scheduled',
      cost,
      mechanicName,
      notes
    } = req.body;

    if (!busId || !maintenanceType || !description || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'busId, maintenanceType, description, dan scheduledDate wajib diisi'
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: `Status harus salah satu dari: ${validStatuses.join(', ')}`
      });
    }

    // Validate scheduledDate
    const scheduledDateObj = new Date(scheduledDate);
    if (isNaN(scheduledDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'scheduledDate harus dalam format tanggal yang valid'
      });
    }

    const insertMaintenanceSql = `
      INSERT INTO maintenance (
        bus_id, 
        maintenance_type, 
        description, 
        scheduled_date, 
        status,
        cost,
        mechanic_name,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        bus_id AS "busId",
        maintenance_type AS "maintenanceType",
        description,
        scheduled_date AS "scheduledDate",
        completed_date AS "completedDate",
        status,
        cost,
        mechanic_name AS "mechanicName",
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;
    
    const maintenanceResult = await pool.query(insertMaintenanceSql, [
      busId,
      maintenanceType,
      description,
      scheduledDate,
      status,
      cost || null,
      mechanicName || null,
      notes || null
    ]);
    
    const maintenance = maintenanceResult.rows[0];

    res.status(201).json({ 
      success: true, 
      message: 'Jadwal perbaikan berhasil dibuat', 
      data: maintenance 
    });
  } catch (error) {
    console.error('Kesalahan saat membuat jadwal perbaikan:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat jadwal perbaikan'
    });
  }
});

/**
 * @swagger
 * /api/maintenance/bus/{bus_id}:
 *   get:
 *     summary: Mendapatkan riwayat perbaikan berdasarkan ID bus
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: bus_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bus
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: Filter berdasarkan status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal data yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Riwayat perbaikan berhasil diambil
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
 *                     $ref: '#/components/schemas/Maintenance'
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
router.get('/bus/:bus_id', async (req, res) => {
  try {
    const { bus_id } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const params = [bus_id];
    let whereClause = 'WHERE bus_id = $1';
    
    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const listSql = `
      SELECT 
        id,
        bus_id AS "busId",
        maintenance_type AS "maintenanceType",
        description,
        scheduled_date AS "scheduledDate",
        completed_date AS "completedDate",
        status,
        cost,
        mechanic_name AS "mechanicName",
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM maintenance
      ${whereClause}
      ORDER BY scheduled_date DESC, created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limitNum, offsetNum);

    const countSql = `
      SELECT COUNT(*)::int AS cnt 
      FROM maintenance 
      ${whereClause}
    `;

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, params),
      pool.query(countSql, params.slice(0, status ? 2 : 1)),
    ]);

    res.json({
      success: true,
      data: listResult.rows,
      total: countResult.rows[0].cnt,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil riwayat perbaikan:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil riwayat perbaikan'
    });
  }
});

/**
 * @swagger
 * /api/maintenance/{id}/complete:
 *   put:
 *     summary: Menandai perbaikan sebagai selesai atau mengupdate data perbaikan yang sudah selesai
 *     description: |
 *       - Jika status belum completed: akan mengubah status menjadi 'completed' dan mengisi completed_date dengan waktu sekarang
 *       - Jika status sudah completed: hanya akan mengupdate cost, mechanicName, dan notes tanpa mengubah completed_date
 *     tags: [Maintenance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID maintenance
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cost:
 *                 type: number
 *                 example: 500000.00
 *               mechanicName:
 *                 type: string
 *                 example: Budi Santoso
 *               notes:
 *                 type: string
 *                 example: Semua komponen sudah diganti
 *     responses:
 *       200:
 *         description: Perbaikan berhasil ditandai selesai
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
 *                   example: Perbaikan berhasil ditandai selesai
 *                 data:
 *                   $ref: '#/components/schemas/Maintenance'
 *       404:
 *         description: Maintenance tidak ditemukan
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
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { cost, mechanicName, notes } = req.body;

    // Check if maintenance exists
    const checkSql = `
      SELECT id, status FROM maintenance WHERE id = $1
    `;
    const checkResult = await pool.query(checkSql, [id]);
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance tidak ditemukan',
        message: `Maintenance dengan ID ${id} tidak ditemukan`
      });
    }

    const currentStatus = checkResult.rows[0].status;
    
    let updateSql;
    let message;
    
    if (currentStatus === 'completed') {
      // Jika sudah completed, hanya update cost, mechanicName, dan notes
      // tanpa mengubah completed_date
      updateSql = `
        UPDATE maintenance
        SET 
          cost = COALESCE($1, cost),
          mechanic_name = COALESCE($2, mechanic_name),
          notes = COALESCE($3, notes),
          updated_at = NOW()
        WHERE id = $4
        RETURNING 
          id,
          bus_id AS "busId",
          maintenance_type AS "maintenanceType",
          description,
          scheduled_date AS "scheduledDate",
          completed_date AS "completedDate",
          status,
          cost,
          mechanic_name AS "mechanicName",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt";
      `;
      message = 'Data perbaikan berhasil diperbarui';
    } else {
      // Jika belum completed, ubah status menjadi completed
      updateSql = `
        UPDATE maintenance
        SET 
          status = 'completed',
          completed_date = NOW(),
          cost = COALESCE($1, cost),
          mechanic_name = COALESCE($2, mechanic_name),
          notes = COALESCE($3, notes),
          updated_at = NOW()
        WHERE id = $4
        RETURNING 
          id,
          bus_id AS "busId",
          maintenance_type AS "maintenanceType",
          description,
          scheduled_date AS "scheduledDate",
          completed_date AS "completedDate",
          status,
          cost,
          mechanic_name AS "mechanicName",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt";
      `;
      message = 'Perbaikan berhasil ditandai selesai';
    }

    const updateResult = await pool.query(updateSql, [
      cost || null,
      mechanicName || null,
      notes || null,
      id
    ]);

    const maintenance = updateResult.rows[0];

    res.json({
      success: true,
      message: message,
      data: maintenance
    });
  } catch (error) {
    console.error('Kesalahan saat menandai perbaikan selesai:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat menandai perbaikan selesai'
    });
  }
});

module.exports = router;

