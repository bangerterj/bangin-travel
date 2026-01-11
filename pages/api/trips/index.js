/**
 * API Route: /api/trips
 * POST - Create a new trip
 * GET - List all trips
 */

const { trips } = require('../../../lib/db');
const { hashPasscode, generateToken, getTokenExpiry } = require('../../../lib/auth');

export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            return await createTrip(req, res);
        }

        if (req.method === 'GET') {
            return await listTrips(req, res);
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            stack: error.stack
        });
    }
};

async function createTrip(req, res) {
    try {
        const { name, passcode, destination, startDate, endDate, timezone } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Trip name is required' });
        }

        if (!passcode || typeof passcode !== 'string' || passcode.length < 4) {
            return res.status(400).json({ error: 'Passcode must be at least 4 characters' });
        }

        // Hash the passcode
        const passcodeHash = await hashPasscode(passcode);

        // Create the trip
        const trip = await trips.create(
            name.trim(),
            passcodeHash,
            destination || '',
            startDate || '',
            endDate || '',
            timezone || 'UTC'
        );

        // Generate a token so creator can immediately access
        const token = generateToken(trip.id);
        const expiresAt = getTokenExpiry(token);

        return res.status(201).json({
            id: trip.id,
            name: trip.name,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            token,
            expiresAt
        });
    } catch (error) {
        console.error('Create trip error:', error);
        return res.status(500).json({ error: 'Failed to create trip' });
    }
}

async function listTrips(req, res) {
    try {
        const tripList = await trips.list();

        // Only return basic info (no passcode hash)
        return res.status(200).json({
            trips: tripList.map(t => ({
                id: t.id,
                name: t.name,
                destination: t.destination,
                startDate: t.startDate,
                endDate: t.endDate
            }))
        });
    } catch (error) {
        console.error('List trips error:', error);
        return res.status(500).json({ error: 'Failed to list trips' });
    }
}
