#!/usr/bin/env node
/**
 * Script to fix migration names in pgmigrations table
 * Updates old numeric-prefixed names to new timestamp-based names
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');
const path = require('path');

// Build DATABASE_URL
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
  console.error('❌ DATABASE_URL tidak tersedia. Pastikan .env sudah dikonfigurasi dengan benar.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
});

const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function fixMigrationNames() {
  const client = await pool.connect();
  try {
    console.log('🔧 Memperbarui nama migrasi di tabel pgmigrations...');
    console.log(`📋 Schema: ${schema}`);
    console.log(`📋 Database: ${db}`);
    console.log(`📋 Host: ${host}:${port}\n`);

    // Check if pgmigrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'pgmigrations'
      )
    `, [schema]);

    if (!tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabel pgmigrations belum ada. Tidak ada yang perlu diperbaiki.');
      return;
    }

    // Get all current migrations
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const allMigrations = await client.query(`
      SELECT name, run_on FROM ${safeSchema}.pgmigrations 
      ORDER BY run_on
    `);
    
    console.log(`📊 Migrasi yang ada di database (${allMigrations.rowCount} total):`);
    allMigrations.rows.forEach(row => {
      console.log(`   - ${row.name} (run on: ${row.run_on})`);
    });

    // Mapping nama lama ke nama baru
    const migrationsToUpdate = [
      { old: '0001_initial_schema', new: '20251105000000_initial_schema' },
      { old: '0002_add_numeric_id', new: '20251106000000_add_numeric_id' },
    ];

    // Update each migration name
    let updatedCount = 0;
    for (const migration of migrationsToUpdate) {
      // Check if old name exists
      const checkOld = await client.query(`
        SELECT name FROM ${safeSchema}.pgmigrations WHERE name = $1
      `, [migration.old]);
      
      if (checkOld.rowCount === 0) {
        console.log(`\nℹ️  ${migration.old} tidak ditemukan (mungkin sudah diperbaiki)`);
        continue;
      }

      // Check if new name already exists
      const checkNew = await client.query(`
        SELECT name FROM ${safeSchema}.pgmigrations WHERE name = $1
      `, [migration.new]);
      
      if (checkNew.rowCount > 0) {
        console.log(`\n⚠️  ${migration.new} sudah ada di database!`);
        console.log(`   Menghapus duplikat ${migration.old}...`);
        // Delete the old one
        const deleteResult = await client.query(`
          DELETE FROM ${safeSchema}.pgmigrations WHERE name = $1
        `, [migration.old]);
        if (deleteResult.rowCount > 0) {
          console.log(`   ✅ Deleted: ${migration.old}`);
          updatedCount++;
        }
        continue;
      }

      // Update the name
      const updateQuery = `
        UPDATE ${safeSchema}.pgmigrations 
        SET name = $1 
        WHERE name = $2
      `;
      const result = await client.query(updateQuery, [migration.new, migration.old]);
      
      if (result.rowCount > 0) {
        console.log(`\n✅ Updated: ${migration.old} → ${migration.new}`);
        updatedCount++;
      } else {
        console.log(`\n⚠️  Gagal update: ${migration.old} (tidak ada baris yang terpengaruh)`);
      }
    }

    // Verify updates
    console.log('\n📊 Migrasi setelah update:');
    const updatedMigrations = await client.query(`
      SELECT name, run_on FROM ${safeSchema}.pgmigrations 
      ORDER BY run_on
    `);
    updatedMigrations.rows.forEach(row => {
      console.log(`   - ${row.name} (run on: ${row.run_on})`);
    });

    if (updatedCount > 0) {
      console.log(`\n✅ Selesai! ${updatedCount} migrasi diperbarui.`);
      console.log('💡 Sekarang coba jalankan: npm run migrate atau npm run setup');
    } else {
      console.log('\n✅ Tidak ada migrasi yang perlu diperbaiki. Semua sudah menggunakan format timestamp.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    if (error.code === '42P01') {
      console.error('   Tabel pgmigrations tidak ditemukan. Pastikan migrasi sudah pernah dijalankan setidaknya sekali.');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMigrationNames();
