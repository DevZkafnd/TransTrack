#!/usr/bin/env node
/**
 * Script untuk check status routes - mana yang sudah punya bus_id dan mana yang belum
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

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

const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function checkRoutesStatus() {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Get all routes
    const allRoutes = await client.query(`
      SELECT id, route_name, route_code, bus_id, status
      FROM ${safeSchema}.routes
      ORDER BY route_code ASC
    `);
    
    const routesWithBus = allRoutes.rows.filter(r => r.bus_id);
    const routesWithoutBus = allRoutes.rows.filter(r => !r.bus_id);
    
    console.log('📊 Status Routes');
    console.log('='.repeat(60));
    console.log(`\n✅ Routes dengan bus_id: ${routesWithBus.length} dari ${allRoutes.rows.length} total`);
    console.log(`⚠️  Routes tanpa bus_id: ${routesWithoutBus.length} dari ${allRoutes.rows.length} total\n`);
    
    if (routesWithoutBus.length > 0) {
      console.log('⚠️  Routes yang belum ter-assign bus_id:');
      routesWithoutBus.forEach((route, idx) => {
        console.log(`   ${idx + 1}. [${route.route_code}] ${route.route_name.substring(0, 50)}...`);
        console.log(`      ID: ${route.id}`);
        console.log(`      Status: ${route.status}`);
        console.log('');
      });
    }
    
    if (routesWithBus.length > 0) {
      console.log('\n✅ Routes yang sudah ter-assign bus_id:');
      routesWithBus.forEach((route, idx) => {
        console.log(`   ${idx + 1}. [${route.route_code}] ${route.route_name.substring(0, 50)}...`);
        console.log(`      Bus ID: ${route.bus_id.substring(0, 8)}...`);
        console.log('');
      });
    }
    
  } finally {
    client.release();
  }
  await pool.end();
}

checkRoutesStatus().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

