const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });


const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306'),
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'mis_hits',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT  || '25'),
  queueLimit:      parseInt(process.env.DB_QUEUE_LIMIT || '100'),
  connectTimeout:  10000,
  timezone:        '+05:30',
  // Keep idle connections alive to avoid reconnect overhead
  enableKeepAlive:    true,
  keepAliveInitialDelay: 30000,
});

pool.getConnection()
  .then(conn => { console.log('✅ MySQL connected'); conn.release(); })
  .catch(err => { console.error('❌ MySQL error:', err.message); });

module.exports = pool;
