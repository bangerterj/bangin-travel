const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_hu4cMEGyvq1S@ep-super-dew-ahrwvifg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: NEON_URL });

    console.log('=== REBUILDING Neon Database with Correct Schema ===\n');
    console.log('WARNING: This will DROP and recreate tables (except users/accounts/sessions/verification_tokens)\n');

    // Drop the incorrectly-structured tables (NOT auth tables)
    console.log('Dropping old tables...');
    const tablesToDrop = ['item_travelers', 'items', 'invitations', 'travelers', 'flights', 'stays', 'transit', 'activities', 'trip_members', 'invites', 'trips', 'airports'];

    for (const table of tablesToDrop) {
        try {
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`  Dropped ${table}`);
        } catch (e) {
            console.log(`  Failed to drop ${table}: ${e.message}`);
        }
    }

    // Create tables with the CORRECT schema from lib/db.js
    console.log('\nCreating tables with correct schema...\n');

    // Trips table (TEXT id, not UUID)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            destination TEXT,
            start_date TEXT,
            end_date TEXT,
            timezone TEXT DEFAULT 'UTC',
            location JSONB,
            cover_image TEXT,
            is_archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✓ Created trips');

    // Travelers table (TEXT id, display_name column)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS travelers (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            display_name TEXT NOT NULL,
            email TEXT,
            initials TEXT,
            color TEXT,
            notes TEXT,
            is_organizer BOOLEAN DEFAULT FALSE,
            user_id TEXT,
            couple_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_travelers_trip ON travelers(trip_id)`);
    console.log('✓ Created travelers');

    // Unified Items table (TEXT id)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('flight', 'transit', 'stay', 'activity')),
            status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'planned', 'pending', 'booked', 'dropped')),
            title TEXT NOT NULL,
            notes TEXT,
            link_url TEXT,
            start_at TEXT,
            end_at TEXT,
            metadata JSONB,
            paid_by TEXT REFERENCES travelers(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_trip ON items(trip_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(trip_id, type)`);
    console.log('✓ Created items');

    // Item-Traveler assignments
    await pool.query(`
        CREATE TABLE IF NOT EXISTS item_travelers (
            item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            traveler_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
            role TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (item_id, traveler_id)
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_travelers_item ON item_travelers(item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_travelers_traveler ON item_travelers(traveler_id)`);
    console.log('✓ Created item_travelers');

    // Invitations
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invitations_trip ON invitations(trip_id)`);
    console.log('✓ Created invitations');

    // Airports
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_airports_search ON airports(name, city, iata)`);
    console.log('✓ Created airports');

    // Verify
    console.log('\n=== Verification ===');
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(x => x.table_name).join(', '));

    await pool.end();
    console.log('\n✅ Database schema rebuilt successfully!');
    console.log('\nNext step: Create a new trip on staging to test.');
})().catch(e => {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
});
