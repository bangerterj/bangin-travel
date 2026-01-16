require('dotenv').config({ path: '.env.local' });
const { trips, initDatabase, travellers } = require('./lib/db');

async function verify() {
    console.log('Starting DB Verification...');
    await initDatabase();

    const tripName = "Backend Verify Trip";

    // 1. Create Trip (ensure it works without passcode)
    console.log(`\n1. Creating trip: "${tripName}"...`);
    const trip = await trips.create(tripName, "Test Destination", "2024-01-01", "2024-01-07");

    if (!trip || !trip.id) {
        console.error("❌ Failed to create trip");
        process.exit(1);
    }
    console.log("✅ Trip created:", trip.id);

    // Check if passcode_hash exists in the returned object (should be undefined)
    if (trip.passcode_hash !== undefined) {
        console.warn("⚠️  passcode_hash field still present in returned object (might be null)", trip.passcode_hash);
    } else {
        console.log("✅ passcode_hash not present in return object");
    }

    // 2. Archive Trip
    console.log(`\n2. Archiving trip ${trip.id}...`);
    await trips.update(trip.id, { isArchived: true });

    const archivedTrip = await trips.getById(trip.id);
    if (archivedTrip.is_archived === true || archivedTrip.is_archived === 1 || archivedTrip.isArchived === true) {
        console.log("✅ Trip archived successfully");
    } else {
        console.error("❌ Failed to archive trip", archivedTrip);
    }

    // 3. Delete Trip
    console.log(`\n3. Deleting trip ${trip.id}...`);
    await trips.delete(trip.id);

    const deletedTrip = await trips.getById(trip.id);
    if (!deletedTrip) {
        console.log("✅ Trip deleted successfully");
    } else {
        console.error("❌ Trip still exists after delete:", deletedTrip);
    }

    console.log("\n🎉 Verification Complete!");
    process.exit(0);
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
