const { Pool } = require('pg');
require('dotenv').config();
const logger = require('./logger.js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  
  connectionTimeoutMillis: 5000,
  
  idleTimeoutMillis: 5000,
  
  max: 10
});

pool.on('error', (err) => {
    if (err.message.includes('Connection terminated')) {
        logger.warn('[DB] Neon securely closed an idle connection to save compute hours.');
    } else {
        logger.error(`[DB] Unexpected database pool error: ${err.message}`);
    }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  end: () => pool.end()
};