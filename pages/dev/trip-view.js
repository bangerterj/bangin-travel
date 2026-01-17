import { useState, useCallback, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Timeline from '../../public/components/sandbox/Timeline';
import MapView from '../../public/components/sandbox/Map';
import UnifiedModal from '../../public/components/sandbox/UnifiedModal';

// Mock data generation
const generateMockItems = () => {
    const items = [];
    const types = ['activity', 'flight', 'stay', 'transit'];
    const baseDate = new Date(2026, 0, 19); // Jan 19, 2026

    // Generate 20 items distributed over 7 days
    for (let i = 0; i < 20; i++) {
        const dayOffset = Math.floor(Math.random() * 7);
        const date = new Date(baseDate);
        date.setDate(date.getDate() + dayOffset);

        const startHour = 8 + Math.floor(Math.random() * 12); // 8am - 8pm
        const duration = 1 + Math.floor(Math.random() * 2);

        const type = types[Math.floor(Math.random() * types.length)];

        const dateStr = date.toISOString().split('T')[0];

        items.push({
            id: `mock-${i}`,
            type,
            title: `${type} @ Day ${dayOffset + 1}`,
            startTime: `${dateStr}T${String(startHour).padStart(2, '0')}:00:00`,
            endTime: `${dateStr}T${String(startHour + duration).padStart(2, '0')}:00:00`,
            // Add locations for map
            location: {
                displayName: type === 'flight' ? 'Airport' : `Place ${i}`,
                coordinates: {
                    lat: 35.6762 + (Math.random() - 0.5) * 0.1,
                    lng: 139.6503 + (Math.random() - 0.5) * 0.1
                }
            }
        });
    }
    return items;
};

function getDaysBetween(startDate, endDate) {
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

export default function TripViewSandbox() {
    const [items, setItems] = useState([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Initialize with mock data
    useEffect(() => {
        setItems(generateMockItems());
    }, []);

    // Calculate Days
    const days = useMemo(() => {
        const baseDate = new Date(2026, 0, 19);
        const start = new Date(baseDate);
        start.setDate(baseDate.getDate() + (weekOffset * 7));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return getDaysBetween(start, end);
    }, [weekOffset]);

    // Handlers
    const handleDragCreate = useCallback(({ date, startTime, endTime }) => {
        const dateStr = date.toISOString().split('T')[0];
        setEditingItem({
            startDate: dateStr,
            endDate: dateStr,
            startTime: startTime, // already HH:MM
            endTime: endTime,
            type: 'activity' // default
        });
        setModalOpen(true);
    }, []);

    const handleEditItem = useCallback((item) => {
        setEditingItem(item);
        setModalOpen(true);
        setSelectedId(item.id);
    }, []);

    const handleSave = useCallback((data) => {
        // Construct ISO strings properly
        const startISO = `${data.startDate}T${data.startTime}:00`;
        const endISO = `${data.endDate}T${data.endTime}:00`;

        const enrichedData = {
            ...data,
            startTime: startISO,
            endTime: endISO
        };

        if (data.id) {
            // Update
            setItems(prev => prev.map(i => i.id === data.id ? { ...i, ...enrichedData } : i));
        } else {
            // Create
            setItems(prev => [...prev, { ...enrichedData, id: `item-${Date.now()}` }]);
        }
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handleDelete = useCallback((id) => {
        setItems(prev => prev.filter(i => i.id !== id));
        setModalOpen(false);
        setEditingItem(null);
    }, []);

    const handlePinSelect = useCallback((id) => {
        setSelectedId(id);
        // Optional: Scroll timeline to item?
    }, []);

    return (
        <div className="trip-view">
            <Head>
                <title>Unified Trip View | TRIPT.IO</title>
                <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;600;700&family=Outfit:wght@500;700&display=swap" rel="stylesheet" />
            </Head>

            <header className="header">
                <div className="logo">🧪 Unified Sandbox</div>
                <div className="nav-controls">
                    <button onClick={() => setWeekOffset(w => w - 1)}>Prev</button>
                    <button onClick={() => setWeekOffset(0)}>Today</button>
                    <button onClick={() => setWeekOffset(w => w + 1)}>Next</button>
                </div>
                <div className="actions">
                    <button onClick={() => setItems(generateMockItems())}>Use Mock Data</button>
                </div>
            </header>

            <div className="content">
                <div className="timeline-pane">
                    <Timeline
                        days={days}
                        items={items}
                        onDragCreate={handleDragCreate}
                        onEditItem={handleEditItem}
                    />
                </div>
                <div className="map-pane">
                    <MapView
                        events={items}
                        selectedId={selectedId}
                        onPinSelect={handlePinSelect}
                    />
                </div>
            </div>

            <UnifiedModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
                initialData={editingItem}
                timezone="America/New_York"
            />

            <style jsx>{`
        .trip-view {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--warm-sand, #fdfaf5);
          font-family: 'Inter', sans-serif;
        }

        .header {
           height: 60px;
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: 0 20px;
           background: white;
           border-bottom: 2px solid var(--border-color, #2c3e50);
        }
        
        .logo {
           font-family: 'Bungee', cursive;
           font-size: 1.2rem;
        }

        .nav-controls button, .actions button {
           padding: 6px 12px;
           margin: 0 4px;
           border: 2px solid var(--border-color, #2c3e50);
           background: white;
           border-radius: 6px;
           font-weight: 600;
           cursor: pointer;
        }
        .nav-controls button:hover, .actions button:hover {
           background: var(--cream, #f8f4eb);
        }

        .content {
           flex: 1;
           display: flex;
           overflow: hidden;
        }

        .timeline-pane {
           flex: 1;
           border-right: 2px solid var(--border-color, #2c3e50);
           overflow: hidden;
           display: flex;
           flex-direction: column;
           padding: 10px;
        }

        .map-pane {
           flex: 1;
           overflow: hidden;
           display: flex;
           width: 50%; /* Explicit width for Leaflet to size correctly */
        }
      `}</style>
        </div>
    );
}
