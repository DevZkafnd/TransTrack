'use strict';

/**
 * Initial schema: extensions, users table
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create users table only if it doesn't exist
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add unique constraint on email if it doesn't exist
  pgm.sql(`
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

  // Add unique constraint on phone if it doesn't exist
  pgm.sql(`
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

  // Create indexes if they don't exist
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DO $$ 
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique') THEN
        ALTER TABLE users DROP CONSTRAINT users_phone_unique;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
        ALTER TABLE users DROP CONSTRAINT users_email_unique;
      END IF;
    END $$;
  `);
  pgm.dropTable('users');
};

