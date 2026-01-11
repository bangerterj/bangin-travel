/**
 * API Route: /api/trips/[tripId]
 * GET - Get full trip data (token-gated)
 */

const { trips, travelers, items, assignments } = require('../../../../lib/db');
const { verifyToken, extractToken } = require('../../../../lib/auth');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tripId } = req.query;

    // Verify token
    const token = extractToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const tokenData = verifyToken(token);
    if (!tokenData.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (tokenData.tripId !== tripId) {
        return res.status(403).json({ error: 'Token does not match trip' });
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
