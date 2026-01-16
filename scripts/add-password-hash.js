/**
 * Migration to add password_hash column to users table
 */

const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔧 Adding password_hash column to users table...');

        // Check if column already exists
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='password_hash';
        `;

        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✅ Column already exists, skipping migration');
            return;
        }

        // Add the column
        const alterQuery = `
            ALTER TABLE users 
            ADD COLUMN password_hash TEXT;
        `;

        await pool.query(alterQuery);

        console.log('✅ Migration complete! password_hash column added to users table.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
