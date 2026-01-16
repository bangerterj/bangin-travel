import db from "../../../lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Name is required' });
    }

    try {
        await db.query(
            "UPDATE users SET name = $1 WHERE id = $2",
            [name.trim(), session.user.id]
        );

        // Synchronize name to travelers table
        await db.query(
            "UPDATE travelers SET display_name = $1 WHERE user_id = $2",
            [name.trim(), session.user.id]
        );

        return res.status(200).json({ message: 'Profile updated' });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ message: 'Failed to update profile' });
    }
}
