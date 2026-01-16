
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const res = await pool.query(`
        SELECT id, type, title, start_at, end_at, metadata 
        FROM items 
        WHERE type = 'flight' 
        ORDER BY updated_at DESC 
        LIMIT 1
    `);

    console.log('Most recently updated flight:');
    console.log(JSON.stringify(res.rows[0], null, 2));
    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
