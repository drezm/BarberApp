// backend/config/database.js

// **В начале** файла до любых импортов pg
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DB_URL) {
  console.error('DB_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => console.error('[DB] pool error:', err));

module.exports = {
  pool,
  query: (t, p) => pool.query(t, p),
};

