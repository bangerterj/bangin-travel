/**
 * ItemDetails.js
 * Renders a read-only detail view for any travel item.
 * Used in the global modal when clicking items in Calendar or Map.
 */

// Icon mapping
const getIcon = (cat, type) => {
    const map = {
        flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆',
        hotel: '🏨', airbnb: '🏠', train: '🚄', bus: '🚌', rental_car: '🚗', drive: '🚗',
        dining: '🍽️', museum: '🏛️', hike: '🥾'
    };
    return map[type] || map[cat] || '📅';
};

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

const formatType = (type) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const extractLocationString = (loc) => {
    if (!loc) return null;

    let obj = loc;
    // Check if it's a JSON string
    if (typeof loc === 'string' && (loc.startsWith('{') || loc.startsWith('['))) {
        try {
            obj = JSON.parse(loc);
        } catch (e) {
            // Not JSON, keep as string
            return loc;
        }
    }

    if (typeof obj === 'object' && obj !== null) {
        // Try common properties in order of preference
        return obj.displayName || obj.fullAddress || obj.address || obj.formatted_address || obj.name || JSON.stringify(obj);
    }
    return String(loc);
};

export function renderItemDetails(item, category) {
    const isBooked = item.status === 'booked';

    // --- Header Data ---
    let title = item.name || item.title;
    let eyebrow = category.toUpperCase();

    // Category specific title/eyebrow overrides
    if (category === 'flight') {
        title = `${item.departureAirport || '?'} ➝ ${item.arrivalAirport || '?'}`;
        eyebrow = `${item.airline || 'Flight'} • ${item.flightNumber || ''}`;
    } else if (category === 'transit') {
        // Respect custom name if present
        if (!item.name) {
            if (item.type === 'rental_car') {
                title = 'Rental Car Pick-up';
            } else if (item.departureLocation) {
                // If location strings are long, maybe truncate or handled by title display
                const dep = extractLocationString(item.departureLocation);
                const arr = extractLocationString(item.arrivalLocation);
                if (dep && arr) title = `${dep} ➝ ${arr}`;
                else title = dep || arr || 'Transit';
            }
        }

        if (item.type === 'rental_car') {
            eyebrow = item.company || 'Rental Car';
        }
    }

    // Badge Logic
    let badgeText = category.toUpperCase();
    const formattedType = formatType(item.type);

    // Only show Type if it's distinct from Category
    if (item.type && formattedType.toUpperCase() !== category.toUpperCase()) {
        badgeText = `${badgeText} • ${formattedType}`;
    }

    // --- Time Block ---
    let timeBlock = '';
    if (category === 'stay') {
        timeBlock = `
            <div class="info-grid user-select-none">
                <div class="info-cell">
                    <label>Check In</label>
                    <div class="val">${fmtDateShort(item.checkIn)}</div>
                    <div class="sub-val">${fmt(item.checkIn)}</div>
                </div>
                <div class="grid-arrow">➝</div>
                <div class="info-cell">
                    <label>Check Out</label>
                    <div class="val">${fmtDateShort(item.checkOut)}</div>
                    <div class="sub-val">${fmt(item.checkOut)}</div>
                </div>
            </div>
        `;
    } else {
        const start = item.departureTime || item.startTime || item.startAt;
        const end = item.arrivalTime || item.endTime || item.endAt;
        if (start) {
            const labelStart = category === 'flight' || category === 'transit' ? 'Depart' : 'Start';
            const labelEnd = category === 'flight' || category === 'transit' ? 'Arrive' : 'End';

            timeBlock = `
                 <div class="info-grid user-select-none">
                    <div class="info-cell">
                        <label>${labelStart}</label>
                        <div class="val">${fmtDateShort(start)}</div>
                        <div class="sub-val">${fmt(start)}</div>
                    </div>
                    ${end ? `
                        <div class="grid-arrow">➝</div>
                        <div class="info-cell">
                            <label>${labelEnd}</label>
                            <div class="val">${fmtDateShort(end)}</div>
                            <div class="sub-val">${fmt(end)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // --- Location Block ---
    let locationBlock = '';
    const renderMapLink = (addr) => `
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" 
           target="_blank" class="map-chip">Open in Maps ↗</a>
    `;

    if (category === 'flight') {
        locationBlock = `
            <div class="detail-row">
                <div class="detail-icon-col">📍</div>
                <div class="detail-content-col">
                    ${item.departureAirport ? `
                    <div class="airport-row">
                        <span>Dep: <strong>${item.departureAirport}</strong></span>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.departureAirport + ' airport')}" target="_blank" class="map-link-sm">Map</a>
                    </div>` : ''}
                    ${item.arrivalAirport ? `
                    <div class="airport-row">
                        <span>Arr: <strong>${item.arrivalAirport}</strong></span>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.arrivalAirport + ' airport')}" target="_blank" class="map-link-sm">Map</a>
                    </div>` : ''}
                </div>
            </div>
         `;
    } else {
        // Stays, Activities, Transit (non-flight)
        const depRaw = item.departureLocation;
        const arrRaw = item.arrivalLocation;
        const singleRaw = item.address || item.location;

        const depLoc = extractLocationString(depRaw);
        const arrLoc = extractLocationString(arrRaw);
        const singleLoc = extractLocationString(singleRaw || depRaw); // Fallback to dep if no address/location

        if (depLoc && arrLoc && depLoc !== arrLoc) {
            // Route View (Start -> End)
            locationBlock = `
                <div class="detail-row">
                    <div class="detail-icon-col">📍</div>
                    <div class="detail-content-col">
                        <div style="margin-bottom: 8px;">
                            <span class="sub-text" style="font-size: 10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">From</span>
                            <div class="detail-text">${depLoc}</div>
                        </div>
                        <div>
                            <span class="sub-text" style="font-size: 10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">To</span>
                            <div class="detail-text">${arrLoc}</div>
                        </div>
                        <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(depLoc)}&destination=${encodeURIComponent(arrLoc)}" 
                           target="_blank" class="map-chip" style="margin-top: 8px;">View Route ↗</a>
                    </div>
                </div>
            `;
        } else if (singleLoc) {
            // Single Location View
            locationBlock = `
                <div class="detail-row">
                    <div class="detail-icon-col">📍</div>
                    <div class="detail-content-col">
                        <div class="detail-text">${singleLoc}</div>
                        ${renderMapLink(singleLoc)}
                    </div>
                </div>
            `;
        }
    }

    // --- Travelers Block ---
    let travelersBlock = '';
    const trip = window.store?.getActiveTrip();
    let travelerNames = [];
    if (item.travelers && trip) {
        travelerNames = item.travelers.map(tid => {
            const t = trip.travelers.find(tr => tr.id === tid || tr.id === tid.id); // handle obj or id
            return t ? t.name : null;
        }).filter(Boolean);
    } else if (item.travelers && typeof item.travelers[0] === 'object') {
        travelerNames = item.travelers.map(t => t.name);
    }

    if (travelerNames.length > 0) {
        travelersBlock = `
            <div class="detail-row">
                <div class="detail-icon-col">👥</div>
                <div class="detail-content-col">
                    <div class="travelers-list">
                        ${travelerNames.map(name => `<span class="traveler-chip">${name}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // --- Cost & Payer Block ---
    let costBlock = '';
    let cost = item.cost;
    if (!cost && item.metadata?.cost) cost = item.metadata.cost;

    if (cost && (cost.amount || cost.amount === 0)) {
        let payerName = '';
        const paidById = item.paidBy || cost.paidBy || item.metadata?.cost?.paidBy;
        if (paidById && trip) {
            const p = trip.travelers.find(t => t.id === paidById);
            if (p) payerName = p.name;
        }

        const payerText = payerName ? `<span class="payer-badge">Paid by ${payerName}</span>` : '';
        const currency = cost.currency || 'USD';

        costBlock = `
            <div class="detail-row">
                <div class="detail-icon-col">💰</div>
                <div class="detail-content-col" style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="detail-text">$${Number(cost.amount).toLocaleString()} ${currency}</div>
                    ${payerText}
                </div>
            </div>
        `;
    }

    return `
        <div class="item-details-modal">
            <!-- HEADER -->
            <div class="item-details-header">
                <div class="header-main">
                    <div class="header-icon-box">${getIcon(category, item.type)}</div>
                    <div class="title-area">
                        <div class="eyebrow-badge">
                            <span class="status-dot ${isBooked ? 'booked' : 'planned'}"></span>
                            ${badgeText}
                        </div>
                        <h2>${title}</h2>
                        ${eyebrow ? `<div class="sub">${eyebrow}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- BODY -->
            <div class="item-details-body">
                ${timeBlock}
                
                <div class="detail-section">
                    ${travelersBlock}
                    
                    ${locationBlock}

                    ${costBlock}

                    ${item.notes ? `
                    <div class="notes-box">
                        <span class="notes-label">Notes</span>
                        <div class="notes-text">${item.notes}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- FOOTER -->
            <div class="item-details-footer">
                <button class="btn btn-edit" id="details-edit-btn" data-id="${item.id}" data-category="${category}">✏️ Edit</button>
                <button class="btn btn-done" id="details-close-btn">Done</button>
            </div>
        </div>
    `;
}
