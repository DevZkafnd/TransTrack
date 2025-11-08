#!/usr/bin/env node
/**
 * Script untuk setup database busservice
 * Menjalankan migration dengan cara yang lebih eksplisit
 */
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// Fallback values jika .env tidak ada atau kosong
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'transtrack_db';
process.env.DB_USER = process.env.DB_USER || 'postgres';
if (process.env.DB_PASSWORD === undefined || process.env.DB_PASSWORD === null) {
  process.env.DB_PASSWORD = '';
}

// Set DATABASE_URL jika belum ada
if (!process.env.DATABASE_URL) {
  const user = encodeURIComponent(process.env.DB_USER);
  const pass = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
  const authPart = pass ? `${user}:${pass}` : user;
  process.env.DATABASE_URL = `postgres://${authPart}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

const { pool } = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up BusService database...');
    
    // Ensure pgcrypto extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('✅ pgcrypto extension ready');
    
    // Create pgmigrations_bus table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations_bus (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT * FROM pgmigrations_bus 
      WHERE name = '20251105130000_initial_schema'
    `);
    
    if (migrationCheck.rowCount > 0) {
      console.log('ℹ️  Migration already applied, skipping...');
      await client.query('COMMIT');
      return;
    }
    
    // Create buses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS buses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plate TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        model TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Buses table created');
    
    // Add constraint if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'buses_plate_unique'
        ) THEN
          ALTER TABLE buses ADD CONSTRAINT buses_plate_unique UNIQUE (plate);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint on plate added');
    
    // Create index if not exists
    await client.query(`
      CREATE INDEX IF NOT EXISTS buses_plate_idx ON buses (plate);
    `);
    console.log('✅ Index on plate created');
    
    // Record migration
    await client.query(`
      INSERT INTO pgmigrations_bus (name, run_on) 
      VALUES ('20251105130000_initial_schema', NOW())
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

