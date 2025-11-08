'use strict';

/**
 * Initial schema: extensions, schedules table
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create schedules table only if it doesn't exist
  pgm.sql(`
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
    );
  `);

  // Create indexes
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS schedules_route_id_idx ON schedules (route_id);
    CREATE INDEX IF NOT EXISTS schedules_bus_id_idx ON schedules (bus_id);
    CREATE INDEX IF NOT EXISTS schedules_driver_id_idx ON schedules (driver_id);
    CREATE INDEX IF NOT EXISTS schedules_time_idx ON schedules (time);
    CREATE INDEX IF NOT EXISTS schedules_ticket_id_idx ON schedules (ticket_id);
  `);
};

exports.down = pgm => {
  pgm.dropTable('schedules');
};

