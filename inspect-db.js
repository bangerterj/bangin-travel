require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

async function run() {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    let report = '';

    report += '\n=== User Table Columns ===\n';
    const userCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user'`);
    report += JSON.stringify(userCols.rows, null, 2) + '\n';

    report += '\n=== Verification Token Columns ===\n';
    const vtCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'verification_token'`);
    report += JSON.stringify(vtCols.rows, null, 2) + '\n';

    report += '\n=== Recent Verification Tokens ===\n';
    const tokens = await pool.query('SELECT * FROM verification_token LIMIT 5');
    report += JSON.stringify(tokens.rows, null, 2) + '\n';

    report += '\n=== All Tables ===\n';
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    report += tables.rows.map(r => r.table_name).join(', ') + '\n';

    await pool.end();

    fs.writeFileSync('db-report.txt', report);
    console.log('Report written to db-report.txt');
}

run().catch(e => { console.error(e); process.exit(1); });
