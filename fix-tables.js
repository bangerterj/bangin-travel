require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    console.log('Checking and fixing auth tables...\n');

    // Check current tables
    const { rows: tables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Current tables:', tables.map(r => r.table_name).join(', '));

    // Drop old singular tables if they exist
    console.log('\nDropping old tables...');
    const oldTables = ['user', 'account', 'session', 'verification_token', 'users', 'accounts', 'sessions', 'verification_tokens'];
    for (const t of oldTables) {
        try {
            await pool.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
            console.log(`  Dropped ${t}`);
        } catch (e) { }
    }

    // Create fresh tables with EXACT column names required by @auth/pg-adapter
    console.log('\nCreating fresh auth tables...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            "emailVerified" TIMESTAMP WITH TIME ZONE,
            image TEXT
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

    // Verify
    const { rows: newTables } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('\nFinal tables:', newTables.map(r => r.table_name).join(', '));

    await pool.end();
    console.log('\n✅ Done! Restart your server now.');
}

run().catch(console.error);
