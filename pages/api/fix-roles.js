import { query } from "../../lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.email !== 'jeffbangerter1@gmail.com') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const result = await query(
            "UPDATE travelers SET is_organizer = TRUE WHERE is_organizer = FALSE AND (display_name ILIKE $1 OR email = $2)",
            ['%jeffbangerter%', session.user.email]
        );
        return res.status(200).json({ message: `Fixed ${result.rowCount} traveler records.` });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
