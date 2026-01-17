const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_hu4cMEGyvq1S@ep-super-dew-ahrwvifg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: NEON_URL });

    console.log('=== Checking Neon Database ===\n');

    // Check tables
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(x => x.table_name).join(', '));

    // Check trips
    const trips = await pool.query('SELECT id, name FROM trips LIMIT 5');
    console.log('\nTrips:');
    trips.rows.forEach(t => console.log(`  - ${t.id}: ${t.name}`));

    // Check users
    const users = await pool.query('SELECT id, email FROM users LIMIT 5');
    console.log('\nUsers:');
    users.rows.forEach(u => console.log(`  - ${u.id}: ${u.email}`));

    // Check travelers
    const travelers = await pool.query('SELECT id, trip_id, user_id, display_name FROM travelers LIMIT 5');
    console.log('\nTravelers:');
    travelers.rows.forEach(t => console.log(`  - ${t.id} (trip: ${t.trip_id}, user: ${t.user_id}): ${t.display_name}`));

    await pool.end();
    console.log('\n✅ Done');
})().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
