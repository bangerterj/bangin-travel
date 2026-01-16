require('dotenv').config({ path: '.env.local' });
const { getPool } = require('./lib/db');

async function checkOrganizerStatus() {
    const pool = getPool();
    try {
        const email = 'jeffbangerter1@gmail.com';
        const userResult = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (userResult.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const user = userResult.rows[0];
        console.log('User found:', user);

        const travelers = await pool.query(`
            SELECT t.id, t.trip_id, t.display_name, t.email, t.user_id, t.is_organizer, tr.name as trip_name
            FROM travelers t
            JOIN trips tr ON t.trip_id = tr.id
            ORDER BY t.trip_id
        `);
        console.log('\n--- ALL TRAVELERS ---');
        console.table(travelers.rows);

        const myTravelers = travelers.rows.filter(t => t.email.toLowerCase() === email.toLowerCase());
        console.log('\n--- MY TRAVELER RECORDS ---');
        console.table(myTravelers);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkOrganizerStatus();
