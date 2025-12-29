const { Pool } = require('pg');
require('dotenv').config(); // pra funcionar local com .env

let pool;

// Produção (Render / Cloud Run) -> usa DATABASE_URL
if (process.env.DATABASE_URL) {
  console.log('▶ Usando DATABASE_URL para conectar no PostgreSQL');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Render e similares pedem SSL
    },
  });
} else {
  // Desenvolvimento local -> usa seu Postgres local
  console.log('▶ Usando configuração LOCAL de banco (DB_HOST, DB_NAME, etc.)');

  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  query,
  getClient,
  pool,
};
