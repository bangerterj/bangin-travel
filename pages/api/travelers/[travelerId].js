/**
 * API Route: /api/travelers/[travelerId]
 * PATCH - Update a traveler
 * DELETE - Delete a traveler
 */

const { travelers } = require('../../../lib/db');
const { verifyToken, extractToken } = require('../../../lib/auth');

export default async function handler(req, res) {
    const { travelerId } = req.query;

    // Verify token
    const token = extractToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const tokenData = verifyToken(token);
    if (!tokenData.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get traveler to verify trip ownership
    const traveler = await travelers.getById(travelerId);
    if (!traveler) {
        return res.status(404).json({ error: 'Traveler not found' });
    }

    if (tokenData.tripId !== traveler.tripId) {
        return res.status(403).json({ error: 'Token does not match traveler trip' });
    }

    if (req.method === 'PATCH') {
        return updateTraveler(req, res, travelerId);
    }

    if (req.method === 'DELETE') {
        return deleteTraveler(req, res, travelerId);
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
};

async function updateTraveler(req, res, travelerId) {
    try {
        const { displayName, email, initials, color, notes, isOrganizer } = req.body;

        const updates = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (email !== undefined) updates.email = email;
        if (initials !== undefined) updates.initials = initials;
        if (color !== undefined) updates.color = color;
        if (notes !== undefined) updates.notes = notes;
        if (isOrganizer !== undefined) updates.isOrganizer = isOrganizer;
        if (req.body.coupleId !== undefined) updates.coupleId = req.body.coupleId;

        // If name changed but initials didn't, update initials
        if (updates.displayName && !updates.initials) {
            updates.initials = updates.displayName.trim().split(' ')
                .map(n => n.charAt(0).toUpperCase())
                .slice(0, 2)
                .join('');
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await travelers.update(travelerId, updates);

        // Get updated traveler
        const updated = await travelers.getById(travelerId);

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Update traveler error:', error);
        return res.status(500).json({ error: 'Failed to update traveler' });
    }
}

async function deleteTraveler(req, res, travelerId) {
    try {
        await travelers.delete(travelerId);
        return res.status(204).end();
    } catch (error) {
        console.error('Delete traveler error:', error);
        return res.status(500).json({ error: 'Failed to delete traveler' });
    }
}
