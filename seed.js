/**
 * Seed Database - Imports sample trip data from sample-trip.json into the SQLite database
 */

const fs = require('fs');
const path = require('path');
const { trips, travelers, items, assignments, initDatabase, saveDatabase } = require('./lib/db');
const { hashPasscode } = require('./lib/auth');

async function seed() {
    console.log('🌱 Starting database seeding...');

    try {
        const db = await initDatabase();

        // Check if trip already exists
        const existingTrips = await trips.list();
        if (existingTrips.some(t => t.id === 'japan-2026')) {
            console.log('⚠️ Sample trip "japan-2026" already exists. Skipping seed.');
            return;
        }

        const sampleDataPath = path.join(process.cwd(), 'data', 'sample-trip.json');
        if (!fs.existsSync(sampleDataPath)) {
            console.error('❌ Sample data file not found at:', sampleDataPath);
            return;
        }

        const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
        const tData = sampleData.trip;

        // 1. Create Trip
        const passcodeHash = await hashPasscode('travel');
        const trip = await trips.create(
            tData.name,
            passcodeHash,
            tData.destination,
            tData.startDate,
            tData.endDate,
            tData.timezone
        );

        // Use the ID from sample data for consistency if possible, or just map it
        const tripId = trip.id;
        console.log(`✅ Created trip: ${trip.name} (${tripId})`);

        // Map of old IDs to new IDs
        const idMap = {
            trip: { [tData.id]: tripId }
        };

        // 2. Create Travelers
        idMap.travelers = {};
        for (const traveler of sampleData.travelers) {
            const newTraveler = await travelers.create(
                tripId,
                traveler.name,
                traveler.email || '',
                traveler.initials || '',
                traveler.color || '',
                traveler.notes || '',
                traveler.isOrganizer || false
            );
            idMap.travelers[traveler.id] = newTraveler.id;
            console.log(`✅ Created traveler: ${traveler.name}`);
        }

        // 3. Create Items (Flights, Stays, Transit, Activities)
        const createItems = async (itemArray, type) => {
            for (const item of itemArray) {
                // Extract base fields
                const baseOptions = {
                    notes: item.notes || '',
                    linkUrl: (item.links && item.links[0]) || '',
                    startAt: item.departureTime || item.checkIn || item.startTime || '',
                    endAt: item.arrivalTime || item.checkOut || item.endTime || '',
                    status: 'booked', // Assume sample data is booked
                    metadata: { ...item }
                };

                // Remove base fields from metadata to avoid duplication
                delete baseOptions.metadata.id;
                delete baseOptions.metadata.notes;
                delete baseOptions.metadata.travelers;

                const newItem = await items.create(tripId, type, item.name || item.airline || item.type || type, baseOptions);
                console.log(`✅ Created ${type}: ${newItem.title}`);

                // 4. Create Assignments
                if (item.travelers && Array.isArray(item.travelers)) {
                    for (const oldTravelerId of item.travelers) {
                        const newTravelerId = idMap.travelers[oldTravelerId];
                        if (newTravelerId) {
                            await assignments.assign(newItem.id, newTravelerId);
                        }
                    }
                }
            }
        };

        await createItems(sampleData.flights, 'flight');
        await createItems(sampleData.stays, 'stay');
        await createItems(sampleData.transit, 'transit');
        await createItems(sampleData.activities, 'activity');

        saveDatabase();
        console.log('✨ Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

seed();
