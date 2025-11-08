#!/usr/bin/env node
/**
 * Helper script untuk menjalankan migration dengan schema yang benar
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Build a fallback DATABASE_URL for local trust auth if not provided
(() => {
  const env = process.env;
  if (!env.DATABASE_URL || String(env.DATABASE_URL).trim().length === 0) {
    const user = (env.DB_USER && String(env.DB_USER).trim()) || 'postgres';
    const pass = env.DB_PASSWORD == null ? '' : String(env.DB_PASSWORD).trim();
    const host = (env.DB_HOST && String(env.DB_HOST).trim()) || 'localhost';
    const port = (env.DB_PORT && String(env.DB_PORT).trim()) || '5432';
    const name = (env.DB_NAME && String(env.DB_NAME).trim()) || 'transtrack_db';
    const authPart = pass === '' ? encodeURIComponent(user) : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
    env.DATABASE_URL = `postgres://${authPart}@${host}:${port}/${name}`;
  }
})();

const { execSync } = require('child_process');
const schema = process.env.DB_SCHEMA || 'public';

console.log('🚀 Running migration with schema:', schema);
console.log('📋 DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

try {
  execSync(
    `node -r dotenv/config ./node_modules/node-pg-migrate/bin/node-pg-migrate.js up --config ./config/migration.config.js --schema ${schema}`,
    { stdio: 'inherit', cwd: require('path').resolve(__dirname, '..') }
  );
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

