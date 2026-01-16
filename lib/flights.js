import { fromZonedTime } from 'date-fns-tz';

export async function enrichFlightData(data, airportsDb) {
    const meta = data.metadata || {};

    // Process Departure
    if (meta.departureAirport && meta.departureTime) {
        try {
            const airport = await airportsDb.getByIata(meta.departureAirport);
            if (airport && airport.timezone_id) {
                // Parse the local time string in the airport's timezone to get UTC
                // fromZonedTime takes (dateString, timeZone) and returns a Date object (which works as UTC)
                const utcDate = fromZonedTime(meta.departureTime, airport.timezone_id);

                // Update the top-level startAt to be the correct UTC time
                data.startAt = utcDate.toISOString();

                // Store the determined timezone for display
                meta.departureTimezone = airport.timezone_id;
            }
        } catch (e) {
            console.error('Error enriching departure time', e);
        }
    }

    // Process Arrival
    if (meta.arrivalAirport && meta.arrivalTime) {
        try {
            const airport = await airportsDb.getByIata(meta.arrivalAirport);
            if (airport && airport.timezone_id) {
                const utcDate = fromZonedTime(meta.arrivalTime, airport.timezone_id);
                data.endAt = utcDate.toISOString();
                meta.arrivalTimezone = airport.timezone_id;
            }
        } catch (e) {
            console.error('Error enriching arrival time', e);
        }
    }

    data.metadata = meta;
    return data;
}
