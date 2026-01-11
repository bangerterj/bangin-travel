/**
 * API Route: /api/trips/[tripId]/items
 * GET - List items for a trip (optionally filtered by type)
 * POST - Create a new item
 */

const { items, assignments } = require('../../../../../lib/db');
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
        return listItems(req, res, tripId);
    }

    if (req.method === 'POST') {
        return createItem(req, res, tripId);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
};

async function listItems(req, res, tripId) {
    try {
        const { type } = req.query;

        // Validate type if provided
        const validTypes = ['flight', 'transit', 'stay', 'activity'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid item type' });
        }

        const tripItems = await items.listByTrip(tripId, type || null);

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

        return res.status(200).json({ items: itemsWithAssignments });
    } catch (error) {
        console.error('List items error:', error);
        return res.status(500).json({ error: 'Failed to list items' });
    }
}

async function createItem(req, res, tripId) {
    try {
        const { type, title, notes, linkUrl, startAt, endAt, status, metadata, travelers: travelerIds } = req.body;

        // Validate required fields
        const validTypes = ['flight', 'transit', 'stay', 'activity'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Valid item type is required (flight, transit, stay, activity)' });
        }

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Validate status if provided
        const validStatuses = ['idea', 'pending', 'booked', 'dropped'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Create the item
        const item = await items.create(tripId, type, title.trim(), {
            notes: notes || '',
            linkUrl: linkUrl || '',
            startAt: startAt || '',
            endAt: endAt || '',
            status: status || 'idea',
            metadata: metadata || {}
        });

        // Assign travelers if provided
        if (travelerIds && Array.isArray(travelerIds) && travelerIds.length > 0) {
            for (const travelerId of travelerIds) {
                await assignments.assign(item.id, travelerId);
            }
            item.travelers = travelerIds;
        } else {
            item.travelers = [];
        }

        return res.status(201).json(item);
    } catch (error) {
        console.error('Create item error:', error);
        return res.status(500).json({ error: 'Failed to create item' });
    }
}
