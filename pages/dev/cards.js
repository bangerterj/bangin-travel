import { useEffect, useState } from 'react';
import Head from 'next/head';

// --- MOCK DATA ---
const MOCK_ITEMS = {
    // FLIGHTS
    flightStandard: {
        id: 'f1', type: 'departure', airline: 'United Airlines', flightNumber: 'UA 875',
        departureAirport: 'SFO', arrivalAirport: 'HND',
        departureTime: '2026-01-19T10:30', arrivalTime: '2026-01-20T14:45',
        duration: '11h 15m', travelers: ['t1', 't2'],
        status: 'booked',
        cost: { amount: 1200, currency: 'USD' }
    },
    flightOvernight: {
        id: 'f2', type: 'departure', airline: 'Singapore Airlines', flightNumber: 'SQ 033',
        departureAirport: 'SFO (San Francisco)', arrivalAirport: 'SIN (Singapore)',
        departureTime: '2026-01-20T22:00', arrivalTime: '2026-01-22T05:30', // +2 days
        duration: '17h 30m', travelers: ['t1'],
        status: 'booked'
    },

    // STAYS
    stayHotel: {
        id: 's1', type: 'hotel', name: 'Shinjuku Granbell Hotel',
        address: '2-14-5 Kabukicho, Shinjuku, Tokyo',
        checkIn: '2026-01-20T15:00', checkOut: '2026-01-25T11:00',
        travelers: ['t1', 't2', 't3'], status: 'booked',
        cost: { amount: 800, currency: 'USD' }
    },
    stayAirbnb: {
        id: 's2', type: 'airbnb', name: 'Cozy Loft in Shimokitazawa w/ Roof Deck',
        address: 'Setagaya City, Tokyo',
        checkIn: '2026-01-25T16:00', checkOut: '2026-01-27T10:00',
        notes: 'Lockbox: 1234', travelers: ['t1', 't2'],
        status: 'planned'
    },

    // TRANSIT
    transitTrain: {
        id: 'tr1', type: 'train', name: 'Narita Express 34',
        departureLocation: 'NRT T1', arrivalLocation: 'Shinjuku Station',
        departureTime: '2026-01-20T15:30', arrivalTime: '2026-01-20T16:50',
        travelers: ['t1', 't2'], status: 'booked',
        route: 'Car 5, Seat 12-A'
    },
    transitRental: {
        id: 'tr3', type: 'rental_car', name: 'Toyota Rent-a-Car',
        departureLocation: 'Kyoto Station', arrivalLocation: 'Osaka Station',
        departureTime: '2026-01-27T10:00', arrivalTime: '2026-01-28T18:00',
        travelers: ['t1', 't2'], status: 'booked',
        notes: 'Compact Class'
    },

    // ACTIVITIES
    activityStandard: {
        id: 'a1', type: 'activity', name: 'TeamLabs Planets',
        location: 'Toyosu, Tokyo',
        startTime: '2026-01-21T10:00', endTime: '2026-01-21T12:00',
        status: 'booked', travelers: ['t1', 't2', 't3']
    }
};

