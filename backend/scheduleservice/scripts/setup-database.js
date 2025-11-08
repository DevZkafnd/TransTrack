#!/usr/bin/env node
/**
 * Script untuk setup database scheduleservice
 * Menjalankan migration dengan cara yang lebih eksplisit
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { pool } = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up ScheduleService database...');
    
    // Ensure pgcrypto extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('✅ pgcrypto extension ready');
    
    // Create pgmigrations_schedules table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations_schedules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT * FROM pgmigrations_schedules 
      WHERE name = '20251105120000_initial_schema'
    `);
    
    if (migrationCheck.rowCount > 0) {
      console.log('ℹ️  Migration already applied, skipping...');
      await client.query('COMMIT');
      return;
    }
    
    // Create schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id TEXT NOT NULL,
        route_name TEXT NOT NULL,
        bus_id TEXT NOT NULL,
        bus_plate TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        time TIMESTAMPTZ NOT NULL,
        ticket_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Schedules table created');
    
    // Create indexes if not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS schedules_route_id_idx ON schedules (route_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS schedules_bus_id_idx ON schedules (bus_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS schedules_driver_id_idx ON schedules (driver_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS schedules_time_idx ON schedules (time);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS schedules_ticket_id_idx ON schedules (ticket_id);
    `);
    console.log('✅ Indexes created');
    
    // Record migration
    await client.query(`
      INSERT INTO pgmigrations_schedules (name, run_on) 
      VALUES ('20251105120000_initial_schema', NOW())
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Migration recorded');
    
    await client.query('COMMIT');
    console.log('\n✅ Database setup completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();

