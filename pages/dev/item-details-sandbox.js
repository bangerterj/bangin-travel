import { useEffect, useRef } from 'react';

export default function ItemDetailsSandbox() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            renderItemDetailsSandbox(containerRef.current);
        }
    }, []);

    return <div ref={containerRef} />;
}

export function renderItemDetailsSandbox(container) {
    container.innerHTML = `
        <div style="padding: 20px; background: #f0f2f5; min-height: 100vh;">
            <h1>Item Details Sandbox</h1>
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <button class="btn-primary" onclick="showMock('flight')">Flight</button>
                <button class="btn-primary" onclick="showMock('stay')">Stay</button>
                <button class="btn-primary" onclick="showMock('activity')">Activity</button>
                <button class="btn-primary" onclick="showMock('transit')">Transit</button>
            </div>
            <div id="sandbox-modal-container" style="position: relative; height: 600px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;">
                <!-- Modal will be injected here -->
            </div>
        </div>
    `;

    window.showMock = (type) => {
        const mockData = getMockData(type);
        const modalHtml = renderRefinedItemDetails(mockData, type);
        const modalContainer = document.getElementById('sandbox-modal-container');
        modalContainer.innerHTML = `
            <div class="modal-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                    ${modalHtml}
                </div>
            </div>
        `;
    };
}

