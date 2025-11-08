#!/usr/bin/env node
/**
 * Script untuk memverifikasi status migrasi di database
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

function sanitizeEnvValue(value) {
  if (value == null) return '';
  const asString = String(value).trim();
  return asString.replace(/^(["'])(.*)\1$/, '$2');
}

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

async function verify() {
  const client = await pool.connect();
  try {
    console.log('🔍 Memverifikasi status migrasi...\n');
    console.log(`📋 Database: ${db}`);
    console.log(`📋 Schema: ${schema}\n`);
    
    // Check if pgmigrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'pgmigrations'
      )
    `, [schema]);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tabel pgmigrations tidak ditemukan!');
      console.log('💡 Jalankan: npm run setup');
      return;
    }

    // Get all migrations
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const migrations = await client.query(`
      SELECT name, run_on FROM ${safeSchema}.pgmigrations 
      ORDER BY run_on
    `);
    
    console.log(`📊 Migrasi di database (${migrations.rowCount} total):`);
    migrations.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.name} (${row.run_on})`);
    });
    
    // Check expected migrations
    const expectedMigrations = [
      '20251105000000_initial_schema',
      '20251106000000_add_numeric_id',
      '20251109000000_add_bus_id_to_routes'
    ];
    
    console.log('\n✅ Verifikasi migrasi yang diharapkan:');
    let allPresent = true;
    expectedMigrations.forEach(expected => {
      const found = migrations.rows.find(row => row.name === expected);
      if (found) {
        console.log(`   ✅ ${expected}`);
      } else {
        console.log(`   ❌ ${expected} - TIDAK DITEMUKAN`);
        allPresent = false;
      }
    });
    
    // Check for old migration names
    const oldMigrations = migrations.rows.filter(row => 
      row.name.startsWith('0001_') || row.name.startsWith('0002_') || row.name.startsWith('0003_')
    );
    
    if (oldMigrations.length > 0) {
      console.log('\n⚠️  Ditemukan migrasi dengan nama lama:');
      oldMigrations.forEach(row => {
        console.log(`   - ${row.name}`);
      });
      console.log('\n💡 Jalankan: npm run fix-migrations');
      allPresent = false;
    }
    
    // Check database tables
    console.log('\n📊 Verifikasi tabel di database:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schema]);
    
    const expectedTables = ['routes', 'stops', 'pgmigrations'];
    expectedTables.forEach(table => {
      const found = tables.rows.find(row => row.table_name === table);
      if (found) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - TIDAK DITEMUKAN`);
        allPresent = false;
      }
    });
    
    // Check routes table columns
    if (tables.rows.find(row => row.table_name === 'routes')) {
      console.log('\n📊 Kolom di tabel routes:');
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 
        AND table_name = 'routes'
        ORDER BY ordinal_position
      `, [schema]);
      
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      // Check for expected columns
      const expectedColumns = ['id', 'route_name', 'route_code', 'numeric_id', 'bus_id'];
      const missingColumns = expectedColumns.filter(col => 
        !columns.rows.find(c => c.column_name === col)
      );
      
      if (missingColumns.length > 0) {
        console.log(`\n⚠️  Kolom yang belum ada: ${missingColumns.join(', ')}`);
        if (missingColumns.includes('bus_id')) {
          console.log('   💡 Jalankan: npm run migrate');
        }
        allPresent = false;
      } else {
        // Check if bus_id column exists and show sample data
        const busIdColumn = columns.rows.find(c => c.column_name === 'bus_id');
        if (busIdColumn) {
          const sampleRoutes = await client.query(`
            SELECT id, route_name, route_code, bus_id 
            FROM ${safeSchema}.routes 
            WHERE bus_id IS NOT NULL 
            LIMIT 3
          `);
          if (sampleRoutes.rowCount > 0) {
            console.log(`\n✅ Kolom bus_id ada dan ${sampleRoutes.rowCount} rute memiliki bus_id`);
          } else {
            console.log(`\n✅ Kolom bus_id ada, tapi belum ada rute yang terhubung dengan bus`);
            console.log('   💡 Update rute untuk menambahkan bus_id');
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    if (allPresent) {
      console.log('✅ Semua migrasi dan tabel sudah benar!');
    } else {
      console.log('⚠️  Ada masalah yang perlu diperbaiki.');
      console.log('💡 Jalankan: npm run setup');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();

