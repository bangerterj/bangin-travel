require('dotenv').config({ path: '.env.local' });
const { getPool } = require('./lib/db');

async function checkUser() {
    const pool = getPool();
    try {
        const email = 'test_prod_check@example.com'; // Update if different
        const result = await pool.query(
            'SELECT id, email, name, password_hash FROM users WHERE email ILIKE $1',
            [email]
        );

        console.log('\n--- USER LOOKUP ---');
        console.log('Email searched:', email);
        console.log('Found:', result.rows.length > 0);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('\nUser details:');
            console.log('  ID:', user.id);
            console.log('  Email:', user.email);
            console.log('  Name:', user.name);
            console.log('  Has password:', !!user.password_hash);
            console.log('  Password hash (first 20 chars):', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'null');
        } else {
            console.log('\nUser NOT found in database');
            console.log('\nAll users in database:');
            const allUsers = await pool.query('SELECT email, name FROM users');
            console.log('All Users:', allUsers.rows.map(u => u.email));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
