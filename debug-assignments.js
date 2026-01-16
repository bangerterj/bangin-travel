const { getPool } = require('./lib/db');

async function checkAssignments() {
    const pool = getPool();
    try {
        const items = await pool.query('SELECT id, title, type FROM items');
        console.log('--- ITEMS ---');
        console.table(items.rows);

        const travelers = await pool.query('SELECT id, display_name FROM travelers');
        console.log('\n--- TRAVELERS ---');
        console.table(travelers.rows);

        const assignments = await pool.query('SELECT * FROM item_travelers');
        console.log('\n--- ASSIGNMENTS ---');
        console.table(assignments.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkAssignments();
