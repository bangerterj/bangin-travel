
const { initDatabase, items, travelers, trips } = require('./lib/db');

require('dotenv').config({ path: '.env.local' });

const DEBUG_TRIP_ID = 'trip-mkelfm4n-g5sg4kn5v'; // Verified from browser

async function run() {
    console.log('Connecting to DB...');
    await initDatabase();

    // VERIFY TRIP EXISTS
    const trip = await trips.getById(DEBUG_TRIP_ID);
    if (!trip) {
        console.log('Debug Trip not found, creating default...');
        // Create if missing logic here if needed, but assuming it exists
        return;
    }
    console.log(`Found Trip: ${trip.name} (${trip.id})`);

    // GET TRAVELER (for paid_by)
    const tripTravelers = await travelers.listByTrip(DEBUG_TRIP_ID);
    const mainTraveler = tripTravelers[0];
    if (!mainTraveler) {
        console.error('No travelers in trip! Cannot assign costs.');
        return;
    }
    console.log(`Assigning costs to: ${mainTraveler.name} (${mainTraveler.id})`);

    // DATA TO INJECT
    const mockData = [
        // STAYS
        {
            title: 'Shinjuku Granbell Hotel',
            type: 'stay',
            startAt: '2026-03-19T15:00:00',
            endAt: '2026-03-22T11:00:00',
            metadata: {
                location: {
                    address: '2-14-5 Kabukicho, Tokyo',
                    coordinates: { lat: 35.6938, lng: 139.7034 }
                },
                cost: { amount: 480, currency: 'USD' }
            },
            paidBy: mainTraveler.id
        },
        {
            title: 'Nagano Ryokan Fujiya',
            type: 'stay',
            startAt: '2026-03-22T16:00:00',
            endAt: '2026-03-24T10:00:00',
            metadata: {
                location: {
                    address: '1-2-3 Yamanouchi, Nagano',
                    coordinates: { lat: 36.7333, lng: 138.4667 }
                },
                cost: { amount: 600, currency: 'USD' }
            },
            paidBy: mainTraveler.id
        },
        // ACTIVITIES
        {
            title: 'Senso-ji Temple',
            type: 'activity',
            startAt: '2026-03-19T19:00:00',
            endAt: '2026-03-19T21:00:00',
            metadata: {
                location: {
                    displayName: 'Asakusa, Tokyo',
                    coordinates: { lat: 35.7148, lng: 139.7967 }
                },
                cost: { amount: 0, currency: 'USD' },
                priority: 'must-do'
            },
            paidBy: mainTraveler.id
        },
        {
            title: 'TeamLab Borderless',
            type: 'activity',
            startAt: '2026-03-20T10:00:00',
            endAt: '2026-03-20T14:00:00',
            metadata: {
                location: {
                    displayName: 'Azabudai Hills, Minato City',
                    coordinates: { lat: 35.6617, lng: 139.7413 }
                },
                cost: { amount: 50, currency: 'USD' },
                priority: 'must-do'
            },
            paidBy: mainTraveler.id
        },
        // FLIGHTS
        {
            title: 'UA837 to Tokyo',
            type: 'flight',
            startAt: '2026-03-18T06:30:00',
            endAt: '2026-03-19T15:15:00',
            metadata: {
                airline: 'United',
                flightNumber: 'UA837',
                departureAirport: 'SLC',
                arrivalAirport: 'NRT',
                cost: { amount: 1200, currency: 'USD' }
            },
            paidBy: mainTraveler.id
        }
    ];

    // INJECT
    for (const item of mockData) {
        console.log(`Injecting ${item.type}: ${item.title}`);
        await items.create(
            DEBUG_TRIP_ID,
            item.type,
            item.title,
            {
                startAt: item.startAt,
                endAt: item.endAt,
                metadata: item.metadata,
                paidBy: item.paidBy,
                status: 'booked'
            }
        );
    }
    console.log('Done!');
    process.exit(0);
}

run().catch(console.error);
