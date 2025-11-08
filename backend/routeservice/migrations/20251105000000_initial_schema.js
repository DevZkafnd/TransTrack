'use strict';

/**
 * Initial schema: extensions, enum, routes, stops
 */

exports.up = pgm => {
  // Ensure pgcrypto extension for gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create enum for route status
  pgm.createType('route_status', ['active', 'inactive', 'maintenance']);

  // Routes table
  pgm.createTable('routes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    route_name: { type: 'text', notNull: true },
    route_code: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    status: { type: 'route_status', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('routes', 'routes_route_code_unique', {
    unique: ['route_code'],
  });

  // Stops table
  pgm.createTable('stops', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    route_id: {
      type: 'uuid',
      notNull: true,
      references: 'routes(id)',
      onDelete: 'CASCADE',
    },
    stop_name: { type: 'text', notNull: true },
    stop_code: { type: 'text', notNull: true },
    latitude: { type: 'numeric(10,6)', notNull: true },
    longitude: { type: 'numeric(10,6)', notNull: true },
    sequence: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // Helpful index for route ordering and unique ensure
  pgm.createIndex('routes', ['status']);
  pgm.createIndex('stops', ['route_id', 'sequence']);
};

exports.down = pgm => {
  pgm.dropTable('stops');
  pgm.dropConstraint('routes', 'routes_route_code_unique');
  pgm.dropTable('routes');
  pgm.dropType('route_status');
};

