/**
 * Geocoding Migration Script
 * 
 * Batch geocodes existing trip items (stays, activities, transit) that have
 * string addresses but lack coordinate data. This enables map pins to appear.
 * 
 * Usage:
 *   node geocode-items.js           # Execute migration
 *   node geocode-items.js --dry-run # Preview without making changes
 */

require('dotenv').config({ path: '.env.local' });
const db = require('./lib/db');

const DRY_RUN = process.argv.includes('--dry-run');
const NOMINATIM_DELAY_MS = 1100; // Slightly over 1 second to respect Nominatim rate limits

/**
 * Geocode an address string using Nominatim API
 */
async function geocodeAddress(address) {
    if (!address || address.length < 3) return null;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    try {
        const res = await fetch(url.toString(), {
            headers: { 'User-Agent': 'BanginTravel-Migration/1.0 (jeffbangerter@gmail.com)' }
        });

        if (!res.ok) {
            console.error(`  ⚠️ HTTP ${res.status} for: ${address}`);
            return null;
        }

        const data = await res.json();

        if (data.length === 0) {
            console.log(`  ⚠️ No results for: ${address}`);
            return null;
        }

        return {
            displayName: data[0].display_name.split(',').slice(0, 3).join(', '),
            fullAddress: data[0].display_name,
            coordinates: {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            }
        };
    } catch (err) {
        console.error(`  ❌ Geocoding error for "${address}":`, err.message);
        return null;
    }
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the address string from an item based on its type
 */
function getAddressFromItem(item) {
    const metadata = item.metadata || {};

    switch (item.type) {
        case 'stay':
            return metadata.address || null;
        case 'activity':
            return metadata.location || null;
        case 'transit':
            // Use arrival location as primary (where you'll be)
            return metadata.arrivalLocation || metadata.departureLocation || null;
        default:
            return null;
    }
}

/**
 * Check if item already has coordinates
 */
function hasCoordinates(item) {
    const metadata = item.metadata || {};
    return !!(metadata.location?.coordinates || metadata.coordinates);
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('🗺️  Geocoding Migration Script');
    console.log('━'.repeat(50));

    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No changes will be saved\n');
    }

    try {
        // Initialize database
        await db.initDatabase();
        console.log('✅ Database connected\n');

        // Get all trips
        const trips = await db.trips.list();
        console.log(`📋 Found ${trips.length} trips\n`);

        let totalItems = 0;
        let geocodedCount = 0;
        let skippedWithCoords = 0;
        let skippedNoAddress = 0;
        let failedCount = 0;

        for (const trip of trips) {
            console.log(`\n📍 Trip: ${trip.name || trip.id}`);

            const items = await db.items.listByTrip(trip.id);
            const itemsToProcess = items.filter(item =>
                ['stay', 'activity', 'transit'].includes(item.type)
            );

            totalItems += itemsToProcess.length;
            console.log(`   Found ${itemsToProcess.length} items to check`);

            for (const item of itemsToProcess) {
                // Skip if already has coordinates
                if (hasCoordinates(item)) {
                    skippedWithCoords++;
                    console.log(`   ⏭️  ${item.title} - already has coordinates`);
                    continue;
                }

                // Get address to geocode
                const address = getAddressFromItem(item);
                if (!address) {
                    skippedNoAddress++;
                    console.log(`   ⏭️  ${item.title} - no address found`);
                    continue;
                }

                console.log(`   🔍 Geocoding: ${item.title}`);
                console.log(`      Address: ${address.substring(0, 60)}${address.length > 60 ? '...' : ''}`);

                // Geocode the address
                const geoResult = await geocodeAddress(address);

                if (geoResult) {
                    console.log(`      ✅ Found: ${geoResult.coordinates.lat.toFixed(4)}, ${geoResult.coordinates.lng.toFixed(4)}`);

                    if (!DRY_RUN) {
                        // Update the item's metadata with coordinates
                        const updatedMetadata = {
                            ...item.metadata,
                            location: geoResult
                        };

                        await db.items.update(item.id, { metadata: updatedMetadata });
                    }

                    geocodedCount++;
                } else {
                    failedCount++;
                }

                // Rate limit - wait before next request
                await sleep(NOMINATIM_DELAY_MS);
            }
        }

        // Summary
        console.log('\n' + '━'.repeat(50));
        console.log('📊 Migration Summary');
        console.log('━'.repeat(50));
        console.log(`   Total items checked:      ${totalItems}`);
        console.log(`   ✅ Successfully geocoded: ${geocodedCount}`);
        console.log(`   ⏭️  Already had coords:    ${skippedWithCoords}`);
        console.log(`   ⏭️  No address to geocode: ${skippedNoAddress}`);
        console.log(`   ❌ Failed to geocode:     ${failedCount}`);

        if (DRY_RUN) {
            console.log('\n🔍 DRY RUN COMPLETE - Run without --dry-run to apply changes');
        } else {
            console.log('\n✅ Migration complete!');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runMigration();
