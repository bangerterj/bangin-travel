import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Don't allow registration if already logged in
    const session = await getServerSession(req, res, authOptions);
    if (session) {
        return res.status(400).json({ message: 'Already logged in' });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        // Dynamic import to avoid issues with module loading
        const db = require('../../../lib/db');
        const pool = db.getPool();

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email.toLowerCase(), name, hashedPassword]
        );

        const user = result.rows[0];

        return res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Internal server error: ' + error.message });
    }
}
