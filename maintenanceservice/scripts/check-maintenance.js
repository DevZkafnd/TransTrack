const { pool } = require('../config/db');
require('dotenv').config();

(async () => {
  try {
    // Check all maintenance records
    const res = await pool.query(`
      SELECT 
        id,
        bus_id,
        maintenance_type,
        status,
        scheduled_date
      FROM maintenance
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📋 Maintenance Records:');
    if (res.rows.length === 0) {
      console.log('  (No records found)');
    } else {
      res.rows.forEach((r, i) => {
        console.log(`\n  ${i + 1}. ID: ${r.id}`);
        console.log(`     Bus ID: ${r.bus_id}`);
        console.log(`     Type: ${r.maintenance_type}`);
        console.log(`     Status: ${r.status}`);
        console.log(`     Scheduled: ${r.scheduled_date}`);
      });
    }
    
    // Check unique bus_ids
    const busRes = await pool.query(`
      SELECT DISTINCT bus_id, COUNT(*) as count
      FROM maintenance
      GROUP BY bus_id
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Bus IDs in database:');
    if (busRes.rows.length === 0) {
      console.log('  (No bus IDs found)');
    } else {
      busRes.rows.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.bus_id} (${r.count} maintenance record(s))`);
      });
    }
    
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();

