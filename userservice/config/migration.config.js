// Migration configuration for node-pg-migrate using environment variables
const path = require('path');
const dotenv = require('dotenv');

// Load .env dari folder project ini (userservice/.env)
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

// Debug log (tanpa menampilkan password)
console.log('DEBUG .env →', {
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_SSL: process.env.DB_SSL,
  DATABASE_URL_present: Boolean(process.env.DATABASE_URL),
});

function sanitizeEnvValue(value) {
  if (value == null) return '';
  const asString = String(value).trim();
  return asString.replace(/^(["'])(.*)\1$/, '$2'); // hapus tanda kutip di awal/akhir
}

const directUrl = sanitizeEnvValue(process.env.DATABASE_URL);
const user = sanitizeEnvValue(process.env.DB_USER);
const pass = sanitizeEnvValue(process.env.DB_PASSWORD);
const host = sanitizeEnvValue(process.env.DB_HOST) || 'localhost';
const port = sanitizeEnvValue(process.env.DB_PORT) || '5432';
const db = sanitizeEnvValue(process.env.DB_NAME);
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

// Bentuk DATABASE_URL bila tidak diberikan langsung via env
let databaseUrl = directUrl;
if (!databaseUrl) {
  const missing = [];
  if (!user) missing.push('DB_USER');
  if (!host) missing.push('DB_HOST');
  if (!db) missing.push('DB_NAME');

  if (missing.length === 0) {
    const authPart = pass === ''
      ? encodeURIComponent(user)
      : `${encodeURIComponent(user)}:${encodeURIComponent(pass)}`;
    databaseUrl = `postgres://${authPart}@${host}:${port}/${db}`;
    process.env.DATABASE_URL = databaseUrl; // set agar CLI juga menangkap
  }
}

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL tidak tersedia dan parameter DB_* belum lengkap. ' +
    'Lengkapi minimal DB_HOST, DB_NAME, DB_USER (DB_PASSWORD boleh kosong) atau set DATABASE_URL.'
  );
}

// Tentukan schema yang akan digunakan
const schema = sanitizeEnvValue(process.env.DB_SCHEMA) || 'public';
console.log('DEBUG schema →', schema);

module.exports = {
  databaseUrl, // untuk kompatibilitas
  db: {
    host,
    port: Number(port),
    database: db,
    user,
    password: pass,
    ssl,
  },
  migrationsTable: 'pgmigrations_user',
  migrationsDirectory: './migrations',
  schema, // ekspor schema agar node-pg-migrate membaca
};

