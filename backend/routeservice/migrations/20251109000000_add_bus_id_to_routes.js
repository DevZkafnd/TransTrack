'use strict';

/**
 * Migration: Add bus_id column to routes table
 * Menambahkan kolom bus_id untuk menghubungkan route dengan bus
 */

exports.up = pgm => {
  // Tambahkan kolom bus_id (nullable, text karena bus_id dari BusService adalah UUID)
  pgm.addColumn('routes', {
    bus_id: {
      type: 'text',
      notNull: false,
    },
  });

  // Tambahkan index untuk performa query berdasarkan bus_id
  pgm.createIndex('routes', ['bus_id'], {
    name: 'routes_bus_id_idx',
    ifNotExists: true,
  });
};

exports.down = pgm => {
  pgm.dropIndex('routes', 'routes_bus_id_idx', { ifExists: true });
  pgm.dropColumn('routes', 'bus_id');
};