// --- NEW DESIGN PROPOSAL ---
// Pretending to be an expert UI designer
function renderRefinedItemDetails(item, category) {
    const isBooked = item.status === 'booked';

    // Icon mapping
    const icons = {
        flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆',
        hotel: '🏨', airbnb: '🏠', train: '🚄', bus: '🚌'
    };
    const icon = icons[item.type] || icons[category] || '📅';

    // Header logic
    let title = item.name || item.title;
    let eyebrow = category.toUpperCase();

    if (category === 'flight') {
        title = `${item.departureAirport} ➝ ${item.arrivalAirport}`;
        eyebrow = `${item.airline} • ${item.flightNumber}`;
    }

    // Date formatting helper
    const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const fmtDateShort = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Time Section Rendering
    let timeBlock = '';
    if (category === 'stay') {
        timeBlock = `
            <div class="info-grid user-select-none">
                <div class="info-cell">
                    <label>Check In</label>
                    <div class="val">${fmtDateShort(item.checkIn)}</div>
                    <div class="sub-val">${fmt(item.checkIn)}</div>
                </div>
                <div class="arrow">➝</div>
                <div class="info-cell">
                    <label>Check Out</label>
                    <div class="val">${fmtDateShort(item.checkOut)}</div>
                    <div class="sub-val">${fmt(item.checkOut)}</div>
                </div>
            </div>
        `;
    } else {
        const start = item.departureTime || item.startTime;
        const end = item.arrivalTime || item.endTime;
        timeBlock = `
             <div class="info-grid user-select-none">
                <div class="info-cell">
                    <label>${category === 'flight' ? 'Depart' : 'Start'}</label>
                    <div class="val">${fmtDateShort(start)}</div>
                    <div class="sub-val">${fmt(start)}</div>
                </div>
                <div class="arrow">➝</div>
                <div class="info-cell">
                    <label>${category === 'flight' ? 'Arrive' : 'End'}</label>
                    <div class="val">${fmtDateShort(end)}</div>
                    <div class="sub-val">${fmt(end)}</div>
                </div>
            </div>
        `;
    }

    // Location Rendering
    let locationBlock = '';
    if (item.address || item.location) {
        locationBlock = `
            <div class="detail-row">
                <div class="icon-col">📍</div>
                <div class="content-col">
                    <div class="loc-text">${item.address || item.location}</div>
                    <a href="#" class="map-chip">Open in Maps ↗</a>
                </div>
            </div>
        `;
    }
    if (category === 'flight') {
        locationBlock = `
            <div class="detail-row">
                <div class="icon-col">📍</div>
                <div class="content-col">
                    <div class="airport-row">
                        <span>Dep: <strong>${item.departureAirport}</strong></span>
                        <a href="#" class="map-link-sm">Map</a>
                    </div>
                    <div class="airport-row">
                        <span>Arr: <strong>${item.arrivalAirport}</strong></span>
                        <a href="#" class="map-link-sm">Map</a>
                    </div>
                </div>
            </div>
         `;
    }

    // Travelers Rendering
    let travelersBlock = '';
    if (item.travelers && item.travelers.length > 0) {
        travelersBlock = `
            <div class="detail-row">
                <div class="icon-col">👥</div>
                <div class="content-col">
                    <div class="travelers-list">
                        ${item.travelers.map(t => `<span class="traveler-chip">${t.name}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Cost & Payer Rendering
    let costBlock = '';
    if (item.cost) {
        const payerText = item.paidBy ? `<span class="payer-badge">Paid by ${item.paidBy}</span>` : '';
        costBlock = `
            <div class="detail-row">
                <div class="icon-col">💰</div>
                <div class="content-col" style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="loc-text">$${Number(item.cost.amount).toLocaleString()} ${item.cost.currency}</div>
                    ${payerText}
                </div>
            </div>
        `;
    }

    return `
        <style>
            .refined-modal { 
                font-family: 'Inter', sans-serif; 
                color: #1f2937;
                display: flex;
                flex-direction: column;
                max-height: 90vh; /* Safety cap */
            }
            .modal-header { 
                background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
                padding: 24px;
                border-bottom: 1px solid #e5e7eb;
                position: relative;
                flex-shrink: 0;
            }
            .close-btn { position: absolute; top: 16px; right: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; color: #6b7280; font-size: 18px; display: flex; align-items: center; justify-content: center;}
            
            .header-main { display: flex; align-items: flex-start; gap: 16px; margin-top: 8px; }
            .big-icon { 
                font-size: 32px; 
                background: white; 
                width: 56px; height: 56px; 
                border-radius: 16px; 
                display: flex; align-items: center; justify-content: center; 
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                flex-shrink: 0; 
            }
            
            .eyebrow-badge { 
                display: inline-flex; align-items: center; gap: 6px;
                background: white; padding: 4px 10px; border-radius: 20px; 
                font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #eef2ff;
                margin-bottom: 8px;
            }
            .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
            .status-dot.planned { background: #9ca3af; }

            .title-area h2 { 
                margin: 0; 
                font-size: 18px; 
                font-weight: 800; 
                line-height: 1.3; 
                color: #111827; 
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .title-area .sub { margin-top: 4px; font-size: 13px; color: #6b7280; font-weight: 500; }

            .modal-body { 
                padding: 0; 
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            .info-grid { 
                display: flex; align-items: center; justify-content: space-between; 
                padding: 16px 20px; background: #fff;
                border-bottom: 1px solid #f3f4f6;
            }
            .info-cell { display: flex; flex-direction: column; }
            .info-cell label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; margin-bottom: 4px; }
            .info-cell .val { font-size: 15px; font-weight: 700; color: #374151; }
            .info-cell .sub-val { font-size: 13px; color: #6b7280; }
            .arrow { color: #d1d5db; font-size: 16px; margin: 0 8px; }

            .detail-section { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
            
            .detail-row { display: flex; gap: 12px; }
            .icon-col { font-size: 18px; width: 24px; text-align: center; color: #9ca3af; padding-top: 2px; }
            .content-col { flex: 1; min-width: 0; } /* min-width 0 allows text truncation to work flex children */
            
            .loc-text { font-size: 14px; color: #374151; line-height: 1.5; font-weight: 500; word-break: break-word; }
            .map-chip { display: inline-flex; margin-top: 6px; font-size: 12px; font-weight: 600; color: #2563eb; text-decoration: none; background: #eff6ff; padding: 4px 8px; border-radius: 6px; }
            
            .notes-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 12px 16px; margin-top: 8px;}
            .notes-label { font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 4px; display: block;}
            .notes-text { font-size: 14px; color: #92400e; line-height: 1.5; white-space: pre-wrap; }

            .airport-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; }
            .map-link-sm { font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 600; background: #eff6ff; padding: 2px 8px; border-radius: 4px;}

            .travelers-list { display: flex; flex-wrap: wrap; gap: 6px; }
            .traveler-chip { background: #f3f4f6; color: #4b5563; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 600; }
            
            .payer-badge { font-size: 12px; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 4px; display: inline-block; width: fit-content; font-weight: 500; margin-top: 4px; }

            .modal-footer { 
                padding: 16px 20px; 
                background: #fff; 
                border-top: 1px solid #f3f4f6; 
                display: flex; 
                gap: 12px; 
                flex-shrink: 0;
                padding-bottom: calc(16px + env(safe-area-inset-bottom)); /* Safe area for mobile */
            }
            .btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none; font-size: 15px; }
            .btn-edit { background: #f3f4f6; color: #374151; }
            .btn-done { background: #f59e0b; color: white; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3); }

            /* Mobile Optimizations */
            @media (max-width: 480px) {
                .modal-content {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-radius: 20px 20px 0 0 !important;
                    position: absolute !important;
                    bottom: 0 !important;
                    top: auto !important;
                    max-height: 85vh !important;
                }
                .modal-overlay {
                    align-items: flex-end !important; /* Align to bottom */
                }
                .big-icon { width: 48px; height: 48px; font-size: 24px; }
                .title-area h2 { font-size: 18px; }
            }
        </style>

        <div class="refined-modal">
            <div class="modal-header">
                <button class="close-btn">×</button>
                <div class="eyebrow-badge">
                    <span class="status-dot ${isBooked ? 'booked' : 'planned'}"></span>
                    ${category} • ${item.type || 'Standard'}
                </div>
                <div class="header-main">
                    <div class="big-icon">${icon}</div>
                    <div class="title-area">
                        <h2>${title}</h2>
                        ${eyebrow ? `<div class="sub">${eyebrow}</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="modal-body">
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

            <div class="modal-footer">
                <button class="btn btn-edit">Edit</button>
                <button class="btn btn-done">Done</button>
            </div>
        </div>
    `;
}

function getMockData(type) {
    if (type === 'flight') {
        return {
            id: 'f1',
            type: 'departure',
            airline: 'Delta',
            flightNumber: 'DL123',
            departureAirport: 'SFO',
            arrivalAirport: 'JFK',
            departureTime: '2026-02-15T08:00',
            arrivalTime: '2026-02-15T16:30',
            duration: '5h 30m',
            status: 'booked',
            cost: { amount: 450, currency: 'USD' },
            paidBy: 'John Doe',
            travelers: [{ name: 'John Doe' }, { name: 'Jane Smith' }],
            notes: 'Seat 12A. Vegetarian meal requested.'
        };
    }
    if (type === 'stay') {
        return {
            id: 's1',
            type: 'hotel',
            name: 'Hotel Emblem San Francisco, a Viceroy Urban Retreat',
            address: '562 Sutter St, San Francisco, California 94102, United States',
            checkIn: '2026-02-15T15:00',
            checkOut: '2026-02-20T11:00',
            status: 'booked',
            cost: { amount: 1200, currency: 'USD' },
            paidBy: 'Main Corp',
            travelers: [{ name: 'John Doe' }, { name: 'Jane Smith' }],
            notes: 'Reservation #5338883. Room Type: Queen Room, Accessible. Guests: 2 Adults, 0 Children.'
        };
    }
    if (type === 'activity') {
        return {
            id: 'a1',
            type: 'museum',
            name: 'SFMOMA',
            location: '151 3rd St, San Francisco, CA 94103',
            startTime: '2026-02-16T10:00',
            endTime: '2026-02-16T13:00',
            status: 'planned',
            cost: { amount: 25, currency: 'USD' },
            paidBy: 'Jane Smith',
            travelers: [{ name: 'Jane Smith' }],
            notes: 'Buy tickets online to skip the line.'
        };
    }
    if (type === 'transit') {
        return {
            id: 't1',
            type: 'train',
            name: 'Caltrain Express',
            departureLocation: 'San Jose Diridon',
            arrivalLocation: 'San Francisco 4th & King',
            departureTime: '2026-02-17T09:00',
            arrivalTime: '2026-02-17T10:05',
            status: 'planned',
            cost: { amount: 12.50, currency: 'USD' },
            travelers: [{ name: 'John Doe' }]
        };
    }
}
