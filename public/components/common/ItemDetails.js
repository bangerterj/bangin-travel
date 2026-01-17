/**
 * ItemDetails.js
 * Renders a read-only detail view for any travel item.
 * Used in the global modal when clicking items in Calendar or Map.
 */

const getIcon = (cat, type) => {
    const map = {
        flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆',
        airbnb: '🏠', hostel: '🛏️', train: '🚄', bus: '🚌', rental_car: '🚗',
        dining: '🍽️'
    };
    return map[type] || map[cat] || '❓';
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

export function renderItemDetails(item, category) {
    const isBooked = item.status === 'booked';

    // --- Header Data ---
    let title = item.name || item.title;
    let subtitle = '';

    if (category === 'flight') {
        title = `${item.departureAirport || '?'} ➝ ${item.arrivalAirport || '?'}`;
        subtitle = `${item.airline || 'Airline'} • ${item.flightNumber || ''}`;
    } else if (category === 'stay') {
        subtitle = item.address || '';
    } else if (category === 'transit') {
        if (item.type === 'rental_car') {
            subtitle = item.departureLocation || '';
        } else {
            title = item.name || 'Transit';
            subtitle = `${item.departureLocation || '?'} ➝ ${item.arrivalLocation || '?'}`;
        }
    } else if (category === 'activity') {
        subtitle = item.location || '';
    }

    // --- Time Data ---
    let timeSection = '';
    if (category === 'flight') {
        timeSection = `
            <div class="time-row"><strong>Depart:</strong> ${fmtDate(item.departureTime)} • ${fmtTime(item.departureTime)}</div>
            <div class="time-row"><strong>Arrive:</strong> ${fmtDate(item.arrivalTime)} • ${fmtTime(item.arrivalTime)}</div>
            ${item.duration ? `<div class="sub-text">Duration: ${item.duration}</div>` : ''}
        `;
    } else if (category === 'stay') {
        timeSection = `
            <div class="time-row"><strong>Check In:</strong> ${fmtDate(item.checkIn)} at ${fmtTime(item.checkIn)}</div>
            <div class="time-row"><strong>Check Out:</strong> ${fmtDate(item.checkOut)} at ${fmtTime(item.checkOut)}</div>
        `;
    } else if (category === 'transit') {
        timeSection = `
            <div class="time-row"><strong>Depart:</strong> ${fmtDate(item.departureTime)} • ${fmtTime(item.departureTime)}</div>
            <div class="time-row"><strong>Arrive:</strong> ${fmtDate(item.arrivalTime)} • ${fmtTime(item.arrivalTime)}</div>
        `;
    } else {
        // Activity
        timeSection = `
            <div class="time-row">${fmtDate(item.startTime)}</div>
            <div class="time-row">${fmtTime(item.startTime)} - ${fmtTime(item.endTime)}</div>
        `;
    }

    // --- Location Data (Map Links) ---
    let locationSection = '';

    // Helper for map link
    const renderMapLink = (label, query, appendSuffix = '') => {
        if (!query) return '';
        const searchQuery = appendSuffix ? `${query} ${appendSuffix}` : query;
        return `
            <div class="location-block">
                <div class="location-label">${label}</div>
                <div class="location-text">${query}</div>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}" 
                   target="_blank" class="map-link">🗺️ Open in Maps</a>
            </div>
        `;
    };

    if (category === 'flight') {
        // Show both airports with 'airport' suffix for better accuracy with 3-letter codes
        if (item.departureAirport) locationSection += renderMapLink('Departure Airport', item.departureAirport, 'airport');
        if (item.arrivalAirport) locationSection += renderMapLink('Arrival Airport', item.arrivalAirport, 'airport');
    } else if (category === 'transit') {
        if (item.type === 'rental_car') {
            locationSection += renderMapLink('Pick-up Location', item.departureLocation);
        } else {
            if (item.departureLocation) locationSection += renderMapLink('Departure', item.departureLocation);
            if (item.arrivalLocation) locationSection += renderMapLink('Arrival', item.arrivalLocation);
        }
    } else {
        // Stays and Activities usually have one main address/location
        const loc = item.address || item.location;
        if (loc) {
            locationSection += renderMapLink('Location', loc);
        }
    }

    // --- Cost Data ---
    let costText = '';
    if (item.cost) {
        const amount = typeof item.cost === 'object' ? item.cost.amount : item.cost;
        const currency = (typeof item.cost === 'object' ? item.cost.currency : 'USD') || 'USD';
        if (amount) {
            costText = `$${Number(amount).toLocaleString()} ${currency}`;
        }
    }

    // Smart Header: Hide type if redundant (e.g. FLIGHT • FLIGHT -> FLIGHT)
    const typeLabel = (item.type && item.type.toLowerCase() !== category.toLowerCase())
        ? `${category} • ${item.type}`
        : category;


    return `
        <div class="details-view">
            <!-- HEADER -->
            <div class="details-header">
                <div class="header-content">
                    <div class="header-icon">${getIcon(category, item.type)}</div>
                    <div class="header-text">
                        <div class="type-label">
                            ${typeLabel}
                            <div class="status-badge ${isBooked ? 'booked' : 'planned'}">
                                ${isBooked ? '✅ BOOKED' : '💭 PLANNED'}
                            </div>
                        </div>
                        <h2 class="title">${title}</h2>
                        ${subtitle ? `<div class="subtitle" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal;">${subtitle}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- BODY -->
            <div class="details-body">
                
                <!-- TIME -->
                <div class="section icon-row">
                    <div class="section-row">
                        <span class="icon">📅</span>
                        <div class="section-content">
                            ${timeSection}
                        </div>
                    </div>
                </div>

                <!-- LOCATION -->
                ${locationSection ? `
                    <div class="section icon-row">
                        <div class="section-row">
                            <span class="icon">📍</span>
                            <div class="section-content">
                                ${locationSection}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- NOTES -->
                ${item.notes ? `
                    <div class="section">
                         <div class="section-header">Notes</div>
                         <div class="notes-box">
                             ${item.notes}
                         </div>
                    </div>
                ` : ''}

                <!-- COST -->
                ${costText ? `
                    <div class="section icon-row">
                        <div class="section-row">
                             <span class="icon">💰</span>
                             <div class="section-content">
                                 <div class="cost-amount">${costText}</div>
                             </div>
                        </div>
                    </div>
                ` : ''}

            </div>

            <!-- FOOTER -->
            <div class="details-footer">
                <button class="btn btn-secondary" id="details-edit-btn" data-id="${item.id}" data-category="${category}">✏️ Edit</button>
                <button class="btn btn-primary" id="details-close-btn">Done</button>
            </div>
        </div>
    `;
}
