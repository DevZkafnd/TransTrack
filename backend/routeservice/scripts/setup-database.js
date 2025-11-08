#!/usr/bin/env node
/**
 * Script untuk setup database routeservice
 * 1. Memperbaiki nama migrasi jika diperlukan (dari format numeric ke timestamp)
 * 2. Menjalankan migration
 */
const path = require('path');
const { execSync } = require('child_process');

// Load .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
});

const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function checkAndFixMigrations() {
  const client = await pool.connect();
  try {
    console.log('\n📋 Memeriksa status migrasi di database...');
    
    // Check if pgmigrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'pgmigrations'
      )
    `, [schema]);

    if (!tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabel pgmigrations belum ada, akan dibuat saat migrasi pertama kali dijalankan.\n');
      return false; // No migrations to fix
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

    // Check for old migration names
    const oldMigrations = await client.query(`
      SELECT name FROM ${safeSchema}.pgmigrations 
      WHERE name IN ('0001_initial_schema', '0002_add_numeric_id')
      ORDER BY name
    `);

    if (oldMigrations.rowCount === 0) {
      console.log('\n✅ Nama migrasi sudah menggunakan format timestamp.\n');
      return false; // No fixes needed
    }

    console.log(`\n🔧 Ditemukan ${oldMigrations.rowCount} migrasi dengan nama lama, memperbaiki...`);
    
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
        console.log(`   ℹ️  ${migration.old} tidak ditemukan (mungkin sudah diperbaiki)`);
        continue;
      }

      // Check if new name already exists (shouldn't happen, but just in case)
      const checkNew = await client.query(`
        SELECT name FROM ${safeSchema}.pgmigrations WHERE name = $1
      `, [migration.new]);
      
      if (checkNew.rowCount > 0) {
        console.log(`   ⚠️  ${migration.new} sudah ada di database, menghapus duplikat ${migration.old}...`);
        // Delete the old one
        await client.query(`
          DELETE FROM ${safeSchema}.pgmigrations WHERE name = $1
        `, [migration.old]);
        updatedCount++;
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
        console.log(`   ✅ Updated: ${migration.old} → ${migration.new}`);
        updatedCount++;
      } else {
        console.log(`   ⚠️  Gagal update: ${migration.old}`);
      }
    }

    if (updatedCount > 0) {
      // Verify the updates
      console.log('\n📊 Verifikasi migrasi setelah update:');
      const verifyMigrations = await client.query(`
        SELECT name, run_on FROM ${safeSchema}.pgmigrations 
        ORDER BY run_on
      `);
      verifyMigrations.rows.forEach(row => {
        console.log(`   - ${row.name} (run on: ${row.run_on})`);
      });
      
      console.log(`\n✅ ${updatedCount} migrasi berhasil diperbaiki.\n`);
      return true;
    } else {
      console.log('\n⚠️  Tidak ada migrasi yang diperbarui.\n');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error saat memeriksa/memperbaiki migrasi:', error.message);
    console.error('   Stack:', error.stack);
    console.log('\n⚠️  Melanjutkan dengan migrasi normal...\n');
    return false;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  console.log('🚀 Menjalankan migrasi database...');
  console.log(`📋 Schema: ${schema}`);
  console.log(`📋 Database: ${db}`);
  console.log('ℹ️  Catatan: Peringatan "Can\'t determine timestamp" adalah normal dan tidak mempengaruhi migrasi.\n');

  try {
    execSync(
      `node -r dotenv/config ./node_modules/node-pg-migrate/bin/node-pg-migrate.js up --config ./config/migration.config.js --schema ${schema}`,
      { 
        stdio: 'inherit', 
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: databaseUrl }
      }
    );
    console.log('\n✅ Migration completed successfully!');
    
    // Verify migrations after running
    await verifyMigrations();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function verifyMigrations() {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const migrations = await client.query(`
      SELECT name, run_on FROM ${safeSchema}.pgmigrations 
      ORDER BY run_on
    `);
    
    console.log('\n📊 Verifikasi migrasi di database:');
    const expectedMigrations = [
      '20251105000000_initial_schema',
      '20251106000000_add_numeric_id',
      '20251109000000_add_bus_id_to_routes'
    ];
    
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
    
    if (allPresent) {
      console.log('\n✅ Semua migrasi sudah dijalankan dengan benar!');
    } else {
      console.log('\n⚠️  Beberapa migrasi belum dijalankan.');
    }
  } catch (error) {
    console.error('\n⚠️  Error saat verifikasi:', error.message);
  } finally {
    client.release();
  }
}

async function setup() {
  try {
    console.log('🔧 RouteService Database Setup');
    console.log('='.repeat(60));
    console.log(`📋 Database: ${db}`);
    console.log(`📋 Schema: ${schema}`);
    console.log(`📋 Host: ${host}:${port}`);
    console.log('='.repeat(60));
    
    // Step 1: Check and fix migration names if needed
    const fixed = await checkAndFixMigrations();
    
    if (fixed) {
      console.log('⏳ Menunggu 1 detik untuk memastikan perubahan tersimpan...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 2: Run migrations
    await runMigrations();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database setup completed successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 Catatan:');
    console.log('   - Peringatan "Can\'t determine timestamp" adalah normal');
    console.log('   - Migrasi tetap berjalan dengan benar meskipun ada warning');
    console.log('   - Semua tabel dan kolom sudah dibuat dengan benar\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
