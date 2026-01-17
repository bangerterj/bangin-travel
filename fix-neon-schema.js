const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_hu4cMEGyvq1S@ep-super-dew-ahrwvifg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: NEON_URL });

    console.log('=== Fixing Neon Database Schema ===\n');

    // Add missing columns to travelers table
    console.log('Adding missing columns to travelers...');
    try {
        await pool.query(`ALTER TABLE travelers ADD COLUMN IF NOT EXISTS user_id TEXT`);
        console.log('  ✓ Added user_id column');
    } catch (e) {
        console.log('  - user_id:', e.message);
    }

    try {
        await pool.query(`ALTER TABLE travelers ADD COLUMN IF NOT EXISTS couple_id TEXT`);
        console.log('  ✓ Added couple_id column');
    } catch (e) {
        console.log('  - couple_id:', e.message);
    }

    try {
        await pool.query(`ALTER TABLE travelers ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT FALSE`);
        console.log('  ✓ Added is_organizer column');
    } catch (e) {
        console.log('  - is_organizer:', e.message);
    }

    // Add missing columns to items table
    console.log('\nAdding missing columns to items...');
    try {
        await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS paid_by TEXT`);
        console.log('  ✓ Added paid_by column');
    } catch (e) {
        console.log('  - paid_by:', e.message);
    }

    // Add missing columns to trips table
    console.log('\nAdding missing columns to trips...');
    try {
        await pool.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE`);
        console.log('  ✓ Added is_archived column');
    } catch (e) {
        console.log('  - is_archived:', e.message);
    }

    try {
        await pool.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS location JSONB`);
        console.log('  ✓ Added location column');
    } catch (e) {
        console.log('  - location:', e.message);
    }

    // Create item_travelers table if missing
    console.log('\nCreating item_travelers table if missing...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS item_travelers (
                item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                traveler_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
                role TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (item_id, traveler_id)
            )
        `);
        console.log('  ✓ item_travelers table ready');
    } catch (e) {
        console.log('  - item_travelers:', e.message);
    }

    // Create invitations table if missing
    console.log('\nCreating invitations table if missing...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invitations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                email TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'CONTRIBUTOR',
                status TEXT DEFAULT 'pending',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ invitations table ready');
    } catch (e) {
        console.log('  - invitations:', e.message);
    }

    // Create airports table if missing
    console.log('\nCreating airports table if missing...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS airports (
                id SERIAL PRIMARY KEY,
                name TEXT,
                city TEXT,
                country TEXT,
                iata TEXT,
                icao TEXT,
                latitude FLOAT,
                longitude FLOAT,
                timezone_id TEXT
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata)`);
        console.log('  ✓ airports table ready');
    } catch (e) {
        console.log('  - airports:', e.message);
    }

    // Verify the tables
    console.log('\n=== Verification ===\n');
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(x => x.table_name).join(', '));

    // Check travelers columns
    const cols = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'travelers' AND table_schema = 'public'
    `);
    console.log('\nTravelers columns:', cols.rows.map(x => x.column_name).join(', '));

    await pool.end();
    console.log('\n✅ Schema fix complete!');
})().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
