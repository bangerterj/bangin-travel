import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
const { trips, travelers } = require('../../../../lib/db');

export default async function handler(req, res) {
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
        res.setHeader('Allow', ['PUT', 'PATCH']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tripId } = req.query;
    const { name, destination, startDate, endDate, timezone, isArchived } = req.body;

    // Check if trip exists
    const trip = await trips.getById(tripId);
    if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
    }

    // Check permissions (must be Organizer)
    const allTravelers = await travelers.listByTrip(tripId);
    const userTraveler = allTravelers.find(t => t.userId === session.user.id || t.email === session.user.email);

    console.log(`[DEBUG update.js] Trip: ${tripId}, User: ${session.user.id}, Email: ${session.user.email}`);
    console.log(`[DEBUG update.js] User traveler found:`, userTraveler ? { id: userTraveler.id, isOrganizer: userTraveler.isOrganizer, userId: userTraveler.userId } : 'None');

    if (!userTraveler || !userTraveler.isOrganizer) {
        return res.status(403).json({ error: 'Only organizers can edit trip details' });
    }

    try {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (destination !== undefined) updates.destination = destination;
        if (startDate !== undefined) updates.startDate = startDate;
        if (endDate !== undefined) updates.endDate = endDate;
        if (timezone !== undefined) updates.timezone = timezone;
        if (isArchived !== undefined) updates.isArchived = isArchived;

        const updatedTrip = await trips.update(tripId, updates);
        return res.status(200).json(updatedTrip);
    } catch (error) {
        console.error('Update trip error:', error);
        return res.status(500).json({ error: 'Failed to update trip' });
    }
}
