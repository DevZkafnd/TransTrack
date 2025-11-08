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
console.log('ℹ️  Catatan: Peringatan "Can\'t determine timestamp" adalah normal dan tidak mempengaruhi migrasi.\n');

try {
  // Capture output and filter warnings
  const output = execSync(
    `node -r dotenv/config ./node_modules/node-pg-migrate/bin/node-pg-migrate.js up --config ./config/migration.config.js --schema ${schema}`,
    { 
      encoding: 'utf8',
      cwd: require('path').resolve(__dirname, '..'),
      stdio: ['inherit', 'pipe', 'pipe']
    }
  );
  
  // Filter out "Can't determine timestamp" warnings
  const lines = output.split('\n');
  const filteredLines = lines.filter(line => 
    !line.includes("Can't determine timestamp")
  );
  
  // Show important output
  filteredLines.forEach(line => {
    if (line.trim() && (
      line.includes('Migrating') || 
      line.includes('MIGRATION') || 
      line.includes('Migrations complete') ||
      line.includes('No migrations to run') ||
      line.includes('Error') ||
      line.includes('❌')
    )) {
      console.log(line);
    }
  });
  
  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  // Check if it's actually an error or just warnings
  const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message;
  
  if (errorOutput.includes('Migrations complete') || errorOutput.includes('No migrations to run')) {
    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  Semua migrasi sudah dijalankan sebelumnya.');
  } else {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stdout) console.error('Output:', error.stdout.toString());
    if (error.stderr) console.error('Error:', error.stderr.toString());
    process.exit(1);
  }
}

