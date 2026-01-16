import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";
import { users } from "../../../lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await users.setPassword(session.user.id, passwordHash);

        return res.status(200).json({ message: 'Password set successfully' });
    } catch (error) {
        console.error('Set password error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
