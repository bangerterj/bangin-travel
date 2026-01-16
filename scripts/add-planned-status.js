/**
 * Migration to add 'planned' status to items table
 */

const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔧 Starting migration to add "planned" status...');

        // Drop the old constraint and add the new one
        const query = `
            ALTER TABLE items 
            DROP CONSTRAINT IF EXISTS items_status_check,
            ADD CONSTRAINT items_status_check 
            CHECK (status IN ('idea', 'planned', 'pending', 'booked', 'dropped'));
        `;

        await pool.query(query);

        console.log('✅ Migration complete! "planned" status is now allowed.');

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
