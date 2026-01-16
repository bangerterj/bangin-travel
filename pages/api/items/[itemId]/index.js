import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
const { items, assignments, travelers } = require('../../../../lib/db');

export default async function handler(req, res) {
    const { itemId } = req.query;

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get item to verify trip ownership
    const item = await items.getById(itemId);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }

    // Verify trip membership
    // Note: items.getById returns tripId
    const isMember = await travelers.isMember(item.tripId, session.user.id);
    if (!isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this trip' });
    }

    if (req.method === 'PATCH') {
        return updateItem(req, res, itemId, item);
    }

    if (req.method === 'DELETE') {
        return deleteItem(req, res, itemId);
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
};

import { enrichFlightData } from '../../../../lib/flights';

async function updateItem(req, res, itemId, currentItem) {
    try {
        const { title, notes, linkUrl, startAt, endAt, status, metadata, cost, paidBy, travelers: travelerIds } = req.body;
        console.log(`[DEBUG] Updating item ${itemId}. Travelers received:`, travelerIds);

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (notes !== undefined) updates.notes = notes;
        if (linkUrl !== undefined) updates.linkUrl = linkUrl;
        if (startAt !== undefined) updates.startAt = startAt;
        if (endAt !== undefined) updates.endAt = endAt;
        // ... (status check)
        if (status !== undefined) {
            const validStatuses = ['idea', 'pending', 'booked', 'dropped'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }
            updates.status = status;
        }

        // Handle Metadata & Cost Merging
        // TIMEFRAME UPDATES 
        if (startAt !== undefined) updates.startAt = startAt;
        if (endAt !== undefined) updates.endAt = endAt;

        // METADATA & COST MERGING
        // We must merge with existing metadata to prevent data loss (since DB replace is full)
        // logic: base = current.metadata, overwrite with new metadata
        let newMetadata = { ...(currentItem.metadata || {}) };

        if (metadata) {
            newMetadata = { ...newMetadata, ...metadata };
        }

        if (cost) {
            newMetadata.cost = { ...(newMetadata.cost || {}), ...cost };
        }

        // Clean up paidBy inside cost (legacy support but we keep it synced)
        if (paidBy !== undefined) {
            updates.paidBy = paidBy || null;
            if (newMetadata.cost) {
                newMetadata.cost.paidBy = updates.paidBy;
            }
        } else if (cost && cost.paidBy !== undefined) {
            updates.paidBy = cost.paidBy || null;
            if (newMetadata.cost) {
                newMetadata.cost.paidBy = updates.paidBy;
            }
        } else if (newMetadata.cost && newMetadata.cost.paidBy !== undefined) {
            // If it's already in metadata but not at top level, sync up
            updates.paidBy = newMetadata.cost.paidBy || null;
        }

        updates.metadata = newMetadata;

        // Timezone Enrichment for Flights
        // Now 'updates.metadata' contains the FULL metadata (merged), so we have airport codes
        if (currentItem.type === 'flight') {
            const { airports } = require('../../../../lib/db');

            // Construct enrichment context with updated times if present, or fallback to current
            const enrichmentContext = {
                startAt: updates.startAt || currentItem.startAt,
                endAt: updates.endAt || currentItem.endAt,
                metadata: updates.metadata // This is already the full merged metadata
            };

            await enrichFlightData(enrichmentContext, airports);

            // Copy enriched results back to updates
            updates.startAt = enrichmentContext.startAt;
            updates.endAt = enrichmentContext.endAt;
            updates.metadata = enrichmentContext.metadata;
        }

        if (Object.keys(updates).length === 0 && travelerIds === undefined) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Update item fields if any
        if (Object.keys(updates).length > 0) {
            console.log(`[DEBUG] Calling items.update for ${itemId}`);
            await items.update(itemId, updates);
        }

        // Update traveler assignments if provided
        if (travelerIds !== undefined) {
            console.log(`[DEBUG] Calling assignments.updateForItem for ${itemId} with:`, travelerIds);
            await assignments.updateForItem(itemId, travelerIds);
        }

        // Get updated item with assignments
        const updated = await items.getById(itemId);
        const itemAssignments = await assignments.getByItem(itemId);
        updated.travelers = itemAssignments.map(a => a.travelerId);
        console.log(`[DEBUG] Update complete. New travelers:`, updated.travelers);

        return res.status(200).json(updated);
    } catch (error) {
        console.error('Update item error:', error);
        return res.status(500).json({
            error: 'Failed to update item',
            details: error.message
        });
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
