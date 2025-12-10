const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const envProdPath = path.resolve(__dirname, '../.env.production');
const envDefaultPath = path.resolve(__dirname, '../.env');
const envPath = process.env.NODE_ENV === 'production' && fs.existsSync(envProdPath)
  ? envProdPath
  : (fs.existsSync(envDefaultPath) ? envDefaultPath : envProdPath);
dotenv.config({ path: envPath });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,          // ← IMPORTANT
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
