import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { enrichFlightData } from '../../../../../lib/flights';
const { items, assignments, travelers } = require('../../../../../lib/db');

export default async function handler(req, res) {
    const { tripId } = req.query;

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify trip membership
    const isMember = await travelers.isMember(tripId, session.user.id);
    if (!isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this trip' });
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
        const validStatuses = ['idea', 'planned', 'pending', 'booked', 'dropped'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Create the item
        const itemMetadata = metadata || {};
        let paidBy = req.body.paidBy || null;

        // Standardize Cost Input
        // If cost is provided in body, merge it into metadata.cost
        if (req.body.cost) {
            itemMetadata.cost = {
                ...itemMetadata.cost,
                ...req.body.cost
            };
            // If paidBy is in cost object, use it (top level paidBy takes precedence if strictly strictly separate, but let's allow cost.paidBy)
            if (req.body.cost.paidBy && !paidBy) {
                paidBy = req.body.cost.paidBy || null;
            }
        }

        // Ensure paidBy is NOT in metadata.cost to avoid duplication/confusion, 
        // as it is stored in a column.
        if (itemMetadata.cost && itemMetadata.cost.paidBy) {
            delete itemMetadata.cost.paidBy;
        }



        // Wait, I can't easily change the arguments to items.create if I don't assign them to variables I control.
        // Let's rewrite the block more cleanly.

        let finalStartAt = startAt || '';
        let finalEndAt = endAt || '';

        if (type === 'flight') {
            const { airports } = require('../../../../../lib/db');
            const tempData = { startAt: finalStartAt, endAt: finalEndAt, metadata: itemMetadata };
            await enrichFlightData(tempData, airports);
            finalStartAt = tempData.startAt;
            finalEndAt = tempData.endAt;
        }

        const item = await items.create(tripId, type, title.trim(), {
            notes: notes || '',
            linkUrl: linkUrl || '',
            startAt: finalStartAt,
            endAt: finalEndAt,
            status: status || 'idea',
            metadata: itemMetadata,
            paidBy: paidBy
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
        return res.status(500).json({ error: error.message || 'Failed to create item' });
    }
}
