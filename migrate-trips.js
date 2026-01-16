require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    console.log('Migrating trips table (removing passcode_hash)...\n');

    try {
        // Check if column exists
        const { rows } = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'passcode_hash'
        `);

        if (rows.length > 0) {
            console.log('Dropping passcode_hash column...');
            await pool.query('ALTER TABLE trips DROP COLUMN passcode_hash');
            console.log('Column dropped successfully.');
        } else {
            console.log('passcode_hash column does not exist. Skipping.');
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

run();
