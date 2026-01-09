const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkTables() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        const tables = res.rows.map(r => r.table_name);
        console.log('Existing tables:');
        tables.forEach(t => console.log(` - ${t}`));

        if (tables.includes('folders') && tables.includes('files')) {
            console.log('✅ Drive tables exist.');
        } else {
            console.log('❌ Drive tables MISSING!');
        }
        pool.end();
    } catch (error) {
        console.error('Database connection error:', error);
        pool.end();
    }
}

checkTables();
