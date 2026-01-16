require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const run = async () => {
    console.log("Testing DB Connection...");
    const connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error("❌ POSTGRES_URL is missing from .env.local");
        return;
    }

    // Mask the password for log safety
    console.log("URL found:", connectionString.replace(/:([^:@]+)@/, ':****@'));

    const pool = new Pool({
        connectionString,
        // Try enabling SSL even in dev for Cloud DBs (Vercel/Neon often need it)
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log("✅ Successfully connected to Database!");
        const res = await client.query('SELECT NOW()');
        console.log("Time from DB:", res.rows[0].now);
        client.release();
    } catch (err) {
        console.error("❌ Connection Failed:", err);
    } finally {
        await pool.end();
    }
};

run();
