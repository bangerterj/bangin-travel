import { invitations, trips } from "../../../lib/db";

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) return res.status(400).json({ message: 'Missing ID' });

    try {
        // 1. Check if it's an invitation token
        if (!id.startsWith('trip-')) {
            const invite = await invitations.getByToken(id);
            if (invite) {
                const trip = await trips.getById(invite.trip_id);
                return res.status(200).json({
                    type: 'invite',
                    trip: { name: trip.name, destination: trip.destination }
                });
            }
        }

        // 2. Check if it's a trip ID (Public Share Link)
        const trip = await trips.getById(id);
        if (trip) {
            return res.status(200).json({
                type: 'share',
                trip: { name: trip.name, destination: trip.destination }
            });
        }

        return res.status(404).json({ message: 'Invalid join link' });
    } catch (error) {
        console.error('Verify join error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
