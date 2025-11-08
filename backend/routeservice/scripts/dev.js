#!/usr/bin/env node
/**
 * Script untuk development mode dengan auto-check dan setup
 * - Check dependencies
 * - Check .env
 * - Check database connection
 * - Check migrations
 * - Start server dengan nodemon
 */
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

console.log('🔧 RouteService Development Mode');
console.log('='.repeat(60));

// Step 1: Check dependencies
const nodeModulesPath = path.resolve(__dirname, '../node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n⚠️  node_modules tidak ditemukan!');
  console.log('📦 Menjalankan npm install...\n');
  try {
    execSync('npm install', { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('\n✅ Dependencies berhasil diinstall\n');
  } catch (error) {
    console.error('\n❌ Error installing dependencies');
    process.exit(1);
  }
}

// Step 2: Check .env file
const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file tidak ditemukan!');
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file berhasil dibuat dari env.example');
    console.log('💡 Silakan edit .env file dengan konfigurasi database Anda\n');
  } else {
    console.error('❌ env.example tidak ditemukan!');
    process.exit(1);
  }
}

// Step 3: Check required dependencies
const requiredDeps = ['axios', 'express', 'pg', 'dotenv'];
let missingDeps = [];

for (const dep of requiredDeps) {
  try {
    require.resolve(dep);
  } catch (error) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.log(`⚠️  Dependencies yang hilang: ${missingDeps.join(', ')}`);
  console.log('📦 Menginstall dependencies yang hilang...\n');
  try {
    execSync(`npm install ${missingDeps.join(' ')}`, { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('\n✅ Dependencies berhasil diinstall\n');
  } catch (error) {
    console.error('\n❌ Error installing dependencies');
    process.exit(1);
  }
}

// Step 4: Quick database check (non-blocking)
console.log('🔍 Quick check database connection...');
try {
  require('dotenv').config({ path: envPath });
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

  if (databaseUrl) {
    const testPool = new Pool({
      connectionString: databaseUrl,
      ssl,
      connectionTimeoutMillis: 3000,
    });

    testPool.query('SELECT 1')
      .then(() => {
        console.log('   ✅ Database connection OK');
        testPool.end();
      })
      .catch(() => {
        console.log('   ⚠️  Database connection failed (server tetap akan berjalan)');
        console.log('   💡 Pastikan PostgreSQL berjalan dan konfigurasi .env benar');
        testPool.end();
      });
  } else {
    console.log('   ⚠️  DATABASE_URL tidak dikonfigurasi');
  }
} catch (error) {
  console.log('   ⚠️  Database check skipped (server tetap akan berjalan)');
}

// Step 5: Auto-assign buses dari ScheduleService, assign unused buses, dan assign-buses (non-blocking, run in background)
console.log('\n🔄 Step 5: Auto-assigning buses (background)...');
// Run auto-assign in background, don't wait for it
(async () => {
  try {
    // Step 5a: Auto-assign dari ScheduleService + assign unused buses (semua dalam satu function)
    const { autoAssignFromSchedule } = require('./auto-assign-from-schedule.js');
    await autoAssignFromSchedule().catch(() => {
      // Silent fail
    });
    
    // Step 5b: Assign buses ke routes yang masih null (assign-buses)
    const { assignBusesToRoutes } = require('./assign-buses-to-routes.js');
    await assignBusesToRoutes().catch(() => {
      // Silent fail
    });
  } catch (error) {
    // Silent fail
  }
})();

// Start server with nodemon (tidak menunggu sync selesai)
console.log('\n🚀 Starting server dengan nodemon...');
console.log('📋 Server akan berjalan di http://localhost:3000');
console.log('📋 API Documentation: http://localhost:3000/api-docs');
console.log('📋 Health Check: http://localhost:3000/health');
console.log('\n💡 Tekan Ctrl+C untuk menghentikan server\n');
console.log('='.repeat(60) + '\n');

// Spawn nodemon
const nodemon = spawn('npx', ['nodemon', 'server.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

nodemon.on('error', (error) => {
  console.error('❌ Error starting nodemon:', error.message);
  console.error('💡 Pastikan nodemon terinstall: npm install -g nodemon');
  process.exit(1);
});

nodemon.on('exit', (code) => {
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Menghentikan server...');
  nodemon.kill('SIGINT');
  process.exit(0);
});
