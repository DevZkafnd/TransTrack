#!/usr/bin/env node
/**
 * Script setup lengkap untuk routeservice
 * 1. Check dan install dependencies
 * 2. Check .env file
 * 3. Fix migration names jika diperlukan
 * 4. Run migrations
 * 5. Verify setup
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 RouteService Complete Setup');
console.log('='.repeat(60));

let hasError = false;

// Step 1: Check dependencies
console.log('\n📦 Step 1: Checking dependencies...');
try {
  const nodeModulesExists = fs.existsSync(path.resolve(__dirname, '../node_modules'));
  if (!nodeModulesExists) {
    console.log('   ⚠️  node_modules tidak ditemukan, menjalankan npm install...');
    execSync('npm install', { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('   ✅ Dependencies berhasil diinstall');
  } else {
    console.log('   ✅ Dependencies sudah terinstall');
  }
} catch (error) {
  console.error('   ❌ Error installing dependencies:', error.message);
  hasError = true;
}

// Step 2: Check .env file
console.log('\n📝 Step 2: Checking .env file...');
const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../env.example');

if (!fs.existsSync(envPath)) {
  console.log('   ⚠️  .env file tidak ditemukan');
  if (fs.existsSync(envExamplePath)) {
    console.log('   📋 Copying env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ .env file berhasil dibuat dari env.example');
    console.log('   💡 Silakan edit .env file dengan konfigurasi database Anda');
  } else {
    console.error('   ❌ env.example tidak ditemukan!');
    hasError = true;
  }
} else {
  console.log('   ✅ .env file sudah ada');
}

// Step 3: Check required dependencies
console.log('\n📦 Step 3: Checking required dependencies...');
const requiredDeps = ['axios', 'express', 'pg', 'dotenv', 'node-pg-migrate'];
let missingDeps = [];

for (const dep of requiredDeps) {
  try {
    require.resolve(dep);
  } catch (error) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.log(`   ⚠️  Dependencies yang hilang: ${missingDeps.join(', ')}`);
  console.log('   📦 Menginstall dependencies yang hilang...');
  try {
    execSync(`npm install ${missingDeps.join(' ')}`, { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('   ✅ Dependencies berhasil diinstall');
  } catch (error) {
    console.error('   ❌ Error installing dependencies:', error.message);
    hasError = true;
  }
} else {
  console.log('   ✅ Semua dependencies sudah terinstall');
}

// Step 4: Run database setup
console.log('\n🗄️  Step 4: Setting up database...');
try {
  execSync('npm run setup', { 
    stdio: 'inherit', 
    cwd: path.resolve(__dirname, '..') 
  });
  console.log('   ✅ Database setup selesai');
} catch (error) {
  console.error('\n   ⚠️  Database setup menemukan masalah');
  console.error('   💡 Pastikan PostgreSQL sudah berjalan');
  console.error('   💡 Pastikan konfigurasi .env sudah benar');
  console.error('   💡 Server tetap bisa berjalan, tapi database operations mungkin gagal');
  hasError = true;
}

// Step 5: Verify setup (optional, tidak block)
console.log('\n✅ Step 5: Verifying setup...');
try {
  execSync('npm run verify', { 
    stdio: 'inherit', 
    cwd: path.resolve(__dirname, '..') 
  });
} catch (error) {
  console.log('\n   ⚠️  Verifikasi menemukan beberapa masalah (ini OK)');
  console.log('   💡 Periksa output di atas untuk detail');
}

// Step 6: Sync bus_id from schedule (optional, tidak block)
console.log('\n🔄 Step 6: Syncing bus_id from ScheduleService (optional)...');
try {
  execSync('npm run sync-bus', { 
    stdio: 'inherit', 
    cwd: path.resolve(__dirname, '..') 
  });
} catch (error) {
  console.log('\n   ⚠️  Sync bus_id skipped (ScheduleService mungkin tidak berjalan)');
  console.log('   💡 Ini normal jika ScheduleService belum berjalan');
  console.log('   💡 Jalankan "npm run sync-bus" nanti setelah ScheduleService berjalan');
}

console.log('\n' + '='.repeat(60));
if (hasError) {
  console.log('⚠️  Setup selesai dengan beberapa warning');
  console.log('💡 Periksa pesan di atas untuk detail');
} else {
  console.log('✅ Setup selesai dengan sukses!');
}
console.log('='.repeat(60));
console.log('\n💡 Langkah selanjutnya:');
console.log('   1. Pastikan .env sudah dikonfigurasi dengan benar');
console.log('   2. Jalankan: npm run dev');
console.log('');
