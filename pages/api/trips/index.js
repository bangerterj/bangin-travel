import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
const { trips, travelers, items, assignments } = require('../../../lib/db');
const { hashPasscode, generateToken, getTokenExpiry } = require('../../../lib/auth');

export default async function handler(req, res) {
    const session = await getServerSession(req, res, authOptions);

    try {
        if (req.method === 'POST') {
            if (!session) return res.status(401).json({ error: 'Unauthorized' });
            return await createTrip(req, res, session);
        }

        if (req.method === 'GET') {
            if (!session) return res.status(200).json({ trips: [] });
            return await listTrips(req, res, session);
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
};

async function createTrip(req, res, session) {
    try {
        const { name, destination, startDate, endDate, timezone } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Trip name is required' });
        }

        const trip = await trips.create(
            name.trim(),
            destination || '',
            startDate || '',
            endDate || '',
            timezone || 'UTC'
        );

        // Also create an ORGANIZER traveler for the creator
        const organizer = await travelers.create(
            trip.id,
            session.user.name || session.user.email.split('@')[0],
            {
                email: session.user.email,
                initials: (session.user.name || 'U').substring(0, 2).toUpperCase(),
                color: '#e74c3c',
                notes: 'Organizer',
                isOrganizer: true,
                userId: session.user.id
            }
        );

        const token = generateToken(trip.id);
        const expiresAt = getTokenExpiry(token);

        return res.status(201).json({
            id: trip.id,
            name: trip.name,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            timezone: trip.timezone,
            role: 'ORGANIZER',
            travelers: [organizer],
            flights: [],
            stays: [],
            transit: [],
            activities: [],
            token,
            expiresAt
        });
    } catch (error) {
        console.error('Create trip error:', error);
        return res.status(500).json({ error: 'Failed to create trip' });
    }
}

async function listTrips(req, res, session) {
    try {
        const { includeArchived } = req.query;
        // Fix for existing organizer roles
        let tripList = [];

        // Fix for existing organizer roles
        if (session.user && session.user.id) {
            console.log('Update roles for user:', session.user.id);
            try {
                await travelers.updateRoleIfOnlyOne(session.user.id);
            } catch (err) {
                console.warn('Failed to update roles:', err);
            }

            tripList = await trips.getByUserId(session.user.id, includeArchived === 'true');
        } else {
            console.warn('Session missing user ID:', session);
            return res.status(200).json({ trips: [] });
        }

        if (!tripList) tripList = [];

        const fullTrips = await Promise.all(tripList.map(async (t) => {
            const [tripTravelers, tripItems] = await Promise.all([
                travelers.listByTrip(t.id),
                items.listByTrip(t.id)
            ]);

            // Organize items by type
            const flights = [];
            const stays = [];
            const transit = [];
            const activities = [];

            // Helper to attach assignments? 
            // The item object from listByTrip might strictly rely on the db query.
            // If listByTrip doesn't join assignments, we might need to fetch them.
            // But for the list view, maybe we don't strictly need every assignment right away?
            // Actually store.js render logic often uses `item.travelers` (array of ids).
            // So we SHOULD fetch assignments. Fetching 1+N might be slow.
            // Optimally `items.listByTrip` would join assignments.
            // Let's assume we need to attach them.

            // Optimization: Fetch all assignments for the trip in one go if possible?
            // db.js might not have `assignments.listByTrip`.
            // Let's do it per item for now, or just send empty travelers if acceptable?
            // User needs to see who is on the flight.
            // Let's iterate items and fetch assignments.

            await Promise.all(tripItems.map(async (item) => {
                const assigns = await assignments.getByItem(item.id);
                item.travelers = assigns.map(a => a.travelerId);

                // Bucket key mapping:
                // DB types: 'flight', 'stay', 'transit', 'activity'
                // Response keys: 'flights', 'stays', 'transit', 'activities'

                if (item.type === 'flight') flights.push(item);
                else if (item.type === 'stay') stays.push(item);
                else if (item.type === 'transit') transit.push(item);
                else if (item.type === 'activity') activities.push(item);
            }));

            return {
                id: t.id,
                name: t.name,
                destination: t.destination,
                startDate: t.startDate,
                endDate: t.endDate,
                timezone: t.timezone,
                isArchived: t.isArchived,
                role: t.role,
                travelers: tripTravelers,
                flights,
                stays,
                transit,
                activities
            };
        }));

        return res.status(200).json({
            trips: fullTrips
        });
    } catch (error) {
        console.error('List trips error:', error);
        return res.status(500).json({
            error: 'Failed to list trips',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
