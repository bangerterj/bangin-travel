/**
 * Auth Diagnostic Script
 * Usage: node debug-auth.js
 * Checks database, tables, env vars, and recent tokens.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const log = (status, msg) => {
    const icon = status === 'ok' ? `${GREEN}✓${RESET}` : status === 'warn' ? `${YELLOW}⚠${RESET}` : `${RED}✗${RESET}`;
    console.log(`${icon} ${msg}`);
};

async function run() {
    console.log('\n🔍 Auth Diagnostic Report\n' + '='.repeat(40) + '\n');

    // 1. Check Environment Variables
    console.log('📋 Environment Variables:');
    const requiredEnvs = ['POSTGRES_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'RESEND_API_KEY'];
    for (const key of requiredEnvs) {
        if (process.env[key]) {
            const masked = key.includes('SECRET') || key.includes('KEY')
                ? process.env[key].substring(0, 10) + '...'
                : process.env[key];
            log('ok', `${key} = ${masked}`);
        } else {
            log('fail', `${key} is MISSING`);
        }
    }

    // 2. Check Database Connection
    console.log('\n📦 Database Connection:');
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: false,
    });

    try {
        const client = await pool.connect();
        log('ok', 'Connected to database');
        client.release();
    } catch (e) {
        log('fail', `Connection failed: ${e.message}`);
        await pool.end();
        return;
    }

    // 3. Check Required Tables
    console.log('\n📊 Required Tables:');
    const requiredTables = ['users', 'accounts', 'sessions', 'verification_tokens', 'trips', 'travelers', 'invitations'];
    const { rows: existingTables } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tableNames = existingTables.map(r => r.table_name);

    for (const table of requiredTables) {
        if (tableNames.includes(table)) {
            log('ok', `Table "${table}" exists`);
        } else {
            log('fail', `Table "${table}" is MISSING`);
        }
    }

    // 4. Check verification_token entries
    console.log('\n🔑 Verification Tokens (last 5):');
    try {
        const { rows: tokens } = await pool.query(
            'SELECT identifier, expires, token FROM verification_tokens ORDER BY expires DESC LIMIT 5'
        );
        if (tokens.length === 0) {
            log('warn', 'No tokens found (this is normal if no login attempts yet)');
        } else {
            for (const t of tokens) {
                const isExpired = new Date(t.expires) < new Date();
                const status = isExpired ? 'expired' : 'valid';
                log(isExpired ? 'warn' : 'ok', `${t.identifier} - ${status} (expires: ${t.expires})`);
            }
        }
    } catch (e) {
        log('fail', `Error querying tokens: ${e.message}`);
    }

    // 5. Check User table
    console.log('\n👤 Users (last 5):');
    try {
        const { rows: users } = await pool.query(
            'SELECT id, email, "emailVerified" FROM users ORDER BY id DESC LIMIT 5'
        );
        if (users.length === 0) {
            log('warn', 'No users found');
        } else {
            for (const u of users) {
                log('ok', `${u.email} (verified: ${u.emailVerified ? 'yes' : 'no'})`);
            }
        }
    } catch (e) {
        log('fail', `Error querying users: ${e.message}`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(40));
    console.log('💡 If verification_token is missing, run: node seed.js');
    console.log('💡 If tokens expire immediately, check NEXTAUTH_URL matches your browser URL.');
    console.log('💡 If emails fail, check RESEND_API_KEY is correct.\n');

    await pool.end();
}

run().catch(console.error);
