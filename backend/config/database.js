// backend/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // postgresql://... from Supabase
  // Если в URI нет sslmode=require, раскомментируйте:
  // ssl: { rejectUnauthorized: false }
});

module.exports = pool;
