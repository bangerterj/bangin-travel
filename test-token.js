require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    console.log('=== Checking verification_token table ===\n');

    // Check if table exists
    const { rows: tables } = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE '%verification%'
    `);
    console.log('Verification tables found:', tables.map(r => r.table_name));

    // Check columns
    for (const t of tables) {
        const { rows: cols } = await pool.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = $1
        `, [t.table_name]);
        console.log(`\nColumns in ${t.table_name}:`, cols);
    }

    // Try to insert a test token
    console.log('\n=== Testing token insertion ===');
    try {
        await pool.query(`
            INSERT INTO verification_token (identifier, token, expires) 
            VALUES ('test@test.com', 'test-token-123', NOW() + INTERVAL '1 hour')
            ON CONFLICT (identifier, token) DO NOTHING
        `);
        console.log('✓ Token insert succeeded');

        // Check if it's there
        const { rows } = await pool.query('SELECT * FROM verification_token');
        console.log('Tokens in table:', rows);

        // Clean up
        await pool.query(`DELETE FROM verification_token WHERE identifier = 'test@test.com'`);
        console.log('✓ Cleanup done');
    } catch (e) {
        console.error('✗ Token insert failed:', e.message);
    }

    await pool.end();
}

run().catch(console.error);
