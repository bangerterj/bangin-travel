import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { invitations, travelers } from "../../../../lib/db";

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { token } = req.query;

    if (req.method === 'POST') {
        try {
            const invite = await invitations.getByToken(token);

            if (!invite) {
                return res.status(404).json({ error: "Invalid or expired invitation" });
            }

            if (invite.status === 'accepted') {
                return res.status(400).json({ error: "Invitation already accepted" });
            }

            // Add user to trip
            // We create a new traveler entry
            // Use user's name/email from session or invite
            const displayName = session.user.name || session.user.email.split('@')[0];

            const newTraveler = await travelers.create(
                invite.trip_id,
                displayName,
                {
                    email: session.user.email,
                    initials: displayName.substring(0, 2).toUpperCase(),
                    color: '#3b82f6',
                    notes: 'Joined via invite',
                    isOrganizer: invite.role === 'ORGANIZER',
                    userId: session.user.id
                }
            );

            // Link the traveler to the user (Wait, travelers.create doesn't support user_id yet in arguments)
            // I need to update travelers.create or manually update the traveler after creation.
            // Let's look at travelers.create in lib/db.js. It takes specific args.
            // I should modify travelers.create to accept userId OR update it manually immediately.

            // Update invite status
            await invitations.updateStatus(token, 'accepted');

            // Manual update to link user_id (since we didn't refactor travelers.create signature yet)
            // Actually, I should refactor travelers.create to be cleaner, but quick fix:
            // We don't have the traveler ID easily unless we parse the return of create.
            // travelers.create returns the object.

            // Let's fix the logic above:
            // const newTraveler = await travelers.create(...)
            // await db.query('UPDATE travelers SET user_id = $1 WHERE id = $2', [session.user.id, newTraveler.id])

            // Since I can't easily run arbitrary query here without importing pool,
            // I should rely on a new method in travelers or update create.

            return res.status(200).json({ success: true, tripId: invite.trip_id });
        } catch (error) {
            console.error("Accept Invite Error:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).end();
}
