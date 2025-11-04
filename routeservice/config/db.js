'use strict';

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SSL,
} = process.env;

// Izinkan DATABASE_URL langsung, atau kombinasi DB_*. DB_PASSWORD boleh kosong.
const hasUrl = typeof DATABASE_URL === 'string' && DATABASE_URL.trim().length > 0;
const requiredKeys = ['DB_HOST','DB_PORT','DB_NAME','DB_USER'];
const missing = requiredKeys.filter((k) => !process.env[k] || String(process.env[k]).trim().length === 0);
if (!hasUrl && missing.length > 0) {
  throw new Error(
    `Konfigurasi database belum lengkap. ` +
    `Set DATABASE_URL atau isi ${missing.join(', ')} di .env. ` +
    `Catatan: DB_PASSWORD boleh kosong untuk TRUST auth.`
  );
}

const pool = hasUrl
  ? new Pool({ connectionString: DATABASE_URL, ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false })
  : new Pool({
      host: DB_HOST || 'localhost',
      port: Number(DB_PORT || 5432),
      database: DB_NAME,
      user: String(DB_USER),
      password: DB_PASSWORD == null ? '' : String(DB_PASSWORD),
      ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

module.exports = { pool };


