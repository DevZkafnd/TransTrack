const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../config/db');
require('dotenv').config();

// UserService URL from environment
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Helper function to validate user with UserService
const validateUser = async (userId) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`, {
      timeout: 5000,
    });
    return response.data?.success === true ? response.data.data : null;
  } catch (error) {
    console.error('Error validating user:', error.message);
    if (error.response?.status === 404) {
      return null; // User not found
    }
    throw error; // Re-throw other errors (network, timeout, etc.)
  }
};

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: "Membuat tiket baru (status pending)"
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - scheduleId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               scheduleId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 example: IDR
 *     responses:
 *       201:
 *         description: Tiket dibuat
 */
router.post('/', async (req, res) => {
  try {
    const { userId, scheduleId, scheduleLabel, amount, currency = 'IDR' } = req.body;
    if (!userId || !scheduleId || !amount) {
      return res.status(400).json({ success: false, error: 'Kesalahan validasi', message: 'userId, scheduleId, amount wajib diisi' });
    }

    // Validasi user dengan memanggil UserService
    let user;
    try {
      user = await validateUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User Tidak Ditemukan', 
          message: `User dengan ID ${userId} tidak ditemukan di UserService` 
        });
      }
    } catch (userError) {
      console.error('Error saat validasi user:', userError.message);
      // Jika UserService tidak tersedia, return error
      return res.status(503).json({ 
        success: false, 
        error: 'Service Tidak Tersedia', 
        message: 'UserService sedang tidak tersedia. Tidak dapat memvalidasi user.' 
      });
    }

    // Jika user valid, buat tiket
    const sql = `
      INSERT INTO tickets (user_id, schedule_id, schedule_label, amount, currency, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    const result = await pool.query(sql, [userId, String(scheduleId), scheduleLabel || null, amount, currency]);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Gagal membuat tiket:', e);
    res.status(500).json({ success: false, error: 'Kesalahan server internal', message: e.message || 'Gagal membuat tiket' });
  }
});

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: "Daftar tiket milik pengguna"
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daftar tiket
 */
router.get('/', async (req, res) => {
  try {
    let { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'Kesalahan validasi', message: 'userId wajib diisi' });
    
    // Handle jika userId adalah array atau JSON string
    if (Array.isArray(userId)) {
      userId = userId[0]; // Ambil elemen pertama
    } else if (typeof userId === 'string') {
      // Cek jika string adalah JSON array
      try {
        const parsed = JSON.parse(userId);
        if (Array.isArray(parsed)) {
          userId = parsed[0]; // Ambil elemen pertama
        }
      } catch (e) {
        // Bukan JSON, gunakan string langsung
      }
    }
    
    // Pastikan userId adalah string UUID yang valid
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Kesalahan validasi', message: 'userId harus berupa string UUID yang valid' });
    }
    
    const result = await pool.query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [userId.trim()]);
    return res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error('Gagal mengambil daftar tiket:', e);
    res.status(500).json({ success: false, error: 'Kesalahan server internal', message: e.message || 'Gagal mengambil daftar tiket' });
  }
});

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: "Mendapatkan detail tiket"
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail tiket
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Tidak Ditemukan', message: 'Tiket tidak ditemukan' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Gagal mengambil tiket:', e);
    res.status(500).json({ success: false, error: 'Kesalahan server internal', message: e.message || 'Gagal mengambil tiket' });
  }
});

/**
 * @swagger
 * /api/tickets/{id}/status:
 *   patch:
 *     summary: "Update status tiket (contoh: success/failed)"
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               paymentRef:
 *                 type: string
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentRef } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Kesalahan validasi', message: 'status wajib diisi' });
    const sql = `
      UPDATE tickets SET status = $1, payment_ref = COALESCE($2, payment_ref), updated_at = NOW()
      WHERE id = $3 RETURNING *
    `;
    const result = await pool.query(sql, [status, paymentRef || null, id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Tidak Ditemukan', message: 'Tiket tidak ditemukan' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Gagal update status tiket:', e);
    res.status(500).json({ success: false, error: 'Kesalahan server internal', message: e.message || 'Gagal update status' });
  }
});

/**
 * @swagger
 * /api/tickets/validate:
 *   post:
 *     summary: "Validasi tiket dengan kode/id"
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hasil validasi
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Kesalahan validasi', message: 'code wajib diisi' });
    const result = await pool.query('SELECT id, status, user_id, schedule_id FROM tickets WHERE id = $1', [code]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Tidak Ditemukan', message: 'Tiket tidak ditemukan' });
    const ticket = result.rows[0];
    res.json({ success: true, data: ticket, valid: ticket.status === 'success' });
  } catch (e) {
    console.error('Validasi tiket gagal:', e);
    res.status(500).json({ success: false, error: 'Kesalahan server internal', message: e.message || 'Validasi gagal' });
  }
});

module.exports = router;


