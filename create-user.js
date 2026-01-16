require('dotenv').config({ path: '.env.local' });
const { getPool } = require('./lib/db');
const bcrypt = require('bcryptjs');

async function createUser() {
    const pool = getPool();

    const email = 'jeffbangerter1@gmail.com';
    const name = 'Jeff Bangerter';
    const password = 'password'; // Change this to your desired password

    try {
        // Check if user exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (existing.rows.length > 0) {
            console.log('User already exists!');
            console.log('User ID:', existing.rows[0].id);

            // Update password
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET password_hash = $1, name = $2 WHERE id = $3',
                [hashedPassword, name, existing.rows[0].id]
            );
            console.log('✅ Password updated successfully!');
        } else {
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
                [email.toLowerCase(), name, hashedPassword]
            );

            console.log('✅ User created successfully!');
            console.log('User details:', result.rows[0]);
        }

        console.log('\nYou can now log in with:');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

createUser();
