const { Pool } = require('pg');
const fs = require('fs');

const NEON_URL = 'postgresql://neondb_owner:npg_hu4cMEGyvq1S@ep-super-dew-ahrwvifg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
    const pool = new Pool({ connectionString: NEON_URL });

    let output = '=== Neon Database Schema ===\n\n';

    // Check tables
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    output += 'Tables: ' + tables.rows.map(x => x.table_name).join(', ') + '\n';

    // Check each table's columns
    for (const t of tables.rows) {
        const cols = await pool.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
        `, [t.table_name]);
        output += `\n${t.table_name}:\n`;
        cols.rows.forEach(c => { output += `  - ${c.column_name} (${c.data_type})\n`; });
    }

    fs.writeFileSync('neon-schema.txt', output);
    console.log('Schema written to neon-schema.txt');

    await pool.end();
})().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
