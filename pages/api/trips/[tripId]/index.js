import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
const { trips, travelers, items, assignments } = require('../../../../lib/db');

export default async function handler(req, res) {
    const { tripId } = req.query;

    if (req.method === 'DELETE') {
        const session = await getServerSession(req, res, authOptions);
        if (!session) return res.status(401).json({ error: 'Unauthorized' });

        // Verify organizer permissions (check both user_id and email for robustness)
        const allTravelers = await travelers.listByTrip(tripId);
        const userTraveler = allTravelers.find(t => t.userId === session.user.id || t.email === session.user.email);

        console.log(`[DEBUG DELETE trip] Trip: ${tripId}, User: ${session.user.id}, Email: ${session.user.email}`);
        console.log(`[DEBUG DELETE trip] User traveler found:`, userTraveler ? { id: userTraveler.id, isOrganizer: userTraveler.isOrganizer, userId: userTraveler.userId } : 'None');

        if (!userTraveler || !userTraveler.isOrganizer) {
            return res.status(403).json({ error: 'Only organizers can delete trips' });
        }

        await trips.delete(tripId);
        return res.status(200).json({ message: 'Trip deleted successfully' });
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify trip membership
    const isMember = await travelers.isMember(tripId, session.user.id);
    if (!isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this trip' });
    }

    try {
        // Get trip
        const trip = await trips.getById(tripId);
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        // Get travelers
        const tripTravelers = await travelers.listByTrip(tripId);

        // Get all items with assignments
        const tripItems = await items.listByTrip(tripId);

        // Get assignments for each item
        const itemsWithAssignments = await Promise.all(
            tripItems.map(async (item) => {
                const itemAssignments = await assignments.getByItem(item.id);
                return {
                    ...item,
                    travelers: itemAssignments.map(a => a.travelerId)
                };
            })
        );

        // Group items by type for frontend compatibility
        const flights = itemsWithAssignments.filter(i => i.type === 'flight');
        const stays = itemsWithAssignments.filter(i => i.type === 'stay');
        const transit = itemsWithAssignments.filter(i => i.type === 'transit');
        const activities = itemsWithAssignments.filter(i => i.type === 'activity');

        return res.status(200).json({
            id: trip.id,
            name: trip.name,
            destination: trip.destination,
            startDate: trip.start_date,
            endDate: trip.end_date,
            timezone: trip.timezone,
            coverImage: trip.cover_image,
            travelers: tripTravelers,
            flights,
            stays,
            transit,
            activities
        });
    } catch (error) {
        console.error('Get trip error:', error);
        return res.status(500).json({ error: 'Failed to get trip' });
    }
};
