require('dotenv').config({ path: '.env.local' });
const { getPool } = require('./lib/db');

async function reconnectTrips() {
    const pool = getPool();

    const email = 'jeffbangerter1@gmail.com';

    try {
        // Get the user
        const userResult = await pool.query(
            'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = userResult.rows[0];
        console.log('Found user:', user);

        // Find travelers with matching email but no user_id
        const travelersResult = await pool.query(
            'SELECT id, trip_id, display_name, email, is_organizer FROM travelers WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        console.log(`\nFound ${travelersResult.rows.length} traveler record(s) with this email:`);
        console.table(travelersResult.rows);

        if (travelersResult.rows.length === 0) {
            console.log('\n⚠️  No traveler records found with this email.');
            console.log('This means either:');
            console.log('1. The trips were created with a different email');
            console.log('2. The trips are in localStorage only (not in database)');

            // Show all travelers to help debug
            const allTravelers = await pool.query(
                'SELECT id, trip_id, display_name, email FROM travelers ORDER BY trip_id'
            );
            console.log('\nAll travelers in database:');
            console.table(allTravelers.rows);
            return;
        }

        // Update travelers to link to this user_id
        for (const traveler of travelersResult.rows) {
            await pool.query(
                'UPDATE travelers SET user_id = $1 WHERE id = $2',
                [user.id, traveler.id]
            );
            console.log(`✅ Linked traveler ${traveler.id} (${traveler.display_name}) to user`);
        }

        // Get trip details
        const tripIds = [...new Set(travelersResult.rows.map(t => t.trip_id))];
        const tripsResult = await pool.query(
            'SELECT id, name, destination FROM trips WHERE id = ANY($1)',
            [tripIds]
        );

        console.log('\n✅ Successfully reconnected to trips:');
        console.table(tripsResult.rows);

        console.log('\n🎉 You should now see your trips when you refresh the page!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

reconnectTrips();
