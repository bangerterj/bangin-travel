const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { initDatabase, getPool } = require('../lib/db');
const https = require('https');
const readline = require('readline');

const AIRPORTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

function downloadAirports() {
    return new Promise((resolve, reject) => {
        https.get(AIRPORTS_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Simple CSV line parser that handles quotes
function parseLine(line) {
    const parts = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);

    // Clean quotes from numeric fields and decode others
    return parts.map(p => {
        let val = p.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        return val === '\\N' ? null : val;
    });
}

async function seed() {
    console.log('Connecting to DB...');
    // We need to access the pool directly or init schema first
    // Note: lib/db.js exports initDatabase and getPool but getPool is internal logic somewhat.
    // However, I exposed `getPool` technically via the `query` export but I also need to make sure schema exists.
    // So I will require the module. I can modify db.js to export getPool properly or just rely on initDatabase.

    // Actually, I can't easily import `getPool` if it's not exported. 
    // In db.js line 533: `module.exports = { initDatabase, ... }`
    // Wait, line 541 exports `query`. 
    // I can just use `initDatabase` to setup schema, then `query` to insert.

    const db = require('../lib/db');
    await db.initDatabase();

    console.log('Downloading airport data from OpenFlights...');
    const rawData = await downloadAirports();
    const lines = rawData.split('\n');

    console.log(`Parsing ${lines.length} airports...`);

    let count = 0;

    // Batch insert for performance
    // Since node-postgres doesn't support bulk insert efficiently without building big query strings,
    // we'll just do it in chunks.

    const client = await db.initDatabase(); // Actually initDatabase returns the db pool or client?
    // Looking at db.js: returns `db` which is the pool.

    // Clear existing
    await client.query('TRUNCATE TABLE airports RESTART IDENTITY');

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const cols = parseLine(line);
            // Cols: 0:id, 1:name, 2:city, 3:country, 4:mata/iata, 5:icao, 6:lat, 7:lon, 8:alt, 9:offset, 10:dst, 11:tz

            const name = cols[1];
            const city = cols[2];
            const country = cols[3];
            const iata = cols[4];
            const icao = cols[5];
            const lat = parseFloat(cols[6]);
            const lon = parseFloat(cols[7]);
            const tz = cols[11];

            // Filter out junk or non-airports if needed, but OpenFlights is mostly ok.
            // We care mostly about having IATA.
            if (!iata || iata.length !== 3) continue;

            const query = `
                INSERT INTO airports (name, city, country, iata, icao, latitude, longitude, timezone_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            await client.query(query, [name, city, country, iata, icao, lat, lon, tz]);
            count++;

            if (count % 500 === 0) process.stdout.write('.');
        } catch (e) {
            console.error(`Error line: ${line}`, e.message);
        }
    }

    console.log(`\nSuccessfully seeded ${count} airports.`);
    process.exit(0);
}

seed().catch(console.error);
