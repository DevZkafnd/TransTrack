'use strict';

/**
 * Initial schema: extensions, buses table
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create buses table only if it doesn't exist
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS buses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plate TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      model TEXT NOT NULL,
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
        WHERE conname = 'buses_plate_unique'
      ) THEN
        ALTER TABLE buses ADD CONSTRAINT buses_plate_unique UNIQUE (plate);
      END IF;
    END $$;
  `);

  // Create index only if it doesn't exist
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS buses_plate_idx ON buses (plate);
  `);
};

exports.down = pgm => {
  pgm.dropConstraint('buses', 'buses_plate_unique');
  pgm.dropTable('buses');
};

