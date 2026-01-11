/**
 * API Route: /api/items/[itemId]/travelers
 * GET - List travelers assigned to an item
 * POST - Assign travelers to an item (idempotent)
 */

const { items, assignments, travelers } = require('../../../../../lib/db');
const { verifyToken, extractToken } = require('../../../../../lib/auth');

export default async function handler(req, res) {
    const { itemId } = req.query;

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

    if (req.method === 'GET') {
        return listAssignments(req, res, itemId);
    }

    if (req.method === 'POST') {
        return addAssignments(req, res, itemId, item.tripId);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
};

async function listAssignments(req, res, itemId) {
    try {
        const itemAssignments = await assignments.getByItem(itemId);

        // Get full traveler details
        const travelerDetails = await Promise.all(
            itemAssignments.map(async (a) => {
                const traveler = await travelers.getById(a.travelerId);
                return {
                    ...traveler,
                    role: a.role
                };
            })
        );

        return res.status(200).json({ travelers: travelerDetails.filter(Boolean) });
    } catch (error) {
        console.error('List assignments error:', error);
        return res.status(500).json({ error: 'Failed to list assignments' });
    }
}

async function addAssignments(req, res, itemId, tripId) {
    try {
        const { travelerIds, role } = req.body;

        if (!travelerIds || !Array.isArray(travelerIds) || travelerIds.length === 0) {
            return res.status(400).json({ error: 'travelerIds array is required' });
        }

        const assigned = [];
        const alreadyAssigned = [];
        const invalid = [];

        for (const travelerId of travelerIds) {
            // Verify traveler belongs to same trip
            const traveler = await travelers.getById(travelerId);
            if (!traveler || traveler.tripId !== tripId) {
                invalid.push(travelerId);
                continue;
            }

            // Check if already assigned
            const existingAssignments = await assignments.getByItem(itemId);
            const isAlreadyAssigned = existingAssignments.some(a => a.travelerId === travelerId);

            if (isAlreadyAssigned) {
                alreadyAssigned.push(travelerId);
            } else {
                await assignments.assign(itemId, travelerId, role || null);
                assigned.push(travelerId);
            }
        }

        return res.status(200).json({
            assigned,
            alreadyAssigned,
            invalid
        });
    } catch (error) {
        console.error('Add assignments error:', error);
        return res.status(500).json({ error: 'Failed to add assignments' });
    }
}
