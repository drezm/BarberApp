console.log('> DEBUG DATABASE_URL:', process.env.DATABASE_URL);

// backend/config/database.js

// Если вы хотите локально тестировать через .env, оставьте dotenv; 
// в продакшне он не нужен, но не мешает, если нет .env на Render.
require('dotenv').config();

const { Pool } = require('pg');

// Выходим, если переменной нет
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

// Подключаемся единственным URI и отключаем валидацию сертификата, 
// чтобы принять самоподписанные цепочки Supavisor
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', err => console.error('[DB] pool error:', err));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
