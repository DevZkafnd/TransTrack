#!/usr/bin/env node
/**
 * Script untuk setup database maintenanceservice
 * Menjalankan migration dengan cara yang lebih eksplisit
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { pool } = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up MaintenanceService database...');
    
    // Ensure pgcrypto extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('✅ pgcrypto extension ready');
    
    // Create pgmigrations_maintenance table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations_maintenance (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT * FROM pgmigrations_maintenance 
      WHERE name = '20251105004443_initial_schema'
    `);
    
    if (migrationCheck.rowCount > 0) {
      console.log('ℹ️  Migration already applied, skipping...');
      await client.query('COMMIT');
      return;
    }
    
    // Create maintenance_status enum if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
          CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
        END IF;
      END $$;
    `);
    console.log('✅ Maintenance status enum created');
    
    // Create maintenance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS maintenance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bus_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT NOT NULL,
        scheduled_date TIMESTAMPTZ NOT NULL,
        completed_date TIMESTAMPTZ,
        status maintenance_status NOT NULL DEFAULT 'scheduled',
        cost NUMERIC(12,2),
        mechanic_name TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Maintenance table created');
    
    // Create indexes if not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS maintenance_bus_id_idx ON maintenance (bus_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS maintenance_status_idx ON maintenance (status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS maintenance_scheduled_date_idx ON maintenance (scheduled_date);
    `);
    console.log('✅ Indexes created');
    
    // Record migration
    await client.query(`
      INSERT INTO pgmigrations_maintenance (name, run_on) 
      VALUES ('20251105004443_initial_schema', NOW())
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

