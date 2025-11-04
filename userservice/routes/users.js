const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Mendapatkan semua pengguna
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Jumlah maksimal pengguna yang dikembalikan
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset untuk pagination
 *     responses:
 *       200:
 *         description: Daftar pengguna berhasil diambil
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
 *                     $ref: '#/components/schemas/User'
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
               email,
               phone,
               created_at,
               updated_at
        FROM users
      )
      SELECT id,
             display_id AS "displayId",
             name,
             email,
             phone,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked
      ORDER BY display_id ASC
      LIMIT $1 OFFSET $2
    `;

    const countSql = `SELECT COUNT(*)::int AS cnt FROM users`;

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
    console.error('Kesalahan saat mengambil data pengguna:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data pengguna'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Mendapatkan pengguna berdasarkan ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID pengguna
 *     responses:
 *       200:
 *         description: Pengguna berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Pengguna tidak ditemukan
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

    const userSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC, id ASC) AS display_id,
               id,
               name,
               email,
               phone,
               created_at,
               updated_at
        FROM users
      )
      SELECT id,
             display_id AS "displayId",
             name,
             email,
             phone,
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM ranked WHERE id = $1
    `;
    const userResult = await pool.query(userSql, [id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pengguna tidak ditemukan',
        message: `Pengguna dengan ID ${id} tidak ditemukan`
      });
    }

    const user = userResult.rows[0];

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Kesalahan saat mengambil pengguna:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mengambil data pengguna'
    });
  }
});

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Mendaftarkan pengguna baru
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phone:
 *                 type: string
 *                 example: +6281234567890
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePassword123!
 *     responses:
 *       201:
 *         description: Pengguna berhasil didaftarkan
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
 *                   example: Pengguna berhasil didaftarkan
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Permintaan tidak valid - Data tidak valid atau email/phone sudah terdaftar
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
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'name, email, phone, dan password wajib diisi'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'Format email tidak valid'
      });
    }

    // Check if email or phone already exists
    const checkSql = `
      SELECT id FROM users WHERE email = $1 OR phone = $2
    `;
    const checkResult = await pool.query(checkSql, [email, phone]);
    if (checkResult.rowCount > 0) {
      const existingUser = checkResult.rows[0];
      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      const existingPhone = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      
      if (existingEmail.rowCount > 0 && existingPhone.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Data duplikat',
          message: 'Email dan nomor telepon sudah terdaftar'
        });
      } else if (existingEmail.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email duplikat',
          message: 'Email sudah terdaftar'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Nomor telepon duplikat',
          message: 'Nomor telepon sudah terdaftar'
        });
      }
    }

    const insertUserSql = `
      INSERT INTO users (name, email, phone, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, phone, created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const userResult = await pool.query(insertUserSql, [name, email, phone, password]);
    const user = userResult.rows[0];

    // Compute displayId for the inserted user
    const displayIdSql = `
      WITH ranked AS (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, name ASC, id ASC) AS display_id,
               id
        FROM users
      )
      SELECT display_id AS "displayId" FROM ranked WHERE id = $1
    `;
    const displayRow = await pool.query(displayIdSql, [user.id]);
    if (displayRow.rows[0]) {
      user.displayId = displayRow.rows[0].displayId;
    }

    res.status(201).json({ 
      success: true, 
      message: 'Pengguna berhasil didaftarkan', 
      data: user 
    });
  } catch (error) {
    if (error && error.code === '23505') {
      // Unique constraint violation
      if (error.constraint === 'users_email_unique') {
        return res.status(400).json({
          success: false,
          error: 'Email duplikat',
          message: 'Email sudah terdaftar'
        });
      } else if (error.constraint === 'users_phone_unique') {
        return res.status(400).json({
          success: false,
          error: 'Nomor telepon duplikat',
          message: 'Nomor telepon sudah terdaftar'
        });
      }
    }
    console.error('Kesalahan saat mendaftarkan pengguna:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat mendaftarkan pengguna'
    });
  }
});

module.exports = router;

