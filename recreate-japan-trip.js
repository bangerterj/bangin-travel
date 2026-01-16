const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createJapanTrip() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    try {
        // Generate unique IDs
        const tripId = 'trip-japan2026-' + Date.now().toString(36);
        const travelerId = 't-japan-' + Date.now().toString(36);

        // Get the user ID 
        const userResult = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER('jeffbangerter1@gmail.com')");
        if (userResult.rows.length === 0) {
            console.log('User not found!');
            return;
        }
        const userId = userResult.rows[0].id;
        console.log('Found user:', userId);

        // Create the Japan 2026 trip
        await pool.query(`
            INSERT INTO trips (id, name, destination, start_date, end_date, timezone, is_archived)
            VALUES ($1, 'Japan 2026', 'Japan', '2026-03-15', '2026-03-30', 'Asia/Tokyo', false)
        `, [tripId]);
        console.log('Created trip:', tripId);

        // Create the organizer traveler
        await pool.query(`
            INSERT INTO travelers (id, trip_id, display_name, email, initials, color, is_organizer, user_id)
            VALUES ($1, $2, 'Jeff Bangerter', 'jeffbangerter1@gmail.com', 'JB', '#e74c3c', true, $3)
        `, [travelerId, tripId, userId]);
        console.log('Created organizer traveler:', travelerId);

        console.log('✅ Japan 2026 trip recreated successfully!');
    } finally {
        await pool.end();
    }
}

createJapanTrip().catch(console.error);
