#!/usr/bin/env node
/**
 * Script untuk setup database driverservice
 * Menjalankan migration dengan cara yang lebih eksplisit
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { pool } = require('../config/db');
const { readFileSync } = require('fs');
const { join } = require('path');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up DriverService database...');
    
    // Ensure pgcrypto extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('✅ pgcrypto extension ready');
    
    // Create pgmigrations_driver table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations_driver (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT * FROM pgmigrations_driver 
      WHERE name = '20251105002950_initial_schema'
    `);
    
    if (migrationCheck.rowCount > 0) {
      console.log('ℹ️  Migration already applied, skipping...');
      await client.query('COMMIT');
      return;
    }
    
    // Create drivers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        license TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Drivers table created');
    
    // Add constraint if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'drivers_license_unique'
        ) THEN
          ALTER TABLE drivers ADD CONSTRAINT drivers_license_unique UNIQUE (license);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint on license added');
    
    // Create index if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS drivers_license_idx ON drivers (license);
    `);
    console.log('✅ Index on license created');
    
    // Record migration
    await client.query(`
      INSERT INTO pgmigrations_driver (name, run_on) 
      VALUES ('20251105002950_initial_schema', NOW())
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

