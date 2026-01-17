import { useState } from 'react';
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
        cost: { amount: 1200, currency: 'USD', paidBy: 't1' },
        notes: 'Vegetarian meal requested for Sarah.'
    },
    // STAYS
    stayHotel: {
        id: 's1', type: 'hotel', name: 'Shinjuku Granbell Hotel',
        address: '2-14-5 Kabukicho, Shinjuku, Tokyo',
        checkIn: '2026-01-20T15:00', checkOut: '2026-01-25T11:00',
        travelers: ['t1', 't2', 't3'], status: 'booked',
        cost: { amount: 800, currency: 'USD', paidBy: 't2' },
        notes: 'Late check-in approved. Door code: 8888'
    },
    // ACTIVITIES
    activityStandard: {
        id: 'a1', type: 'activity', name: 'TeamLabs Planets',
        location: 'Toyosu, Tokyo',
        startTime: '2026-01-21T10:00', endTime: '2026-01-21T12:00',
        status: 'planned', travelers: ['t1', 't2', 't3', 't4'],
        cost: { amount: 35, currency: 'USD', paidBy: 't1' },
        notes: 'Wear shorts, water happens.',
        links: ['https://teamlabs.art']
    }
};

const TRAVELERS = {
    't1': { name: 'John Doe', color: '#e74c3c' },
    't2': { name: 'Sarah G', color: '#3498db' },
    't3': { name: 'Alex M', color: '#f1c40f' },
    't4': { name: 'Dan K', color: '#9b59b6' }
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

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

// ============================================
// ITEM DETAILS COMPONENT (Draft)
// ============================================
function ItemDetailsModal({ item, category, onClose }) {
    if (!item) return null;

    const isBooked = item.status === 'booked';

    // Header
    let icon = getIcon(category, item.type);
    let title = item.name;
    let subtitle = '';

    // Specific logic per type
    if (category === 'flight') {
        title = `${item.departureAirport} ➝ ${item.arrivalAirport}`;
        subtitle = `${item.airline} • ${item.flightNumber}`;
    } else if (category === 'stay') {
        subtitle = item.address;
    } else if (category === 'activity') {
        subtitle = item.location;
    }

    // Cost text
    const costText = item.cost ? `$${item.cost.amount.toLocaleString()}` : '';
    const payer = item.cost?.paidBy ? TRAVELERS[item.cost.paidBy]?.name : '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="details-header">
                    <div className={`status-badge ${isBooked ? 'booked' : 'planned'}`}>
                        {isBooked ? '✅ BOOKED' : '💭 PLANNED'}
                    </div>
                    <div className="header-content">
                        <div className="header-icon">{icon}</div>
                        <div className="header-text">
                            <div className="type-label">{category.toUpperCase()} • {item.type?.toUpperCase()}</div>
                            <h2 className="title">{title}</h2>
                            {subtitle && <div className="subtitle">{subtitle}</div>}
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="details-body">

                    {/* TIME SECTION */}
                    <div className="section">
                        <div className="section-row">
                            <span className="icon">📅</span>
                            <div className="section-content">
                                {(category === 'stay') ? (
                                    <>
                                        <div className="time-row"><strong>Check In:</strong> {fmtDate(item.checkIn)} at {fmtTime(item.checkIn)}</div>
                                        <div className="time-row"><strong>Check Out:</strong> {fmtDate(item.checkOut)} at {fmtTime(item.checkOut)}</div>
                                    </>
                                ) : (category === 'flight') ? (
                                    <>
                                        <div className="time-row"><strong>Depart:</strong> {fmtDate(item.departureTime)} • {fmtTime(item.departureTime)}</div>
                                        <div className="time-row"><strong>Arrive:</strong> {fmtDate(item.arrivalTime)} • {fmtTime(item.arrivalTime)}</div>
                                        <div className="sub-text">Duration: {item.duration}</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="time-row">{fmtDate(item.startTime)}</div>
                                        <div className="time-row">{fmtTime(item.startTime)} - {fmtTime(item.endTime)}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LOCATION SECTION */}
                    {(item.address || item.location || item.arrivalAirport) && (
                        <div className="section">
                            <div className="section-row">
                                <span className="icon">📍</span>
                                <div className="section-content">
                                    <div className="location-text">
                                        {item.address || item.location || (item.arrivalAirport ? `${item.arrivalAirport} (Arrival)` : '')}
                                    </div>
                                    <a href="#" className="map-link">Open in Maps ↗</a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRAVELERS SECTION */}
                    {item.travelers && (
                        <div className="section">
                            <div className="section-header">Who's Going</div>
                            <div className="traveler-list">
                                {item.travelers.map(tid => {
                                    const t = TRAVELERS[tid];
                                    return (
                                        <div key={tid} className="traveler-chip" style={{ backgroundColor: t.color + '20', color: t.color, borderColor: t.color }}>
                                            {t.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* COST SECTION */}
                    {item.cost && (
                        <div className="section">
                            <div className="section-row">
                                <span className="icon">💰</span>
                                <div className="section-content">
                                    <div className="cost-amount">{costText}</div>
                                    {payer && <div className="sub-text">Paid by {payer}</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOTES SECTION */}
                    {item.notes && (
                        <div className="section">
                            <div className="section-header">Notes</div>
                            <div className="notes-box">
                                {item.notes}
                            </div>
                        </div>
                    )}

                    {/* LINKS */}
                    {item.links && (
                        <div className="section">
                            <div className="section-header">Links</div>
                            {item.links.map(l => (
                                <a key={l} href={l} className="link-item" target="_blank">🔗 {l}</a>
                            ))}
                        </div>
                    )}

                </div>

                {/* FOOTER ACTIONS */}
                <div className="details-footer">
                    <button className="btn btn-secondary">✏️ Edit</button>
                    <button className="btn btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }
                .modal-card {
                    background: white;
                    width: 100%; max-width: 400px;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    display: flex; flex-direction: column;
                    max-height: 85vh;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                /* HEADER */
                .details-header {
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid #f0f0f0;
                    position: relative;
                }
                .status-badge {
                    position: absolute; top: 16px; right: 48px;
                    font-size: 10px; font-weight: 800;
                    padding: 4px 8px; border-radius: 20px;
                    text-transform: uppercase; letter-spacing: 0.05em;
                }
                .status-badge.booked { background: #dcfce7; color: #166534; }
                .status-badge.planned { background: #f3f4f6; color: #6b7280; }

                .close-btn {
                    position: absolute; top: 12px; right: 12px;
                    background: none; border: none;
                    font-size: 24px; color: #9ca3af;
                    cursor: pointer; width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%;
                }
                .close-btn:hover { background: #f3f4f6; }

                .header-content { display: flex; gap: 16px; align-items: flex-start; }
                .header-icon {
                    font-size: 32px; 
                    background: #f8fafc; 
                    width: 56px; height: 56px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 16px;
                }
                .type-label {
                    font-size: 11px; font-weight: 700; color: #94a3b8;
                    text-transform: uppercase; margin-bottom: 4px;
                }
                .title {
                    font-size: 18px; font-weight: 800; color: #1e293b;
                    margin: 0; line-height: 1.3;
                }
                .subtitle {
                    font-size: 14px; font-weight: 500; color: #64748b; margin-top: 4px;
                }

                /* BODY */
                .details-body {
                    padding: 24px;
                    overflow-y: auto;
                    display: flex; flex-direction: column; gap: 24px;
                }
                .section-header {
                    font-size: 12px; font-weight: 700; color: #94a3b8;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    margin-bottom: 8px;
                }
                .section-row { display: flex; gap: 12px; }
                .icon { font-size: 18px; width: 24px; text-align: center; }
                .section-content { flex: 1; font-size: 14px; color: #334155; }
                
                .time-row { margin-bottom: 2px; }
                .sub-text { font-size: 12px; color: #94a3b8; margin-top: 2px; }
                
                .location-text { font-weight: 500; margin-bottom: 4px; }
                .map-link {
                    font-size: 12px; color: #3b82f6; text-decoration: none; font-weight: 600;
                    display: inline-block; padding: 4px 8px; background: #eff6ff; 
                    border-radius: 6px;
                }

                .traveler-list { display: flex; flex-wrap: wrap; gap: 8px; }
                .traveler-chip {
                    padding: 4px 10px; border-radius: 20px;
                    font-size: 12px; font-weight: 600;
                    border: 1px solid;
                }

                .cost-amount { font-size: 16px; font-weight: 700; color: #1e293b; }

                .notes-box {
                    background: #fffbeb; color: #92400e;
                    padding: 12px; border-radius: 8px;
                    font-size: 14px; line-height: 1.5;
                }

                .link-item {
                    display: block; font-size: 13px; color: #3b82f6; 
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }

                /* FOOTER */
                .details-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #f0f0f0;
                    background: #f8fafc;
                    display: flex; gap: 12px;
                }
                .btn {
                    flex: 1; padding: 12px; border-radius: 10px;
                    font-weight: 600; cursor: pointer; border: none;
                    transition: all 0.2s;
                }
                .btn-primary { background: #0f172a; color: white; }
                .btn-primary:hover { background: #334155; }
                .btn-secondary { background: white; border: 1px solid #cbd5e1; color: #475569; }
                .btn-secondary:hover { background: #f1f5f9; }

            `}</style>
        </div>
    );
}

export default function DetailsSandbox() {
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const open = (item, cat) => {
        setSelectedItem(item);
        setSelectedCategory(cat);
    };

    return (
        <div className="sandbox-page">
            <Head>
                <title>Event Details Modal Prototype</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
            </Head>

            <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1>Modal Prototype</h1>
                <p>Click an item to view its detail modal.</p>
            </header>

            <main style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button className="preview-card" onClick={() => open(MOCK_ITEMS.flightStandard, 'flight')}>
                    ✈️ View Flight Details (Standard)
                </button>
                <button className="preview-card" onClick={() => open(MOCK_ITEMS.stayHotel, 'stay')}>
                    🏨 View Stay Details
                </button>
                <button className="preview-card" onClick={() => open(MOCK_ITEMS.activityStandard, 'activity')}>
                    📍 View Activity Details
                </button>
            </main>

            {selectedItem && (
                <ItemDetailsModal
                    item={selectedItem}
                    category={selectedCategory}
                    onClose={() => setSelectedItem(null)}
                />
            )}

            <style jsx global>{`
                body {
                    background: #f3f4f6;
                    font-family: 'Inter', sans-serif;
                    padding: 40px 20px;
                    margin: 0;
                    color: #1f2937;
                }
                h1 { margin: 0 0 8px; }
                .preview-card {
                    padding: 20px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    text-align: left;
                    font-size: 16px; font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .preview-card:hover {
                    border-color: #9ca3af;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
            `}</style>
        </div>
    );
}
