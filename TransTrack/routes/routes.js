const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const COLLECTION_NAME = 'routes';

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
    let query = db.collection(COLLECTION_NAME);

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Jika ada filter status, tidak bisa langsung orderBy karena memerlukan composite index
    // Solusi: Ambil semua data, filter dan sort di aplikasi, lalu paginate
    if (status) {
      // Query dengan filter status saja (tanpa orderBy untuk menghindari composite index)
      query = query.where('status', '==', status);
      const snapshot = await query.get();
      
      // Konversi ke array dan sort di aplikasi
      let routes = [];
      snapshot.forEach(doc => {
        routes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Urutkan berdasarkan createdAt descending
      routes.sort((a, b) => {
        let aTime = 0;
        let bTime = 0;
        
        // Handle Firestore Timestamp
        if (a.createdAt) {
          aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt.seconds * 1000) || 0;
        }
        if (b.createdAt) {
          bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt.seconds * 1000) || 0;
        }
        
        // Handle Date object
        if (!aTime && a.createdAt instanceof Date) {
          aTime = a.createdAt.getTime();
        }
        if (!bTime && b.createdAt instanceof Date) {
          bTime = b.createdAt.getTime();
        }
        
        return bTime - aTime;
      });

      // Pagination di aplikasi
      const total = routes.length;
      const paginatedRoutes = routes.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: paginatedRoutes,
        total,
        limit: limitNum,
        offset: offsetNum
      });
    } else {
      // Jika tidak ada filter, bisa langsung orderBy
      query = query.orderBy('createdAt', 'desc');

      // Pagination dengan cursor-based (lebih efisien)
      if (offsetNum > 0) {
        // Untuk offset > 0, perlu ambil semua sampai offset kemudian startAfter
        const offsetSnapshot = await db.collection(COLLECTION_NAME)
          .orderBy('createdAt', 'desc')
          .limit(offsetNum)
          .get();
        
        if (offsetSnapshot.docs.length > 0) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.limit(limitNum).get();
      
      const routes = [];
      snapshot.forEach(doc => {
        routes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Ambil total count
      const totalSnapshot = await db.collection(COLLECTION_NAME).get();
      const total = totalSnapshot.size;

      res.json({
        success: true,
        data: routes,
        total,
        limit: limitNum,
        offset: offsetNum
      });
    }
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
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Route dengan ID ${id} tidak ditemukan`
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
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
  try {
    const { routeName, routeCode, description, stops, status = 'active' } = req.body;

    // Validasi field yang wajib diisi
    if (!routeName || !routeCode || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
    }

    // Validasi halte
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

    // Periksa jika kode rute sudah ada
    const existingRoute = await db.collection(COLLECTION_NAME)
      .where('routeCode', '==', routeCode)
      .get();

    if (!existingRoute.empty) {
      return res.status(400).json({
        success: false,
        error: 'Kode rute duplikat',
        message: `Rute dengan kode ${routeCode} sudah ada`
      });
    }

    const now = new Date();
    const routeData = {
      routeName,
      routeCode,
      description: description || '',
      stops: stops.map((stop, index) => ({
        ...stop,
        sequence: stop.sequence !== undefined ? stop.sequence : index + 1
      })),
      status,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now)
    };

    const docRef = await db.collection(COLLECTION_NAME).add(routeData);
    const createdDoc = await docRef.get();

    res.status(201).json({
      success: true,
      message: 'Rute berhasil dibuat',
      data: {
        id: createdDoc.id,
        ...createdDoc.data()
      }
    });
  } catch (error) {
    console.error('Kesalahan saat membuat rute:', error);
    res.status(500).json({
      success: false,
      error: 'Kesalahan server internal',
      message: error.message || 'Terjadi kesalahan saat membuat rute'
    });
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
  try {
    const { id } = req.params;
    const { routeName, routeCode, description, stops, status } = req.body;

    // Periksa apakah rute ada
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    // Validasi field yang wajib diisi
    if (!routeName || !routeCode || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Kesalahan validasi',
        message: 'routeName, routeCode, dan stops (array tidak boleh kosong) wajib diisi'
      });
    }

    // Validasi halte
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

    // Periksa jika kode rute sudah ada di rute lain
    if (routeCode !== doc.data().routeCode) {
      const existingRoute = await db.collection(COLLECTION_NAME)
        .where('routeCode', '==', routeCode)
        .get();

      if (!existingRoute.empty) {
        return res.status(400).json({
          success: false,
          error: 'Kode rute duplikat',
          message: `Rute dengan kode ${routeCode} sudah ada`
        });
      }
    }

    const updateData = {
      routeName,
      routeCode,
      description: description || '',
      stops: stops.map((stop, index) => ({
        ...stop,
        sequence: stop.sequence !== undefined ? stop.sequence : index + 1
      })),
      status: status || doc.data().status,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    };

    // Pertahankan createdAt
    updateData.createdAt = doc.data().createdAt;

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Rute berhasil diperbarui',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
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
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Periksa apakah rute ada
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    // Validasi halte jika diupdate
    if (updateFields.stops) {
      if (!Array.isArray(updateFields.stops) || updateFields.stops.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Kesalahan validasi',
          message: 'stops harus berupa array tidak boleh kosong'
        });
      }

      for (let i = 0; i < updateFields.stops.length; i++) {
        const stop = updateFields.stops[i];
        if (!stop.stopName || !stop.stopCode || stop.latitude === undefined || stop.longitude === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Kesalahan validasi',
            message: `Halte pada index ${i} harus memiliki stopName, stopCode, latitude, dan longitude`
          });
        }
      }

      // Tambahkan sequence jika tidak ada
      updateFields.stops = updateFields.stops.map((stop, index) => ({
        ...stop,
        sequence: stop.sequence !== undefined ? stop.sequence : index + 1
      }));
    }

    // Periksa kode rute duplikat jika diupdate
    if (updateFields.routeCode && updateFields.routeCode !== doc.data().routeCode) {
      const existingRoute = await db.collection(COLLECTION_NAME)
        .where('routeCode', '==', updateFields.routeCode)
        .get();

      if (!existingRoute.empty) {
        return res.status(400).json({
          success: false,
          error: 'Kode rute duplikat',
          message: `Rute dengan kode ${updateFields.routeCode} sudah ada`
        });
      }
    }

    // Siapkan data untuk update
    const updateData = {
      ...updateFields,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    };

    // Jangan update createdAt
    delete updateData.createdAt;

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();

    res.json({
      success: true,
      message: 'Rute berhasil diperbarui',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
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
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Rute tidak ditemukan',
        message: `Rute dengan ID ${id} tidak ditemukan`
      });
    }

    await docRef.delete();

    res.json({
      success: true,
      message: 'Rute berhasil dihapus'
    });
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

