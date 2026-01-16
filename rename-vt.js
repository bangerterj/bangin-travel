require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    console.log('Renaming verification_tokens to verification_token...');
    await pool.query('ALTER TABLE IF EXISTS verification_tokens RENAME TO verification_token');

    const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Tables now:', rows.map(r => r.table_name).join(', '));

    await pool.end();
}

run().catch(console.error);
