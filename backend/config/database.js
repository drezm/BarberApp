// backend/config/database.js
require('dotenv').config();
console.log('> DEBUG: DATABASE_URL=', process.env.DATABASE_URL);

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = { pool, query: (t,p) => pool.query(t,p) };