// --- HELPERS ---
const getIcon = (cat, type) => {
    const map = {
        flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆',
        airbnb: '🏠', hostel: '🛏️', train: '🚄', bus: '🚌', rental_car: '🚗',
        dining: '🍽️'
    };
    return map[type] || map[cat] || '❓';
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const getMapLink = (location) => {
    if (!location) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};

// ============================================
// MAIN REUSABLE COMPONENT: "EYEBROW" CARD
// ============================================
function UnifiedCard({ item, category }) {
    const isBooked = item.status === 'booked';

    // --- 1. Top Row (Eyebrow) ---
    let statusText = isBooked ? 'BOOKED' : 'PLAN';
    let contextText = '';

    if (category === 'flight') {
        contextText = item.airline;
    } else if (category === 'stay') {
        contextText = item.type === 'airbnb' ? 'Airbnb' :
            item.type === 'hostel' ? 'Hostel' : 'Hotel';
    } else if (category === 'transit') {
        contextText = item.type === 'rental_car' ? 'Rental' :
            item.type === 'train' ? 'Train' : 'Transit';
    } else if (category === 'activity') {
        contextText = 'Activity';
    }

    const eyebrow = `${statusText} • ${contextText}`.toUpperCase();

    // --- 2. Main Title & Subtitle ---
    let title = item.name;
    let subtitle = '';
    let mapLocation = null;

    if (category === 'flight') {
        title = `${item.departureAirport} ➝ ${item.arrivalAirport}`;
        // Usually airports don't need map links in the main card, but we could add if needed
    } else if (category === 'transit') {
        if (item.type === 'rental_car') {
            title = item.name;
            subtitle = `Pick-up: ${item.departureLocation}`;
            mapLocation = item.departureLocation;
        } else {
            title = `${item.name}`;
            subtitle = `${item.departureLocation} ➝ ${item.arrivalLocation}`;
            mapLocation = item.arrivalLocation;
        }
    } else if (category === 'stay') {
        title = item.name;
        subtitle = item.address;
        mapLocation = item.address || item.name;
    } else if (category === 'activity') {
        title = item.name;
        subtitle = item.location;
        mapLocation = item.location || item.name;
    }

    // --- 3. Meta Row (Dates/Times) ---
    let meta = [];

    if (category === 'flight') {
        const d1 = new Date(item.departureTime);
        const d2 = new Date(item.arrivalTime);
        const sameDay = d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();

        if (sameDay) {
            meta.push({ text: `${fmtTime(d1)} - ${fmtTime(d2)}` });
            meta.push({ text: fmtDate(d1) });
        } else {
            meta.push({ text: `${fmtDate(d1)} ${fmtTime(d1)} ➝ ${fmtDate(d2)} ${fmtTime(d2)}` });
        }
        meta.push({ text: item.duration });

    } else if (category === 'stay') {
        meta.push({ text: `In: ${fmtDate(item.checkIn)}` });
        meta.push({ text: `Out: ${fmtDate(item.checkOut)}` });
        const nights = Math.ceil((new Date(item.checkOut) - new Date(item.checkIn)) / (86400000));
        meta.push({ text: `${nights}n` });

    } else if (category === 'transit') {
        meta.push({ text: `${fmtTime(item.departureTime)} - ${fmtTime(item.arrivalTime)}` });
        meta.push({ text: fmtDate(item.departureTime) });
        if (item.route) meta.push({ text: item.route });

    } else if (category === 'activity') {
        meta.push({ text: `${fmtTime(item.startTime)} - ${fmtTime(item.endTime)}` });
        meta.push({ text: fmtDate(item.startTime) });
    }

    const mapLink = getMapLink(mapLocation);

    return (
        <div className={`unified-card ${isBooked ? 'booked' : ''}`}>
            <div className="card-left">
                <div className="card-icon">{getIcon(category, item.type)}</div>
            </div>

            <div className="card-right">
                <div className="eyebrow-row">
                    <span className={`status-text ${isBooked ? 'text-green' : 'text-gray'}`}>
                        {eyebrow}
                    </span>
                </div>

                <h3 className="card-title">{title}</h3>

                {subtitle && <div className="card-subtitle">{subtitle}</div>}

                <div className="meta-grid">
                    {meta.map((m, i) => (
                        <span key={i} className="meta-item">
                            {m.text}
                        </span>
                    ))}
                </div>
            </div>

            <div className="card-actions">
                {mapLink && (
                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-action map-btn" title="Open in Maps">
                        🗺️
                    </a>
                )}
                <button className="btn-action edit-btn" title="Edit Item">✏️</button>
            </div>
        </div>
    );
}

export default function CardSandbox() {
    return (
        <div className="sandbox-page">
            <Head>
                <title>Final Card Design with Maps</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
            </Head>

            <header>
                <h1>Eyebrow Card + Native Maps</h1>
                <p>Status above title. "Open in Maps" button for locations.</p>
            </header>

            <main>
                <section>
                    <h2>Flights (No Maps)</h2>
                    <UnifiedCard item={MOCK_ITEMS.flightStandard} category="flight" />
                    <UnifiedCard item={MOCK_ITEMS.flightOvernight} category="flight" />
                </section>

                <section>
                    <h2>Stays (With Maps)</h2>
                    <UnifiedCard item={MOCK_ITEMS.stayHotel} category="stay" />
                    <UnifiedCard item={MOCK_ITEMS.stayAirbnb} category="stay" />
                </section>

                <section>
                    <h2>Transit & Activities</h2>
                    <UnifiedCard item={MOCK_ITEMS.transitTrain} category="transit" />
                    <UnifiedCard item={MOCK_ITEMS.transitRental} category="transit" />
                    <UnifiedCard item={MOCK_ITEMS.activityStandard} category="activity" />
                </section>
            </main>

            <style jsx global>{`
                * { box-sizing: border-box; }
                body {
                    background: #f3f4f6;
                    font-family: 'Inter', sans-serif;
                    padding: 16px;
                    margin: 0;
                    color: #1f2937;
                }
                h1 { font-size: 18px; margin: 0 0 4px 0; }
                p { font-size: 13px; color: #6b7280; margin: 0 0 24px 0; }
                h2 { 
                    font-size: 11px; text-transform: uppercase; 
                    letter-spacing: 0.05em; color: #9ca3af; 
                    margin: 24px 0 8px 0; font-weight: 700; 
                }

                .unified-card {
                    display: flex;
                    background: white;
                    border-radius: 12px;
                    padding: 12px;
                    gap: 12px;
                    align-items: flex-start;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                    border: 1px solid #e5e7eb;
                    margin-bottom: 12px;
                    position: relative;
                }
                .unified-card.booked {
                     border-color: #d1fae5;  
                     background: linear-gradient(to bottom right, #f0fdf4 0%, #ffffff 40%);
                }

                .card-left { flex-shrink: 0; }
                .card-icon {
                    width: 36px; height: 36px;
                    background: #f3f4f6;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px;
                }

                .card-right { 
                    flex: 1; 
                    min-width: 0; 
                }

                .eyebrow-row {
                    margin-bottom: 3px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    line-height: 1;
                }
                .text-green { color: #059669; }
                .text-gray { color: #9ca3af; }

                .card-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 700;
                    color: #111827;
                    line-height: 1.35;
                }

                .card-subtitle {
                    font-size: 13px;
                    color: #6b7280;
                    margin-top: 2px;
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis;
                }

                .meta-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 12px;
                    margin-top: 6px;
                }
                .meta-item {
                    font-size: 11px;
                    color: #4b5563;
                    background: #f9fafb;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .card-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: -2px;
                }
                .btn-action {
                    border: none;
                    background: #f3f4f6;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    text-decoration: none;
                }
                .btn-action:hover {
                    background: #e5e7eb;
                }
                .map-btn {
                    background: #eff6ff;
                }
                .map-btn:hover {
                    background: #dbeafe;
                }
                .edit-btn {
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}
