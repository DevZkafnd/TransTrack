#!/usr/bin/env node
/**
 * Auto-assign bus_id dari ScheduleService ke routes
 * Versi non-interaktif untuk dev.js
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

const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3005';
const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';

async function autoAssignFromSchedule() {
  // Build database URL inside function
  let databaseUrl = directUrl;
  if (!databaseUrl) {
    if (user && host && db) {
      const authPart = pass === '' ? encodeURIComponent(user) : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
      databaseUrl = `postgres://${authPart}@${host}:${port}/${db}`;
    }
  }

  if (!databaseUrl) {
    console.log('   ⚠️  DATABASE_URL tidak tersedia, skip auto-assign');
    return { success: false, message: 'DATABASE_URL tidak tersedia' };
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl,
  });

  try {
    console.log('\n🚌 Auto-assigning buses dari ScheduleService...');
    
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
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        console.log('   ⚠️  ScheduleService tidak tersedia, skip auto-assign');
        return { success: false, message: 'ScheduleService tidak tersedia', updated: 0 };
      }
      throw error;
    }
    
    if (schedules.length === 0) {
      console.log('   ℹ️  Tidak ada schedules ditemukan');
      return { success: true, message: 'Tidak ada schedules', updated: 0 };
    }
    
    // Group by route_id, ambil bus_id terbaru berdasarkan time (DESC - terbaru dulu)
    const routeBusMap = new Map();
    
    // Sort schedules by time DESC untuk ambil yang terbaru
    const sortedSchedules = [...schedules].sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA; // DESC - terbaru dulu
    });
    
    sortedSchedules.forEach(schedule => {
      if (schedule.routeId && schedule.busId) {
        // Hanya set jika belum ada atau ini adalah schedule terbaru
        if (!routeBusMap.has(schedule.routeId)) {
          routeBusMap.set(schedule.routeId, {
            busId: schedule.busId,
            time: schedule.time,
            routeName: schedule.routeName,
            routeCode: schedule.routeCode
          });
        }
      }
    });
    
    console.log(`   📋 Ditemukan ${routeBusMap.size} routes dengan bus_id dari schedules`);
    
    if (routeBusMap.size === 0) {
      console.log('   ℹ️  Tidak ada routes dengan bus_id dari schedules');
      // Check routes yang masih null
      const client = await pool.connect();
      try {
        const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
        const routesNull = await client.query(`
          SELECT COUNT(*)::int AS cnt 
          FROM ${safeSchema}.routes 
          WHERE bus_id IS NULL
        `);
        const nullCount = routesNull.rows[0]?.cnt || 0;
        if (nullCount > 0) {
          console.log(`   ⚠️  Masih ada ${nullCount} routes tanpa bus_id`);
          console.log(`   💡 Pastikan routes ini ada di ScheduleService`);
        }
      } finally {
        client.release();
      }
      await pool.end();
      return { success: true, message: 'Tidak ada routes untuk assign', updated: 0 };
    }
    
    // Update routes table
    const client = await pool.connect();
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    try {
      const safeSchema = schema.replace(/[^a-zA-Z0-9_]/g, '');
      
      for (const [routeId, { busId, routeName, routeCode }] of routeBusMap.entries()) {
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
          
          // Check apakah bus_id sudah digunakan di route lain
          const busUsedCheck = await client.query(`
            SELECT id, route_code, route_name
            FROM ${safeSchema}.routes
            WHERE bus_id = $1 AND id != $2
            LIMIT 1
          `, [busId, routeId]);
          
          if (busUsedCheck.rowCount > 0) {
            skipCount++;
            const usedRoute = busUsedCheck.rows[0];
            const displayCode = routeCode || routeId.substring(0, 8);
            const usedRouteCode = usedRoute.route_code || usedRoute.id.substring(0, 8);
            console.log(`   ⚠️  Skip ${displayCode} - Bus ${busId.substring(0, 8)}... sudah digunakan di route ${usedRouteCode}`);
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
            const displayCode = route.route_code || routeCode || routeId.substring(0, 8);
            console.log(`   ✅ ${displayCode} → Bus ${busId.substring(0, 8)}...`);
          }
        } catch (error) {
          failCount++;
          console.log(`   ⚠️  Route ${routeId.substring(0, 8)}... error: ${error.message}`);
        }
      }
    } finally {
      client.release();
    }
    
    // Check routes yang masih null bus_id setelah update
    const routesWithoutBus = await client.query(`
      SELECT COUNT(*)::int AS cnt 
      FROM ${safeSchema}.routes 
      WHERE bus_id IS NULL
    `);
    const routesNullCount = routesWithoutBus.rows[0]?.cnt || 0;
    
    // Tampilkan summary
    console.log(`\n   📊 Status Auto-Assign:`);
    if (successCount > 0) {
      console.log(`   ✅ Berhasil assign: ${successCount} routes`);
    }
    if (skipCount > 0) {
      console.log(`   ℹ️  Skip (sudah ter-assign/tidak ditemukan): ${skipCount} routes`);
    }
    if (failCount > 0) {
      console.log(`   ⚠️  Gagal: ${failCount} routes`);
    }
    if (routesNullCount > 0) {
      console.log(`   ⚠️  Routes tanpa bus_id: ${routesNullCount} routes`);
      console.log(`   💡 Routes ini belum ada di ScheduleService atau belum di-assign`);
    }
    if (successCount === 0 && skipCount === 0 && failCount === 0 && routesNullCount === 0) {
      console.log(`   ℹ️  Semua routes sudah ter-assign`);
    }
    
    // Step 6: Assign unused buses ke routes yang masih null
    const routesStillNull = await client.query(`
      SELECT COUNT(*)::int AS cnt 
      FROM ${safeSchema}.routes 
      WHERE bus_id IS NULL
    `);
    const nullCount = routesStillNull.rows[0]?.cnt || 0;
    
    if (nullCount > 0) {
      console.log(`\n   🔄 Masih ada ${nullCount} routes dengan bus_id null, assign unused buses...`);
      
      // Get routes dengan bus_id null
      const routesNull = await client.query(`
        SELECT id, route_name, route_code, status
        FROM ${safeSchema}.routes
        WHERE bus_id IS NULL
        ORDER BY 
          CASE WHEN status = 'active' THEN 1 ELSE 2 END,
          route_code ASC
      `);
      
      // Get buses yang sudah terpakai
      const routesWithBus = await client.query(`
        SELECT DISTINCT bus_id
        FROM ${safeSchema}.routes
        WHERE bus_id IS NOT NULL
      `);
      const usedBusIds = new Set(routesWithBus.rows.map(r => r.bus_id));
      
      // Get all buses (dari API atau database)
      const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';
      let allBuses = [];
      
      try {
        const busResponse = await axios.get(`${BUS_SERVICE_URL}/api/buses?limit=1000`, {
          timeout: 3000,
          validateStatus: (status) => status < 500,
        });
        if (busResponse.status === 200 && busResponse.data?.success) {
          allBuses = busResponse.data.data || [];
        }
      } catch (error) {
        // Fallback ke database
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = 'buses'
          )
        `, [safeSchema]);
        if (tableCheck.rows[0].exists) {
          const busResult = await client.query(`
            SELECT id, plate, capacity, model
            FROM ${safeSchema}.buses
            ORDER BY created_at ASC, plate ASC
            LIMIT 100
          `);
          allBuses = busResult.rows;
        }
      }
      
      // Filter buses yang belum terpakai
      const unusedBuses = allBuses.filter(bus => {
        const busId = bus.id || bus.uuid;
        return busId && !usedBusIds.has(busId);
      });
      
      if (unusedBuses.length > 0 && routesNull.rowCount > 0) {
        let unusedSuccessCount = 0;
        let unusedFailCount = 0;
        let unusedSkipCount = 0;
        
        // Loop semua routes yang masih null
        for (const route of routesNull.rows) {
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
            
            try {
              // Check apakah bus_id sudah digunakan di route lain
              const busUsedCheck = await client.query(`
                SELECT id, route_code, route_name
                FROM ${safeSchema}.routes
                WHERE bus_id = $1 AND id != $2
                LIMIT 1
              `, [busId, route.id]);
              
              if (busUsedCheck.rowCount > 0) {
                // Bus sudah digunakan di route lain, update tracking dan coba bus berikutnya
                usedBusIds.add(busId);
                continue;
              }
              
              // Double check sebelum update
              const checkBeforeUpdate = await client.query(`
                SELECT id FROM ${safeSchema}.routes
                WHERE bus_id = $1 AND id != $2
                LIMIT 1
              `, [busId, route.id]);
              
              if (checkBeforeUpdate.rowCount > 0) {
                // Bus sudah digunakan di route lain, update tracking dan coba bus berikutnya
                usedBusIds.add(busId);
                continue;
              }
              
              const updateResult = await client.query(`
                UPDATE ${safeSchema}.routes 
                SET bus_id = $1, updated_at = NOW()
                WHERE id = $2 AND bus_id IS NULL
                RETURNING id, route_name, route_code, bus_id
              `, [busId, route.id]);
              
              if (updateResult.rowCount > 0) {
                unusedSuccessCount++;
                const routeCode = route.route_code || route.id.substring(0, 8);
                const busPlate = bus.plate || busId.substring(0, 8);
                console.log(`   ✅ ${routeCode} → Bus ${busPlate} (${busId.substring(0, 8)}...)`);
                // Update usedBusIds untuk route berikutnya
                usedBusIds.add(busId);
                assigned = true;
              } else {
                // Route mungkin sudah ter-assign oleh proses lain, update tracking
                usedBusIds.add(busId);
              }
            } catch (error) {
              unusedFailCount++;
              // Update tracking untuk menghindari loop
              usedBusIds.add(busId);
            }
          }
          
          if (!assigned) {
            // Tidak ada bus tersedia lagi
            unusedSkipCount++;
            const routeCode = route.route_code || route.id.substring(0, 8);
            console.log(`   ⚠️  Skip ${routeCode}... - Tidak ada bus tersedia`);
          }
        }
        
        if (unusedSuccessCount > 0) {
          console.log(`   ✅ Berhasil assign ${unusedSuccessCount} routes dengan unused buses`);
        }
        if (unusedFailCount > 0) {
          console.log(`   ⚠️  Gagal assign ${unusedFailCount} routes`);
        }
        if (unusedSkipCount > 0) {
          console.log(`   ⚠️  Skip ${unusedSkipCount} routes (tidak ada bus tersedia)`);
        }
      }
    }
    
    if (pool) {
      await pool.end();
    }
    return { success: true, updated: successCount, failed: failCount, skipped: skipCount };
  } catch (error) {
    console.log(`   ⚠️  Error auto-assign: ${error.message}`);
    if (pool) {
      await pool.end();
    }
    return { success: false, message: error.message };
  }
}

// Export function untuk digunakan di dev.js
if (require.main === module) {
  // Run jika dipanggil langsung
  autoAssignFromSchedule().catch(() => {
    // Silent fail
  });
}

module.exports = { autoAssignFromSchedule };

