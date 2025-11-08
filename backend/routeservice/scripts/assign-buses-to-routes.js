#!/usr/bin/env node
/**
 * Script untuk menghubungkan route dengan bus
 * Mengambil semua routes dan buses, lalu assign secara otomatis atau manual
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

const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'http://localhost:3000';
const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';
const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function getRoutes() {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await client.query(`
      SELECT id, route_name, route_code, bus_id, status
      FROM ${safeSchema}.routes
      ORDER BY numeric_id ASC, route_code ASC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getBusesFromAPI() {
  try {
    console.log(`   🔗 Mencoba koneksi ke BusService: ${BUS_SERVICE_URL}/api/buses`);
    const response = await axios.get(`${BUS_SERVICE_URL}/api/buses?limit=1000`, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data?.success) {
      return response.data.data || [];
    } else {
      console.error(`   ⚠️  BusService returned status ${response.status}`);
      return null; // Return null to indicate API failed
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`   ❌ Tidak bisa terhubung ke BusService di ${BUS_SERVICE_URL}`);
    } else if (error.response) {
      console.error(`   ❌ BusService returned error: ${error.response.status}`);
    } else {
      console.error(`   ❌ Error:`, error.message);
    }
    return null; // Return null to indicate API failed
  }
}

async function getBusesFromDatabase() {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    // Check if buses table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'buses'
      )
    `, [safeSchema]);

    if (!tableCheck.rows[0].exists) {
      console.log('   ⚠️  Tabel buses tidak ditemukan di database');
      return [];
    }

    const result = await client.query(`
      SELECT id, plate, capacity, model
      FROM ${safeSchema}.buses
      ORDER BY created_at ASC, plate ASC
      LIMIT 1000
    `);
    return result.rows;
  } catch (error) {
    console.error(`   ❌ Error fetching buses from database:`, error.message);
    return [];
  } finally {
    client.release();
  }
}

async function getBuses() {
  // Try API first
  const busesFromAPI = await getBusesFromAPI();
  if (busesFromAPI !== null) {
    console.log(`   ✅ Berhasil mengambil data dari BusService API`);
    return busesFromAPI;
  }

  // Fallback to database
  console.log(`   ⚠️  BusService API tidak tersedia, mencoba mengambil dari database...`);
  const busesFromDB = await getBusesFromDatabase();
  if (busesFromDB.length > 0) {
    console.log(`   ✅ Berhasil mengambil data dari database`);
    return busesFromDB;
  }

  return [];
}

async function assignBusToRouteViaAPI(routeId, busId) {
  try {
    const response = await axios.post(
      `${ROUTE_SERVICE_URL}/api/routes/${routeId}/assign-bus`,
      { busId },
      {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      }
    );

    if (response.status === 200 && response.data.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function assignBusToRouteDirect(routeId, busId) {
  const client = await pool.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    await client.query(`
      UPDATE ${safeSchema}.routes 
      SET bus_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [busId, routeId]);
    return true;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

async function assignBusToRoute(routeId, busId) {
  // Try API first
  const success = await assignBusToRouteViaAPI(routeId, busId);
  if (success) {
    return true;
  }

  // Fallback to direct database update
  console.log(`   ⚠️  RouteService API tidak tersedia, menggunakan direct database update...`);
  return await assignBusToRouteDirect(routeId, busId);
}

async function assignBusesToRoutes() {
  const localPool = new Pool({
    connectionString: databaseUrl,
    ssl,
  });
  
  try {
    console.log('\n🚌 Assign Bus to Routes (auto-assign)...');
    
    // Get routes and buses
    const routes = await getRoutesWithPool(localPool);
    const buses = await getBuses();
    
    if (routes.length === 0) {
      console.log('   ⚠️  Tidak ada routes yang ditemukan');
      await localPool.end();
      return { success: true, updated: 0, message: 'Tidak ada routes' };
    }
    
    if (buses.length === 0) {
      console.log('   ⚠️  Tidak ada buses yang ditemukan (BusService mungkin tidak tersedia)');
      await localPool.end();
      return { success: false, updated: 0, message: 'Tidak ada buses tersedia' };
    }
    
    // Show routes without bus_id
    const routesWithoutBus = routes.filter(r => !r.bus_id);
    
    if (routesWithoutBus.length === 0) {
      console.log('   ✅ Semua routes sudah memiliki bus_id!');
      await localPool.end();
      return { success: true, updated: 0, message: 'Semua routes sudah ter-assign' };
    }
    
    console.log(`   📋 Ditemukan ${routesWithoutBus.length} routes tanpa bus_id dari ${routes.length} total routes`);
    console.log(`   📋 Tersedia ${buses.length} buses`);
    
    // Get buses yang sudah terpakai di routes
    const client = await localPool.connect();
    let usedBusIds = new Set();
    try {
      const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
      const usedBusesResult = await client.query(`
        SELECT DISTINCT bus_id
        FROM ${safeSchema}.routes
        WHERE bus_id IS NOT NULL
      `);
      usedBusIds = new Set(usedBusesResult.rows.map(r => r.bus_id));
      console.log(`   📋 Buses yang sudah terpakai: ${usedBusIds.size} buses`);
    } finally {
      client.release();
    }
    
    // Filter buses yang belum terpakai
    const unusedBuses = buses.filter(bus => {
      const busId = bus.id || bus.uuid;
      return busId && !usedBusIds.has(busId);
    });
    
    if (unusedBuses.length === 0) {
      console.log('   ⚠️  Semua buses sudah terpakai di routes lain');
      await localPool.end();
      return { success: false, updated: 0, message: 'Semua buses sudah terpakai' };
    }
    
    console.log(`   📋 Buses yang belum terpakai: ${unusedBuses.length} buses`);
    
    // Auto-assign: assign semua routes ke unused buses (tidak ada limit)
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    // Loop semua routes yang belum punya bus_id
    for (const route of routesWithoutBus) {
      // Cari bus yang belum terpakai dari awal list
      let assigned = false;
      
      for (let i = 0; i < unusedBuses.length && !assigned; i++) {
        const bus = unusedBuses[i];
        const busId = bus.id || bus.uuid;
        
        if (!busId) {
          continue;
        }
        
        // Skip jika bus sudah terpakai (dari usedBusIds yang sudah di-update)
        if (usedBusIds.has(busId)) {
          continue;
        }
        
        // Double check: pastikan bus_id belum digunakan di route lain
        const isBusUsed = await checkBusUsedInOtherRoute(busId, route.id, localPool);
        if (isBusUsed) {
          usedBusIds.add(busId); // Update tracking
          continue; // Coba bus berikutnya
        }
        
        // Coba assign
        const success = await assignBusToRouteWithPool(route.id, busId, localPool);
        if (success) {
          successCount++;
          const routeCode = route.route_code || route.id.substring(0, 8);
          const busPlate = bus.plate || busId.substring(0, 8);
          console.log(`   ✅ ${routeCode} → Bus ${busPlate} (${busId.substring(0, 8)}...)`);
          // Update usedBusIds untuk route berikutnya
          usedBusIds.add(busId);
          assigned = true;
        } else {
          // Mungkin bus sudah digunakan, update tracking
          usedBusIds.add(busId);
        }
      }
      
      if (!assigned) {
        // Tidak ada bus tersedia lagi
        skipCount++;
        console.log(`   ⚠️  Skip ${route.route_code || route.id.substring(0, 8)}... - Tidak ada bus tersedia`);
      }
    }
    
    if (skipCount > 0) {
      console.log(`   ℹ️  Skip ${skipCount} routes (bus sudah digunakan di route lain)`);
    }
    
    console.log(`   ✅ Selesai! ${successCount} routes berhasil di-assign ke buses`);
    if (failCount > 0) {
      console.log(`   ⚠️  ${failCount} routes gagal di-assign`);
    }
    
    await localPool.end();
    return { success: true, updated: successCount, failed: failCount };
  } catch (error) {
    console.log(`   ⚠️  Error assign buses: ${error.message}`);
    await localPool.end();
    return { success: false, message: error.message };
  }
}

async function getRoutesWithPool(poolInstance) {
  const client = await poolInstance.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await client.query(`
      SELECT id, route_name, route_code, bus_id, status
      FROM ${safeSchema}.routes
      ORDER BY numeric_id ASC, route_code ASC
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

async function checkBusUsedInOtherRoute(busId, currentRouteId, poolInstance) {
  const client = await poolInstance.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await client.query(`
      SELECT id, route_code, route_name
      FROM ${safeSchema}.routes
      WHERE bus_id = $1 AND id != $2
      LIMIT 1
    `, [busId, currentRouteId]);
    return result.rowCount > 0;
  } catch (error) {
    // Jika error, anggap bus sudah digunakan untuk safety
    return true;
  } finally {
    client.release();
  }
}

async function assignBusToRouteWithPool(routeId, busId, poolInstance) {
  // Double check: pastikan bus_id belum digunakan di route lain
  const isBusUsed = await checkBusUsedInOtherRoute(busId, routeId, poolInstance);
  if (isBusUsed) {
    return false; // Bus sudah digunakan di route lain
  }

  // Try API first
  const success = await assignBusToRouteViaAPI(routeId, busId);
  if (success) {
    return true;
  }

  // Fallback to direct database update
  const client = await poolInstance.connect();
  try {
    const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
    // Double check lagi sebelum update
    const checkResult = await client.query(`
      SELECT id FROM ${safeSchema}.routes
      WHERE bus_id = $1 AND id != $2
      LIMIT 1
    `, [busId, routeId]);
    
    if (checkResult.rowCount > 0) {
      return false; // Bus sudah digunakan di route lain
    }
    
    await client.query(`
      UPDATE ${safeSchema}.routes 
      SET bus_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [busId, routeId]);
    return true;
  } catch (error) {
    return false;
  } finally {
    client.release();
  }
}

// Export function untuk digunakan di dev.js
if (require.main === module) {
  // Run jika dipanggil langsung - gunakan pool global
  console.log('🚌 Assign Bus to Routes');
  console.log('='.repeat(60));
  console.log(`📋 BusService URL: ${BUS_SERVICE_URL}`);
  console.log(`📋 RouteService URL: ${ROUTE_SERVICE_URL}\n`);
  
  // Override untuk menggunakan pool global saat dipanggil langsung
  async function main() {
    try {
      console.log('📋 Mengambil data routes dan buses...\n');
      const routes = await getRoutes();
      const buses = await getBuses();
      
      console.log(`\n✅ Ditemukan ${routes.length} routes`);
      console.log(`✅ Ditemukan ${buses.length} buses\n`);
      
      if (routes.length === 0) {
        console.log('⚠️  Tidak ada routes yang ditemukan');
        await pool.end();
        return;
      }
      
      if (buses.length === 0) {
        console.log('\n⚠️  Tidak ada buses yang ditemukan');
        console.log(`   💡 Pastikan BusService berjalan di port 3006`);
        console.log(`   💡 Check konfigurasi:`);
        console.log(`      - File: backend/busservice/.env harus ada PORT=3006`);
        console.log(`      - File: backend/routeservice/.env harus ada BUS_SERVICE_URL=http://localhost:3006`);
        console.log(`   💡 Test koneksi: curl http://localhost:3006/api/buses`);
        console.log(`   💡 Atau jalankan: cd ../busservice && npm run dev`);
        console.log('');
        await pool.end();
        return;
      }
      
      // Show routes without bus_id
      const routesWithoutBus = routes.filter(r => !r.bus_id);
      console.log(`📊 Routes tanpa bus: ${routesWithoutBus.length} dari ${routes.length} total\n`);
      
      if (routesWithoutBus.length === 0) {
        console.log('✅ Semua routes sudah memiliki bus_id!');
        await pool.end();
        return;
      }
      
      // Show available buses
      console.log('🚌 Buses yang tersedia:');
      buses.forEach((bus, idx) => {
        console.log(`   ${idx + 1}. ${bus.plate} (${bus.model}) - ID: ${bus.id.substring(0, 8)}...`);
      });
      
      console.log('\n📋 Routes yang perlu di-assign:');
      routesWithoutBus.forEach((route, idx) => {
        console.log(`   ${idx + 1}. ${route.route_code} - ${route.route_name.substring(0, 50)}...`);
      });
      
      // Auto-assign: assign first N routes to first N buses
      console.log('\n🔄 Auto-assigning routes to buses...');
      const maxAssign = Math.min(routesWithoutBus.length, buses.length);
      
      for (let i = 0; i < maxAssign; i++) {
        const route = routesWithoutBus[i];
        const bus = buses[i];
        
        const success = await assignBusToRoute(route.id, bus.id);
        if (success) {
          console.log(`   ✅ ${route.route_code} → ${bus.plate}`);
        } else {
          console.log(`   ❌ Gagal assign ${route.route_code} → ${bus.plate}`);
        }
      }
      
      console.log(`\n✅ Selesai! ${maxAssign} routes berhasil di-assign ke buses`);
      console.log('\n💡 Untuk assign manual, gunakan:');
      console.log('   # Via assign-bus endpoint (disarankan):');
      console.log('   curl -X POST http://localhost:3000/api/routes/{route-id}/assign-bus \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"busId": "bus-uuid"}\'');
      console.log('');
      console.log('   # Atau via PATCH endpoint:');
      console.log('   curl -X PATCH http://localhost:3000/api/routes/{route-id} \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"busId": "bus-uuid"}\'');
      console.log('');
      
      await pool.end();
    } catch (error) {
      console.error('❌ Error:', error.message);
      await pool.end();
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { assignBusesToRoutes };

