#!/usr/bin/env node
/**
 * Script untuk setup database userservice
 * Menjalankan migration dengan cara yang lebih eksplisit
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { pool } = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up UserService database...');
    
    // Ensure pgcrypto extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    console.log('✅ pgcrypto extension ready');
    
    // Create pgmigrations_user table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations_user (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        run_on TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Migration table ready');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT * FROM pgmigrations_user 
      WHERE name = '20251105003100_initial_schema'
    `);
    
    if (migrationCheck.rowCount > 0) {
      console.log('ℹ️  Migration already applied, skipping...');
      await client.query('COMMIT');
      return;
    }
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created');
    
    // Add unique constraint on email if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_email_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint on email added');
    
    // Add unique constraint on phone if not exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_phone_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint on phone added');
    
    // Create indexes if not exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone);
    `);
    console.log('✅ Indexes created');
    
    // Record migration
    await client.query(`
      INSERT INTO pgmigrations_user (name, run_on) 
      VALUES ('20251105003100_initial_schema', NOW())
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

