'use strict';

/**
 * Initial schema: extensions, maintenance table
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create maintenance_status enum if not exists
  pgm.sql(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
        CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
      END IF;
    END $$;
  `);

  // Create maintenance table only if it doesn't exist
  pgm.sql(`
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
    );
  `);

  // Create indexes if they don't exist
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS maintenance_bus_id_idx ON maintenance (bus_id);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS maintenance_status_idx ON maintenance (status);
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS maintenance_scheduled_date_idx ON maintenance (scheduled_date);
  `);
};

exports.down = pgm => {
  pgm.dropTable('maintenance');
  pgm.sql(`
    DO $$ 
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
        DROP TYPE maintenance_status;
      END IF;
    END $$;
  `);
};

