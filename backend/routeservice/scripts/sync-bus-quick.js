#!/usr/bin/env node
/**
 * Quick sync bus_id dari ScheduleService (untuk dev.js)
 * Versi ringan yang tidak exit process
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');
const { Pool } = require('pg');

function sanitizeEnvValue(value) {
  if (value == null) return '';
  const asString = String(value).trim();
  return asString.replace(/^(["'])(.*)\1$/, '$2');
}

// Database config
const directUrl = sanitizeEnvValue(process.env.DATABASE_URL);
const user = sanitizeEnvValue(process.env.DB_USER);
const pass = sanitizeEnvValue(process.env.DB_PASSWORD);
const host = sanitizeEnvValue(process.env.DB_HOST) || 'localhost';
const port = sanitizeEnvValue(process.env.DB_PORT) || '5432';
const db = sanitizeEnvValue(process.env.DB_NAME);
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

let databaseUrl = directUrl;
if (!databaseUrl) {
  if (user && host && db) {
    const authPart = pass === '' ? encodeURIComponent(user) : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
    databaseUrl = `postgres://${authPart}@${host}:${port}/${db}`;
  }
}

if (!databaseUrl) {
  console.log('   ⚠️  DATABASE_URL tidak tersedia, skip sync');
  return;
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
});

const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005';
const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function syncBusFromSchedule() {
  try {
    console.log('\n🔄 Syncing bus_id dari ScheduleService...');
    
    // Get schedules from API
    let schedules = [];
    try {
      const response = await axios.get(`${SCHEDULE_SERVICE_URL}/api/schedules?limit=1000`, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200 && response.data?.success) {
        schedules = response.data.data || [];
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  ScheduleService tidak tersedia, skip sync');
        return { success: false, message: 'ScheduleService tidak tersedia' };
      }
      throw error;
    }
    
    if (schedules.length === 0) {
      console.log('   ℹ️  Tidak ada schedules ditemukan');
      return { success: true, message: 'Tidak ada schedules', updated: 0 };
    }
    
    // Group by route_id, ambil bus_id terbaru
    const routeBusMap = new Map();
    schedules.forEach(schedule => {
      if (schedule.routeId && schedule.busId) {
        const existing = routeBusMap.get(schedule.routeId);
        if (!existing || (schedule.time && existing.time && new Date(schedule.time) > new Date(existing.time))) {
          routeBusMap.set(schedule.routeId, {
            busId: schedule.busId,
            time: schedule.time
          });
        }
      }
    });
    
    if (routeBusMap.size === 0) {
      console.log('   ℹ️  Tidak ada routes dengan bus_id dari schedules');
      return { success: true, message: 'Tidak ada routes untuk update', updated: 0 };
    }
    
    // Update routes table - hanya update yang belum punya bus_id atau berbeda
    const client = await pool.connect();
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    try {
      const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
      
      for (const [routeId, { busId }] of routeBusMap.entries()) {
        try {
          // Check current bus_id
          const checkResult = await client.query(`
            SELECT id, route_name, route_code, bus_id 
            FROM ${safeSchema}.routes 
            WHERE id = $1
          `, [routeId]);
          
          if (checkResult.rowCount === 0) {
            skipCount++;
            continue; // Route tidak ditemukan
          }
          
          const currentRoute = checkResult.rows[0];
          
          // Skip jika bus_id sudah sama
          if (currentRoute.bus_id === busId) {
            skipCount++;
            continue;
          }
          
          // Update bus_id
          const updateResult = await client.query(`
            UPDATE ${safeSchema}.routes 
            SET bus_id = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, route_name, route_code, bus_id
          `, [busId, routeId]);
          
          if (updateResult.rowCount > 0) {
            successCount++;
            const route = updateResult.rows[0];
            console.log(`   ✅ ${route.route_code || routeId.substring(0, 8)} → Bus ${busId.substring(0, 8)}...`);
          }
        } catch (error) {
          failCount++;
          console.log(`   ⚠️  Route ${routeId.substring(0, 8)}... error: ${error.message}`);
        }
      }
    } finally {
      client.release();
    }
    
    // Tampilkan summary
    console.log(`\n   📊 Status Sync:`);
    if (successCount > 0) {
      console.log(`   ✅ Berhasil update: ${successCount} routes`);
    }
    if (skipCount > 0) {
      console.log(`   ℹ️  Skip (sudah up-to-date/tidak ditemukan): ${skipCount} routes`);
    }
    if (failCount > 0) {
      console.log(`   ⚠️  Gagal: ${failCount} routes`);
    }
    if (successCount === 0 && skipCount === 0 && failCount === 0) {
      console.log(`   ℹ️  Tidak ada routes yang perlu di-update`);
    }
    
    await pool.end();
    return { success: true, updated: successCount, failed: failCount };
  } catch (error) {
    console.log(`   ⚠️  Error sync: ${error.message}`);
    await pool.end();
    return { success: false, message: error.message };
  }
}

// Export function untuk digunakan di dev.js
if (require.main === module) {
  // Run sync jika dipanggil langsung
  syncBusFromSchedule().catch(() => {
    // Silent fail
  });
}

module.exports = { syncBusFromSchedule };

