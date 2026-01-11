/**
 * API Route: /api/items/[itemId]/travelers/[travelerId]
 * DELETE - Remove a traveler assignment from an item
 */

const { items, assignments } = require('../../../../../lib/db');
const { verifyToken, extractToken } = require('../../../../../lib/auth');

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { itemId, travelerId } = req.query;

    // Verify token
    const token = extractToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const tokenData = verifyToken(token);
    if (!tokenData.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get item to verify trip ownership
    const item = await items.getById(itemId);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }

    if (tokenData.tripId !== item.tripId) {
        return res.status(403).json({ error: 'Token does not match item trip' });
    }

    try {
        await assignments.unassign(itemId, travelerId);
        return res.status(204).end();
    } catch (error) {
        console.error('Remove assignment error:', error);
        return res.status(500).json({ error: 'Failed to remove assignment' });
    }
};
