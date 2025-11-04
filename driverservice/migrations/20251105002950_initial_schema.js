'use strict';

/**
 * Initial schema: extensions, drivers table
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create drivers table only if it doesn't exist
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS drivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      license TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add constraint only if it doesn't exist
  pgm.sql(`
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

  // Create index only if it doesn't exist
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS drivers_license_idx ON drivers (license);
  `);
};

exports.down = pgm => {
  pgm.dropConstraint('drivers', 'drivers_license_unique');
  pgm.dropTable('drivers');
};

