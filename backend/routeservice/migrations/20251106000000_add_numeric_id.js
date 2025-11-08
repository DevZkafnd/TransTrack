'use strict';

/**
 * Migration: Add numeric_id column to routes table
 * Menambahkan kolom numeric_id untuk sequential numbering
 */

exports.up = pgm => {
  // Tambahkan kolom numeric_id (nullable integer untuk sequential numbering)
  pgm.addColumn('routes', {
    numeric_id: {
      type: 'integer',
      notNull: false,
    },
  });

  // Populate existing rows with sequential numbers
  pgm.sql(`
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, route_code ASC, id ASC) AS rn
      FROM routes
    )
    UPDATE routes r
    SET numeric_id = o.rn
    FROM ordered o
    WHERE r.id = o.id
  `);

  // Tambahkan index untuk performa query berdasarkan numeric_id
  pgm.createIndex('routes', ['numeric_id'], {
    name: 'routes_numeric_id_idx',
    ifNotExists: true,
  });
};

exports.down = pgm => {
  pgm.dropIndex('routes', 'routes_numeric_id_idx', { ifExists: true });
  pgm.dropColumn('routes', 'numeric_id');
};

