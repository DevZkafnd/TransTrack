#!/usr/bin/env node
/**
 * Script untuk sync bus_id dari ScheduleService ke routes table
 * Mengambil data dari ScheduleService API dan update routes table
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
  console.error('❌ DATABASE_URL tidak tersedia.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
});

const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005';
const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function getSchedulesFromAPI() {
  try {
    console.log(`   🔗 Mengambil schedules dari: ${SCHEDULE_SERVICE_URL}/api/schedules`);
    const response = await axios.get(`${SCHEDULE_SERVICE_URL}/api/schedules?limit=1000`, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data?.success) {
      return response.data.data || [];
    }
    return [];
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`   ❌ Tidak bisa terhubung ke ScheduleService di ${SCHEDULE_SERVICE_URL}`);
    } else {
      console.error(`   ❌ Error:`, error.message);
    }
    return [];
  }
}

async function updateRouteBusId(routeId, busId) {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await client.query(`
      UPDATE ${safeSchema}.routes 
      SET bus_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, route_name, route_code
    `, [busId, routeId]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error(`   ❌ Error updating route ${routeId}:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🔄 Sync Bus ID dari Schedule ke Routes');
  console.log('='.repeat(60));
  console.log(`📋 ScheduleService URL: ${SCHEDULE_SERVICE_URL}\n`);
  
  // Get schedules from API
  console.log('📋 Mengambil data schedules...\n');
  const schedules = await getSchedulesFromAPI();
  
  console.log(`✅ Ditemukan ${schedules.length} schedules\n`);
  
  if (schedules.length === 0) {
    console.log('⚠️  Tidak ada schedules yang ditemukan');
    console.log(`   💡 Pastikan ScheduleService berjalan di ${SCHEDULE_SERVICE_URL}`);
    await pool.end();
    return;
  }
  
  // Group by route_id, ambil bus_id terbaru (berdasarkan time)
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
  
  console.log(`📊 Ditemukan ${routeBusMap.size} routes dengan bus_id dari schedules\n`);
  
  // Update routes table
  console.log('🔄 Mengupdate routes table...\n');
  let successCount = 0;
  let failCount = 0;
  
  for (const [routeId, { busId }] of routeBusMap.entries()) {
    const success = await updateRouteBusId(routeId, busId);
    if (success) {
      successCount++;
      console.log(`   ✅ Route ${routeId.substring(0, 8)}... → Bus ${busId.substring(0, 8)}...`);
    } else {
      failCount++;
      console.log(`   ⚠️  Route ${routeId.substring(0, 8)}... tidak ditemukan atau error`);
    }
  }
  
  console.log(`\n✅ Selesai!`);
  console.log(`   ✅ Berhasil: ${successCount}`);
  console.log(`   ⚠️  Gagal: ${failCount}`);
  console.log('');
  
  await pool.end();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

