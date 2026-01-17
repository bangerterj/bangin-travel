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

    // --- Cost Data ---
    // Note: 'cost' might be a number or an object { amount, currency, paidBy }
    // We handle mostly the object structure or simple number fallback
    let costText = '';
    let payer = '';
    if (item.cost) {
        const amount = typeof item.cost === 'object' ? item.cost.amount : item.cost;
        const currency = (typeof item.cost === 'object' ? item.cost.currency : 'USD') || 'USD';
        const paidById = typeof item.cost === 'object' ? item.cost.paidBy : null;

        if (amount) {
            costText = `$${Number(amount).toLocaleString()} ${currency}`;
        }
        // TODO: Resolve paidBy ID to Name if store available? 
        // For now we just show the ID or skip it if we can't look it up easily here.
        // We'll skip payer name lookup for MVP in this view unless we pass the whole store.
    }


    return `
        <div class="details-view">
            <!-- HEADER -->
            <div class="details-header">
                <div class="status-badge ${isBooked ? 'booked' : 'planned'}">
                    ${isBooked ? '✅ BOOKED' : '💭 PLANNED'}
                </div>
                <div class="header-content">
                    <div class="header-icon">${getIcon(category, item.type)}</div>
                    <div class="header-text">
                        <div class="type-label">${category} • ${item.type || 'Standard'}</div>
                        <h2 class="title">${title}</h2>
                        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- BODY -->
            <div class="details-body">
                
                <!-- TIME -->
                <div class="section">
                    <div class="section-row">
                        <span class="icon">📅</span>
                        <div class="section-content">
                            ${timeSection}
                        </div>
                    </div>
                </div>

                <!-- LOCATION -->
                ${(item.address || item.location || item.arrivalAirport) ? `
                    <div class="section">
                        <div class="section-row">
                            <span class="icon">📍</span>
                            <div class="section-content">
                                <div class="location-text">
                                    ${item.address || item.location || (item.arrivalAirport ? `${item.arrivalAirport} (Arrival)` : '')}
                                </div>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address || item.location || item.arrivalAirport)}" 
                                   target="_blank" class="map-link">Open in Maps ↗</a>
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
                    <div class="section">
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
