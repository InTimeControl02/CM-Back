require('dotenv').config();
const mysql = require('mysql2/promise');

// Sin DB por defecto — usamos nombres de DB completos en las queries
// ej: db07_const_cm.tblcableschedule
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
