// Script to set up Neon database tables for staging/production
// Run with: node setup-neon-db.js
const { Pool } = require('pg');

// Neon database connection string from Vercel
const NEON_URL = process.env.NEON_URL || 'postgresql://neondb_owner:npg_hu4cMEGyvq1S@ep-super-dew-ahrwvifg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
    console.log('Connecting to Neon database...');
    const pool = new Pool({ connectionString: NEON_URL });

    console.log('Checking current tables...\n');

    // Check current tables
    const { rows: tables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Current tables:', tables.length ? tables.map(r => r.table_name).join(', ') : '(none)');

    // Create auth tables
    console.log('\n--- Creating Auth Tables ---\n');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            "emailVerified" TIMESTAMP WITH TIME ZONE,
            image TEXT,
            password_hash TEXT
        )
    `);
    console.log('  ✓ Created users');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS accounts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            provider TEXT NOT NULL,
            "providerAccountId" TEXT NOT NULL,
            refresh_token TEXT,
            access_token TEXT,
            expires_at BIGINT,
            token_type TEXT,
            scope TEXT,
            id_token TEXT,
            session_state TEXT,
            UNIQUE(provider, "providerAccountId")
        )
    `);
    console.log('  ✓ Created accounts');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            "sessionToken" TEXT UNIQUE NOT NULL,
            "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `);
    console.log('  ✓ Created sessions');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_tokens (
            identifier TEXT NOT NULL,
            token TEXT NOT NULL,
            expires TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (identifier, token)
        )
    `);
    console.log('  ✓ Created verification_tokens');

    // Create app tables
    console.log('\n--- Creating App Tables ---\n');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS trips (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
            location TEXT,
            description TEXT
        )
    `);
    console.log('  ✓ Created trips');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS trip_members (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'viewer',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(trip_id, user_id)
        )
    `);
    console.log('  ✓ Created trip_members');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS invites (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'viewer',
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE,
            accepted_at TIMESTAMP WITH TIME ZONE
        )
    `);
    console.log('  ✓ Created invites');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS flights (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            airline TEXT,
            flight_number TEXT,
            departure_airport TEXT,
            arrival_airport TEXT,
            departure_time TIMESTAMP WITH TIME ZONE,
            arrival_time TIMESTAMP WITH TIME ZONE,
            confirmation_number TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            departure_coords JSONB,
            arrival_coords JSONB
        )
    `);
    console.log('  ✓ Created flights');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS stays (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            name TEXT,
            address TEXT,
            check_in TIMESTAMP WITH TIME ZONE,
            check_out TIMESTAMP WITH TIME ZONE,
            confirmation_number TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            coords JSONB
        )
    `);
    console.log('  ✓ Created stays');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS transit (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            type TEXT,
            description TEXT,
            departure_location TEXT,
            arrival_location TEXT,
            departure_time TIMESTAMP WITH TIME ZONE,
            arrival_time TIMESTAMP WITH TIME ZONE,
            confirmation_number TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            departure_coords JSONB,
            arrival_coords JSONB
        )
    `);
    console.log('  ✓ Created transit');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS activities (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            name TEXT,
            location TEXT,
            start_at TIMESTAMP WITH TIME ZONE,
            end_at TIMESTAMP WITH TIME ZONE,
            confirmation_number TEXT,
            notes TEXT,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            coords JSONB
        )
    `);
    console.log('  ✓ Created activities');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS travelers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✓ Created travelers');

    // Verify
    const { rows: newTables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('\n--- Final Tables ---');
    console.log(newTables.map(r => r.table_name).join(', '));

    await pool.end();
    console.log('\n✅ Done! All tables created successfully.');
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
