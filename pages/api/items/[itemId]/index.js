/**
 * API Route: /api/items/[itemId]
 * PATCH - Update an item
 * DELETE - Delete an item
 */

const { items, assignments } = require('../../../../lib/db');
const { verifyToken, extractToken } = require('../../../../lib/auth');

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

    if (req.method === 'PATCH') {
        return updateItem(req, res, itemId);
    }

    if (req.method === 'DELETE') {
        return deleteItem(req, res, itemId);
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
};

async function updateItem(req, res, itemId) {
    try {
        const { title, notes, linkUrl, startAt, endAt, status, metadata } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (notes !== undefined) updates.notes = notes;
        if (linkUrl !== undefined) updates.linkUrl = linkUrl;
        if (startAt !== undefined) updates.startAt = startAt;
        if (endAt !== undefined) updates.endAt = endAt;
        if (status !== undefined) {
            const validStatuses = ['idea', 'pending', 'booked', 'dropped'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }
            updates.status = status;
        }
        if (metadata !== undefined) updates.metadata = metadata;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await items.update(itemId, updates);

        // Get updated item with assignments
        const updated = await items.getById(itemId);
        const itemAssignments = await assignments.getByItem(itemId);
        updated.travelers = itemAssignments.map(a => a.travelerId);

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Update item error:', error);
        return res.status(500).json({ error: 'Failed to update item' });
    }
}

async function deleteItem(req, res, itemId) {
    try {
        await items.delete(itemId);
        return res.status(204).end();
    } catch (error) {
        console.error('Delete item error:', error);
        return res.status(500).json({ error: 'Failed to delete item' });
    }
}
