/**
 * ItemCard.js
 * Reusable component for rendering standard item cards (Flights, Stays, Transit, Activities)
 * Ports the "Eyebrow" design from the sandbox.
 */

// --- HELPERS ---
const getIcon = (cat, type) => {
    const map = {
        flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆',
        airbnb: '🏠', hostel: '🛏️', train: '🚄', bus: '🚌', rental_car: '🚗', drive: '🚗',
        dining: '🍽️'
    };
    // Fallback to category icon if type icon not found
    return map[type] || map[cat] || '❓';
};

const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getMapLink = (location) => {
    if (!location) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};

/**
 * Renders a unified item card HTML string.
 * @param {Object} item - The data object (flight, stay, etc.)
 * @param {string} category - 'flight', 'stay', 'transit', 'activity'
 * @param {Object} callbacks - Optional callbacks like { onEdit: (id) => {} }
 * @returns {string} HTML string of the card
 */
export function renderItemCard(item, category, callbacks = {}) {
    const isBooked = item.status === 'booked';

    // --- 1. Top Row (Eyebrow) ---
    let statusText = isBooked ? 'BOOKED' : 'PLAN';
    let contextText = '';

    if (category === 'flight') {
        contextText = item.airline || 'Flight';
    } else if (category === 'stay') {
        contextText = item.type === 'airbnb' ? 'Airbnb' :
            item.type === 'hostel' ? 'Hostel' : 'Hotel';
    } else if (category === 'transit') {
        contextText = item.type === 'rental_car' ? 'Rental' :
            item.type === 'drive' ? 'Drive' :
                item.type === 'train' ? 'Train' : 'Transit';
    } else if (category === 'activity') {
        // For dining, maybe say 'Dining'?
        contextText = item.type === 'dining' ? 'Dining' : 'Activity';
    }

    const eyebrow = `${statusText} • ${contextText}`.toUpperCase();

    // --- 2. Main Title & Subtitle ---
    let title = item.name || '';
    let subtitle = '';
    let mapLocation = null;

    if (category === 'flight') {
        title = `${item.departureAirport || '?'} ➝ ${item.arrivalAirport || '?'}`;
        if (item.flightNumber) {
            // Add flight number to eyebrow or subtitle? 
            // Sandbox put it in subtitle previously, but "Context Text" handled airline.
            // Let's append to eyebrow if space or just keep it minimal.
            // Actually, sandbox flight implementation didn't use subtitle for flight number in the final version?
            // Re-checking sandbox code: 
            // item.airline was used for context. 
            // But flight number was missing in final sandbox?
            // Let's add it to contextText if present.
            if (item.flightNumber) contextText += ` ${item.flightNumber}`;
            // Regenerate eyebrow
            const finalContext = item.flightNumber ? `${item.airline || ''} ${item.flightNumber}` : (item.airline || 'Flight');
            contextText = finalContext; // Override
        }
    } else if (category === 'transit') {
        if (item.type === 'rental_car') {
            title = item.name;
            subtitle = `Pick-up: ${item.departureLocation || ''}`;
            mapLocation = item.departureLocation;
        } else {
            title = `${item.name}`;
            subtitle = `${item.departureLocation || ''} ➝ ${item.arrivalLocation || ''}`;
            mapLocation = item.arrivalLocation || item.departureLocation;
        }
    } else if (category === 'stay') {
        title = item.name;
        subtitle = item.address || '';
        mapLocation = item.address || item.name;
    } else if (category === 'activity') {
        // API often has location in metadata
        const locationName = item.metadata?.location?.displayName || item.location || '';
        title = item.name;
        subtitle = locationName;
        mapLocation = locationName || item.name;
    }

    // Update eyebrow potentially if we changed contextText logic above
    const finalEyebrow = `${statusText} • ${contextText}`.toUpperCase();


    // --- 3. Meta Row (Dates/Times) ---
    let meta = [];

    // Helper to extract fields safely (migrating logic from specific files)
    const getStart = (i) => i.departureTime || i.startTime || i.startAt || i.checkIn;
    const getEnd = (i) => i.arrivalTime || i.endTime || i.endAt || i.checkOut;

    const start = getStart(item);
    const end = getEnd(item);

    if (category === 'flight') {
        if (start && end) {
            const d1 = new Date(start);
            const d2 = new Date(end);
            const sameDay = d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();

            if (sameDay) {
                meta.push(`${fmtTime(d1)} - ${fmtTime(d2)}`);
                meta.push(fmtDate(d1));
            } else {
                meta.push(`${fmtDate(d1)} ${fmtTime(d1)} ➝ ${fmtDate(d2)} ${fmtTime(d2)}`);
            }
        }
        if (item.duration) meta.push(item.duration);

    } else if (category === 'stay') {
        if (start) meta.push(`In: ${fmtDate(start)}`);
        if (end) meta.push(`Out: ${fmtDate(end)}`);

        if (start && end) {
            const nights = Math.ceil((new Date(end) - new Date(start)) / (86400000));
            if (nights > 0) meta.push(`${nights}n`);
        }

    } else if (category === 'transit') {
        if (start && end) meta.push(`${fmtTime(start)} - ${fmtTime(end)}`);
        if (start) meta.push(fmtDate(start));
        if (item.route) meta.push(item.route);

    } else if (category === 'activity') {
        if (start && end) meta.push(`${fmtTime(start)} - ${fmtTime(end)}`);
        if (start) meta.push(fmtDate(start));
    }

    // --- Actions ---
    const mapLink = getMapLink(mapLocation);
    // Note: The edit button needs to hook into the existing event delegation or callback system.
    // Existing components use global listener or pass `editFoo(id)`.
    // We will attach `data-id` and `data-action="edit"` to the button so the parent container can handle click.

    // --- HTML Generation ---
    return `
        <div class="unified-card ${isBooked ? 'booked' : ''}" data-id="${item.id}" data-category="${category}">
            <!-- ICON -->
            <div class="card-left">
                <div class="card-icon">${getIcon(category, item.type)}</div>
            </div>

            <!-- CONTENT -->
            <div class="card-right">
                <div class="eyebrow-row">
                    <span class="status-text ${isBooked ? 'text-green' : 'text-gray'}">
                        ${finalEyebrow}
                    </span>
                </div>

                <h3 class="card-title">${title}</h3>
                
                ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}

                <div class="meta-grid">
                    ${meta.map(text => `<span class="meta-item">${text}</span>`).join('')}
                </div>
            </div>

            <!-- ACTIONS -->
            <div class="card-actions">
                ${mapLink ? `
                    <a href="${mapLink}" target="_blank" rel="noopener noreferrer" class="btn-action map-btn" title="Open in Maps" onclick="event.stopPropagation();">
                        🗺️
                    </a>
                ` : ''}
                <button class="btn-action edit-btn" title="Edit Item" data-action="edit" data-id="${item.id}">✏️</button>
            </div>
        </div>
    `;
}
