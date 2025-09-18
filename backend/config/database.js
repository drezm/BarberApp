const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'barbershop_booking',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Проверка подключения к базе данных
pool.on('connect', () => {
  console.log('Подключено к базе данных PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Ошибка подключения к базе данных:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
