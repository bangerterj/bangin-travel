/**
 * API Route: /api/trips/[tripId]/travelers
 * GET - List travelers for a trip
 * POST - Create a new traveler
 */

const { travelers } = require('../../../../../lib/db');
const { verifyToken, extractToken } = require('../../../../../lib/auth');

export default async function handler(req, res) {
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

    if (req.method === 'GET') {
        return listTravelers(req, res, tripId);
    }

    if (req.method === 'POST') {
        return createTraveler(req, res, tripId);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
};

async function listTravelers(req, res, tripId) {
    try {
        const tripTravelers = await travelers.listByTrip(tripId);
        return res.status(200).json({ travelers: tripTravelers });
    } catch (error) {
        console.error('List travelers error:', error);
        return res.status(500).json({ error: 'Failed to list travelers' });
    }
}

async function createTraveler(req, res, tripId) {
    try {
        const { displayName, email, initials, color, notes, isOrganizer } = req.body;

        // Validate required fields
        if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
            return res.status(400).json({ error: 'Display name is required' });
        }

        // Auto-generate initials if not provided
        const finalInitials = initials || displayName.trim().split(' ')
            .map(n => n.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');

        // Generate a random color if not provided
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#34495e'];
        const finalColor = color || colors[Math.floor(Math.random() * colors.length)];

        const traveler = await travelers.create(
            tripId,
            displayName.trim(),
            {
                email: email || '',
                initials: finalInitials,
                color: finalColor,
                notes: notes || '',
                isOrganizer: isOrganizer || false,
                coupleId: req.body.coupleId || null
            }
        );

        return res.status(201).json(traveler);
    } catch (error) {
        console.error('Create traveler error:', error);
        return res.status(500).json({ error: 'Failed to create traveler' });
    }
}
