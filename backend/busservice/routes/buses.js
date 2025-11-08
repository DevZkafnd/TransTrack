const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @swagger
 * /api/buses:
 *   get:
 *     summary: Mendapatkan semua bus
 *     tags: [Buses]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal bus yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Daftar bus berhasil diambil
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
 *                     $ref: '#/components/schemas/Bus'
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
    const { limit = 100, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const listSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, plate ASC, id ASC) AS display_id,
               id,
               plate,
               capacity,
               model,
               created_at,
               updated_at
        FROM buses
      )
      SELECT id,
             display_id AS "displayId",
             plate,
             capacity,
             model,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked
      ORDER BY display_id ASC
      LIMIT $1 OFFSET $2
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM buses`;

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, [limitNum, offsetNum]),
      pool.query(countSql),
    ]);

    res.json({
      success: true,
      data: listResult.rows,
      total: countResult.rows[0].cnt,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Kesalahan saat mengambil data bus:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data bus'
    });
  }
});

/**
 * @swagger
 * /api/buses/{id}:
 *   get:
 *     summary: Mendapatkan bus berdasarkan ID
 *     tags: [Buses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bus
 *     responses:
 *       200:
 *         description: Bus berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus tidak ditemukan
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

    // Check if id is UUID format (contains hyphens and is 36 chars) or plate format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let busSql;
    if (isUUID) {
      // Query by UUID
      busSql = `
        WITH ranked AS (
          SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, plate ASC, id ASC) AS display_id,
                 id,
                 plate,
                 capacity,
                 model,
                 created_at,
                 updated_at
          FROM buses
        )
        SELECT id,
               display_id AS "displayId",
               plate,
               capacity,
               model,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM ranked WHERE id = $1
      `;
    } else {
      // Query by plate (fallback for non-UUID IDs like "BUS-001")
      busSql = `
        WITH ranked AS (
          SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, plate ASC, id ASC) AS display_id,
                 id,
                 plate,
                 capacity,
                 model,
                 created_at,
                 updated_at
          FROM buses
        )
        SELECT id,
               display_id AS "displayId",
               plate,
               capacity,
               model,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM ranked WHERE plate = $1
      `;
    }
    
    const busResult = await pool.query(busSql, [id]);
    if (busResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bus tidak ditemukan',
        message: `Bus dengan ID ${id} tidak ditemukan`
      });
    }

    const bus = busResult.rows[0];

    res.json({ success: true, data: bus });
  } catch (error) {
    console.error('Kesalahan saat mengambil bus:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data bus'
    });
  }
});

/**
 * @swagger
 * /api/buses:
 *   post:
 *     summary: Membuat bus baru
 *     tags: [Buses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plate
 *               - capacity
 *               - model
 *             properties:
 *               plate:
 *                 type: string
 *                 example: B 1234 CD
 *               capacity:
 *                 type: integer
 *                 example: 40
 *               model:
 *                 type: string
 *                 example: Mercedes-Benz Tourismo
 *     responses:
 *       201:
 *         description: Bus berhasil dibuat
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
 *                   example: Bus berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Bus'
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
  try {
    const { plate, capacity, model } = req.body;

    if (!plate || !capacity || !model) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'plate, capacity, dan model wajib diisi'
      });
    }

    const capacityNum = Number(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'capacity harus berupa angka positif'
      });
    }

    const insertBusSql = `
      INSERT INTO buses (plate, capacity, model)
      VALUES ($1, $2, $3)
      RETURNING id, plate, capacity, model, created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const busResult = await pool.query(insertBusSql, [plate, capacityNum, model]);
    const bus = busResult.rows[0];

    // Compute displayId for the inserted bus
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, plate ASC, id ASC) AS display_id,
               id
        FROM buses
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await pool.query(displayIdSql, [bus.id]);
    if (displayRow.rows[0]) {
      bus.displayId = displayRow.rows[0].displayId;
    }

    res.status(201).json({ success: true, message: 'Bus berhasil dibuat', data: bus });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Plat duplikat',
        message: 'Bus dengan plat tersebut sudah ada'
      });
    }
    console.error('Kesalahan saat membuat bus:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat bus'
    });
  }
});

module.exports = router;

