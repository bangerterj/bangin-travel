/**
 * Backfill script to link travelers to user accounts
 * This fixes permission issues where travelers don't have user_id set
 */

const { Pool } = require('pg');

async function backfillTravelers() {
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔧 Starting traveler backfill...');

        // Find all travelers without user_id but with email
        const query = `
            UPDATE travelers t
            SET user_id = u.id
            FROM users u
            WHERE t.user_id IS NULL 
            AND t.email IS NOT NULL
            AND t.email = u.email
            RETURNING t.id, t.display_name, t.email, t.user_id
        `;

        const result = await pool.query(query);

        console.log(`✅ Updated ${result.rowCount} traveler records`);

        if (result.rows.length > 0) {
            console.log('\nUpdated travelers:');
            result.rows.forEach(row => {
                console.log(`  - ${row.display_name} (${row.email}) -> user_id: ${row.user_id}`);
            });
        }

        // Show summary
        const summaryQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(user_id) as with_user_id,
                COUNT(*) - COUNT(user_id) as without_user_id
            FROM travelers
        `;

        const summary = await pool.query(summaryQuery);
        const stats = summary.rows[0];

        console.log('\n📊 Traveler Summary:');
        console.log(`  Total travelers: ${stats.total}`);
        console.log(`  With user_id: ${stats.with_user_id}`);
        console.log(`  Without user_id: ${stats.without_user_id}`);

        if (parseInt(stats.without_user_id) > 0) {
            console.log('\n⚠️  Some travelers still lack user_id (likely no matching user account)');
        }

        console.log('\n✨ Backfill complete!');

    } catch (error) {
        console.error('❌ Backfill failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

backfillTravelers().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
