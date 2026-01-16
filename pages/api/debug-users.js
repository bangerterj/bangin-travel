import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
const { getPool } = require('../../lib/db');

export default async function handler(req, res) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({ error: 'Not found' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT id, email, name, password_hash IS NOT NULL as has_password FROM users ORDER BY email'
        );

        return res.status(200).json({
            users: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('List users error:', error);
        return res.status(500).json({ error: 'Failed to list users' });
    }
}
