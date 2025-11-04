const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Mendapatkan semua pengemudi
 *     tags: [Drivers]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal pengemudi yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Daftar pengemudi berhasil diambil
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
 *                     $ref: '#/components/schemas/Driver'
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
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC, id ASC) AS display_id,
               id,
               name,
               license,
               created_at,
               updated_at
        FROM drivers
      )
      SELECT id,
             display_id AS "displayId",
             name,
             license,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked
      ORDER BY display_id ASC
      LIMIT $1 OFFSET $2
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM drivers`;

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
    console.error('Kesalahan saat mengambil data pengemudi:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data pengemudi'
    });
  }
});

/**
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Mendapatkan pengemudi berdasarkan ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID pengemudi
 *     responses:
 *       200:
 *         description: Pengemudi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Pengemudi tidak ditemukan
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

    const driverSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC, id ASC) AS display_id,
               id,
               name,
               license,
               created_at,
               updated_at
        FROM drivers
      )
      SELECT id,
             display_id AS "displayId",
             name,
             license,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked WHERE id = $1
    `;
    const driverResult = await pool.query(driverSql, [id]);
    if (driverResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pengemudi tidak ditemukan',
        message: `Pengemudi dengan ID ${id} tidak ditemukan`
      });
    }

    const driver = driverResult.rows[0];

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Kesalahan saat mengambil pengemudi:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data pengemudi'
    });
  }
});

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Membuat pengemudi baru
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - license
 *             properties:
 *               name:
 *                 type: string
 *                 example: Budi Santoso
 *               license:
 *                 type: string
 *                 example: SIM-A-1234567890
 *     responses:
 *       201:
 *         description: Pengemudi berhasil dibuat
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
 *                   example: Pengemudi berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Driver'
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
    const { name, license } = req.body;

    if (!name || !license) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'name dan license wajib diisi'
      });
    }

    const insertDriverSql = `
      INSERT INTO drivers (name, license)
      VALUES ($1, $2)
      RETURNING id, name, license, created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const driverResult = await pool.query(insertDriverSql, [name, license]);
    const driver = driverResult.rows[0];

    // Compute displayId for the inserted driver
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC, id ASC) AS display_id,
               id
        FROM drivers
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await pool.query(displayIdSql, [driver.id]);
    if (displayRow.rows[0]) {
      driver.displayId = displayRow.rows[0].displayId;
    }

    res.status(201).json({ success: true, message: 'Pengemudi berhasil dibuat', data: driver });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Lisensi duplikat',
        message: 'Pengemudi dengan lisensi tersebut sudah ada'
      });
    }
    console.error('Kesalahan saat membuat pengemudi:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat pengemudi'
    });
  }
});

module.exports = router;

