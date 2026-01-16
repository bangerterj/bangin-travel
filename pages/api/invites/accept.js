import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { invitations, trips, travelers } from "../../../lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.body;

    try {
        let tripId;
        let role = 'CONTRIBUTOR';

        // 1. Handle Invitation Token
        if (!id.startsWith('trip-')) {
            const invite = await invitations.getByToken(id);
            if (!invite) return res.status(404).json({ message: 'Invalid or expired invitation' });

            tripId = invite.trip_id;
            role = invite.role;

            // Mark invite as accepted
            await invitations.updateStatus(id, 'accepted');
        } else {
            // 2. Handle Public Share Link (no passcode required per user request)
            const trip = await trips.getById(id);
            if (!trip) return res.status(404).json({ message: 'Trip not found' });

            tripId = id;
        }

        // Link user to trip (create traveler record linked to user_id)
        // Check if already a traveler
        const existing = await travelers.listByTrip(tripId);
        const alreadyIn = existing.find(t => t.userId === session.user.id || t.email === session.user.email);

        if (alreadyIn) {
            // Update existing traveler record with userId if missing
            if (!alreadyIn.userId) {
                await travelers.update(alreadyIn.id, { userId: session.user.id });
            }
        } else {
            // Create new traveler record
            await travelers.create(
                tripId,
                session.user.name || session.user.email.split('@')[0],
                {
                    email: session.user.email,
                    color: '#3498db',
                    isOrganizer: false,
                    userId: session.user.id
                }
            );
        }

        return res.status(200).json({ message: 'Joined trip successfully' });
    } catch (error) {
        console.error('Accept invite error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
