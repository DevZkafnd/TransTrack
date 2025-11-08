#!/usr/bin/env node
/**
 * Script untuk assign bus ke route secara manual
 * Bisa digunakan jika BusService tidak berjalan
 * 
 * Usage: node scripts/assign-buses-manual.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');
const readline = require('readline');

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

const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getRoutes() {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await client.query(`
      SELECT id, route_name, route_code, bus_id, status, numeric_id
      FROM ${safeSchema}.routes
      ORDER BY numeric_id ASC, route_code ASC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

async function assignBusToRoute(routeId, busId) {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    await client.query(`
      UPDATE ${safeSchema}.routes 
      SET bus_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [busId || null, routeId]);
    return true;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚌 Assign Bus to Routes (Manual)');
  console.log('='.repeat(60));
  console.log('💡 Script ini memungkinkan assign bus ID secara manual\n');
  
  const routes = await getRoutes();
  const routesWithoutBus = routes.filter(r => !r.bus_id);
  
  if (routesWithoutBus.length === 0) {
    console.log('✅ Semua routes sudah memiliki bus_id!');
    await pool.end();
    rl.close();
    return;
  }
  
  console.log(`📋 Routes yang perlu di-assign: ${routesWithoutBus.length}\n`);
  routesWithoutBus.forEach((route, idx) => {
    console.log(`   ${idx + 1}. [${route.route_code}] ${route.route_name.substring(0, 60)}...`);
    console.log(`      ID: ${route.id}`);
    console.log(`      Status: ${route.status}`);
    console.log('');
  });
  
  console.log('💡 Masukkan bus ID (UUID) untuk setiap route, atau tekan Enter untuk skip\n');
  
  for (let i = 0; i < routesWithoutBus.length; i++) {
    const route = routesWithoutBus[i];
    const busId = await question(`Route ${i + 1} [${route.route_code}] - Bus ID (atau Enter untuk skip): `);
    
    if (busId.trim()) {
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(busId.trim())) {
        console.log('   ⚠️  Format UUID tidak valid, skip...\n');
        continue;
      }
      
      const success = await assignBusToRoute(route.id, busId.trim());
      if (success) {
        console.log(`   ✅ ${route.route_code} berhasil di-assign ke bus ${busId.trim().substring(0, 8)}...\n`);
      } else {
        console.log(`   ❌ Gagal assign ${route.route_code}\n`);
      }
    } else {
      console.log(`   ⏭️  Skip ${route.route_code}\n`);
    }
  }
  
  console.log('✅ Selesai!');
  await pool.end();
  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

