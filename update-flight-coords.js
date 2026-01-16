
const { initDatabase, items } = require('./lib/db');
require('dotenv').config({ path: '.env.local' });

const DEBUG_TRIP_ID = 'trip-mkelfm4n-g5sg4kn5v';

async function run() {
    await initDatabase();

    // Get items
    const allItems = await items.listByTrip(DEBUG_TRIP_ID);
    const flight = allItems.find(i => i.type === 'flight');

    if (!flight) {
        console.error('No flight found in debug trip!');
        return;
    }

    console.log(`Updating flight: ${flight.title} (${flight.id})`);

    const newMetadata = {
        ...flight.metadata,
        arrivalCoordinates: { lat: 35.7720, lng: 140.3929 } // NRT
    };

    await items.update(flight.id, { metadata: newMetadata });
    console.log('Flight coordinates updated.');
    process.exit(0);
}

run().catch(console.error);
