/**
 * Location Sandbox - Prototype for map-first location exploration
 * Access at: /dev/location
 * 
 * Features:
 * - Interactive map with clickable pins
 * - Location autocomplete with Nominatim geocoding
 * - Sidebar showing events synced with map selection
 * - Day filtering applying to both views
 * - Click-to-add locations from map
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';

// ============================================
// MOCK DATA - Sample trip events with locations
// ============================================
const MOCK_EVENTS = [
  {
    id: 'stay-1',
    type: 'stay',
    title: 'Shinjuku Granbell Hotel',
    location: {
      displayName: 'Shinjuku Granbell Hotel',
      address: '2-14-5 Kabukicho, Shinjuku, Tokyo',
      coordinates: { lat: 35.6938, lng: 139.7034 },
    },
    date: '2026-03-19',
    startTime: '15:00',
    endTime: '11:00',
    dayIndex: 1,
  },
  {
    id: 'activity-1',
    type: 'activity',
    title: 'Senso-ji Temple',
    location: {
      displayName: 'Senso-ji Temple',
      address: 'Asakusa, Tokyo',
      coordinates: { lat: 35.7148, lng: 139.7967 },
    },
    date: '2026-03-19',
    startTime: '19:00',
    endTime: '21:00',
    dayIndex: 1,
  },
  {
    id: 'activity-2',
    type: 'activity',
    title: 'TeamLab Borderless',
    location: {
      displayName: 'TeamLab Borderless',
      address: 'Azabudai Hills, Tokyo',
      coordinates: { lat: 35.6617, lng: 139.7413 },
    },
    date: '2026-03-20',
    startTime: '10:00',
    endTime: '14:00',
    dayIndex: 2,
  },
  {
    id: 'dining-1',
    type: 'dining',
    title: 'Tsukiji Outer Market',
    location: {
      displayName: 'Tsukiji Outer Market',
      address: 'Tsukiji, Chuo City',
      coordinates: { lat: 35.6654, lng: 139.7707 },
    },
    date: '2026-03-21',
    startTime: '07:00',
    endTime: '10:00',
    dayIndex: 3,
  },
  {
    id: 'activity-3',
    type: 'activity',
    title: 'Meiji Shrine',
    location: {
      displayName: 'Meiji Shrine',
      address: 'Shibuya, Tokyo',
      coordinates: { lat: 35.6764, lng: 139.6993 },
    },
    date: '2026-03-21',
    startTime: '14:00',
    endTime: '17:00',
    dayIndex: 3,
  },
  {
    id: 'transit-1',
    type: 'transit',
    title: 'Shinkansen to Nagano',
    location: {
      displayName: 'Tokyo Station',
      address: 'Tokyo Station',
      coordinates: { lat: 35.6812, lng: 139.7671 },
    },
    endLocation: {
      displayName: 'Nagano Station',
      address: 'Nagano Station',
      coordinates: { lat: 36.6432, lng: 138.1884 },
    },
    date: '2026-03-22',
    startTime: '08:30',
    endTime: '10:10',
    dayIndex: 4,
  },
];

// Available days for filtering
const TRIP_DAYS = [
  { date: '2026-03-19', label: 'Day 1 - Mar 19' },
  { date: '2026-03-20', label: 'Day 2 - Mar 20' },
  { date: '2026-03-21', label: 'Day 3 - Mar 21' },
  { date: '2026-03-22', label: 'Day 4 - Mar 22' },
];

// Event type styling
const TYPE_CONFIG = {
  stay: { icon: '🏨', color: '#9b59b6', label: 'Stay' },
  activity: { icon: '🎯', color: '#e67e22', label: 'Activity' },
  dining: { icon: '🍽️', color: '#f1c40f', label: 'Dining' },
  transit: { icon: '🚃', color: '#1abc9c', label: 'Transit' },
  flight: { icon: '✈️', color: '#3498db', label: 'Flight' },
};

// ============================================
// Nominatim Geocoding Service
// ============================================
async function searchLocation(query) {
  if (!query || query.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BanginTravel-Prototype/1.0' }
    });
    const data = await res.json();

    return data.map(item => ({
      displayName: item.display_name.split(',').slice(0, 3).join(', '),
      fullAddress: item.display_name,
      coordinates: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      type: item.type,
      category: item.category,
    }));
  } catch (err) {
    console.error('Geocoding error:', err);
    return [];
  }
}

async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);
  url.searchParams.set('format', 'json');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BanginTravel-Prototype/1.0' }
    });
    const data = await res.json();

    return {
      displayName: data.display_name?.split(',').slice(0, 3).join(', ') || 'Unknown Location',
      fullAddress: data.display_name || '',
      coordinates: { lat, lng },
    };
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return { displayName: 'Dropped Pin', coordinates: { lat, lng } };
  }
}

// ============================================
// Location Search Autocomplete Component
// ============================================
function LocationSearch({ onSelect, placeholder = 'Search for a location...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const searchResults = await searchLocation(value);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setIsLoading(false);
    }, 300);
  }, []);

  const handleSelect = useCallback((location) => {
    onSelect(location);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div className="location-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="search-input"
        />
        {isLoading && <span className="loading-spinner">⏳</span>}
      </div>

      {isOpen && (
        <div className="search-results">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="search-result-item"
              onMouseDown={() => handleSelect(result)}
            >
              <span className="result-icon">📍</span>
              <div className="result-text">
                <div className="result-name">{result.displayName}</div>
                <div className="result-coords">
                  {result.coordinates.lat.toFixed(4)}, {result.coordinates.lng.toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Event Sidebar Item Component
// ============================================
function EventSidebarItem({ event, isSelected, isHovered, onSelect, onHover }) {
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.activity;

  return (
    <div
      className={`event-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={() => onSelect(event.id)}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      style={{ '--event-color': config.color }}
    >
      <div className="event-icon">{config.icon}</div>
      <div className="event-content">
        <div className="event-title">{event.title}</div>
        <div className="event-location">{event.location.displayName}</div>
        <div className="event-time">
          {event.startTime} - {event.endTime}
        </div>
      </div>
      <div className="event-type-badge" style={{ background: config.color }}>
        {config.label}
      </div>
    </div>
  );
}

// ============================================
// Add Event Modal Component
// ============================================
function AddEventModal({ isOpen, onClose, onSave, location }) {
  const [eventType, setEventType] = useState('activity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(TRIP_DAYS[0].date);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');

  useEffect(() => {
    if (location) {
      setTitle(location.displayName || '');
    }
  }, [location]);

  if (!isOpen || !location) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: eventType,
      title: title || location.displayName,
      location,
      date,
      startTime,
      endTime,
    });
    setTitle('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Event</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-location-preview">
          <span className="preview-icon">📍</span>
          <div className="preview-text">
            <div className="preview-name">{location.displayName}</div>
            <div className="preview-coords">
              {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="type-selector">
            {Object.entries(TYPE_CONFIG).filter(([key]) => key !== 'transit').map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={`type-chip ${eventType === key ? 'active' : ''}`}
                style={{ '--chip-color': config.color }}
                onClick={() => setEventType(key)}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>

          <div className="form-field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Name this ${eventType}`}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Date</label>
              <select value={date} onChange={(e) => setDate(e.target.value)}>
                {TRIP_DAYS.map((day) => (
                  <option key={day.date} value={day.date}>{day.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Leaflet Map Component (Dynamic Import)
// ============================================
function MapView({
  events,
  selectedId,
  hoveredId,
  onPinSelect,
  onPinHover,
  onMapClick,
  dayFilter,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [isReady, setIsReady] = useState(false);

  // Load Leaflet from CDN (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet is already loaded
    if (window.L) {
      setIsReady(true);
      return;
    }

    // Add CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Add script
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsReady(true);
      document.body.appendChild(script);
    } else {
      // Script already loading, poll for L
      const checkL = setInterval(() => {
        if (window.L) {
          setIsReady(true);
          clearInterval(checkL);
        }
      }, 100);
      return () => clearInterval(checkL);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([35.6762, 139.6503], 11);

    // Use CartoDB Voyager tiles (English/International labels, clean look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Map is read-only for adding items (no click-to-add)
    // Only allow clicking existing pins

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isReady]); // Removed onMapClick dependency

  // Update markers
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Filter events by day
    const filteredEvents = dayFilter
      ? events.filter(e => e.date === dayFilter)
      : events;

    // Add markers for each event
    filteredEvents.forEach((event) => {
      const { coordinates } = event.location;
      if (!coordinates) return;

      const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.activity;
      const isSelected = event.id === selectedId;
      const isHovered = event.id === hoveredId;

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div class="pin-wrapper ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}" 
               style="--pin-color: ${config.color}">
            <div class="pin-icon">${config.icon}</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([coordinates.lat, coordinates.lng], { icon })
        .addTo(map);

      // Bind popup
      marker.bindPopup(`
        <div class="pin-popup">
          <strong>${event.title}</strong><br>
          ${event.location.displayName}<br>
          <small>${event.startTime} - ${event.endTime}</small>
        </div>
      `);

      // Event handlers
      marker.on('click', () => onPinSelect(event.id));
      marker.on('mouseover', () => onPinHover(event.id));
      marker.on('mouseout', () => onPinHover(null));

      markersRef.current[event.id] = marker;
    });
  }, [isReady, events, selectedId, hoveredId, dayFilter, onPinSelect, onPinHover]);

  // Fit bounds only when events or filter changes
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const filteredEvents = dayFilter
      ? events.filter(e => e.date === dayFilter)
      : events;

    const bounds = filteredEvents
      .map(e => e.location.coordinates)
      .filter(c => c)
      .map(c => [c.lat, c.lng]);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [isReady, events, dayFilter]);

  // Pan to selected marker
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedId || !markersRef.current[selectedId]) return;

    const marker = markersRef.current[selectedId];
    mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
    marker.openPopup();
  }, [selectedId]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map" />
      {!isReady && (
        <div className="map-loading">
          <span>🗺️ Loading map...</span>
        </div>
      )}
      <div className="map-hint">
        Explore the map to see your trip locations
      </div>
    </div>
  );
}

// ============================================
// Main Location Sandbox Page
// ============================================
export default function LocationSandbox() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [dayFilter, setDayFilter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);

  // Filter events by day
  const filteredEvents = useMemo(() => {
    if (!dayFilter) return events;
    return events.filter(e => e.date === dayFilter);
  }, [events, dayFilter]);

  // Handle location search selection
  const handleSearchSelect = useCallback((location) => {
    setPendingLocation(location);
    setModalOpen(true);
  }, []);

  // Handle pin selection
  const handlePinSelect = useCallback((id) => {
    setSelectedId(id === selectedId ? null : id);
  }, [selectedId]);

  // Handle sidebar item selection (pan map to pin)
  const handleSidebarSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);

  // Save new event
  const handleSaveEvent = useCallback((eventData) => {
    const newEvent = {
      id: `event-${Date.now()}`,
      ...eventData,
      dayIndex: TRIP_DAYS.findIndex(d => d.date === eventData.date) + 1,
    };
    setEvents(prev => [...prev, newEvent]);
    setPendingLocation(null);
  }, []);

  return (
    <>
      <Head>
        <title>Location Sandbox | TRIPT.IO</title>
      </Head>

      <div className="location-sandbox">
        <header className="sandbox-header">
          <h1>🗺️ Location Sandbox</h1>
          <p>Search or browse events to explore locations</p>
        </header>

        <div className="sandbox-content">
          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-section">
              <h3>Find Location</h3>
              <LocationSearch onSelect={handleSearchSelect} />
            </div>

            <div className="sidebar-section">
              <h3>Filter by Day</h3>
              <div className="day-filter">
                <button
                  className={`day-btn ${dayFilter === null ? 'active' : ''}`}
                  onClick={() => setDayFilter(null)}
                >
                  All Days
                </button>
                {TRIP_DAYS.map((day) => (
                  <button
                    key={day.date}
                    className={`day-btn ${dayFilter === day.date ? 'active' : ''}`}
                    onClick={() => setDayFilter(day.date)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-section events-section">
              <h3>Events ({filteredEvents.length})</h3>
              <div className="events-list">
                {filteredEvents.map((event) => (
                  <EventSidebarItem
                    key={event.id}
                    event={event}
                    isSelected={event.id === selectedId}
                    isHovered={event.id === hoveredId}
                    onSelect={handleSidebarSelect}
                    onHover={setHoveredId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <MapView
            events={events}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onPinSelect={handlePinSelect}
            onPinHover={setHoveredId}
            dayFilter={dayFilter}
          />
        </div>

        {/* Add Event Modal */}
        <AddEventModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPendingLocation(null);
          }}
          onSave={handleSaveEvent}
          location={pendingLocation}
        />
      </div>

      <style jsx global>{`
        /* CSS Reset for sandbox */
        .location-sandbox {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--warm-sand, #fdfaf5);
          font-family: var(--font-body, 'Inter', sans-serif);
          overflow: hidden;
        }
        
        .sandbox-header {
          text-align: center;
          padding: 16px;
          border-bottom: 2px solid var(--border-color, #2c3e50);
          background: white;
          flex-shrink: 0;
        }
        
        .sandbox-header h1 {
          font-family: var(--font-display, 'Bungee', cursive);
          font-size: 1.5rem;
          margin-bottom: 4px;
          color: var(--text-primary, #2c3e50);
        }
        
        .sandbox-header p {
          color: var(--text-secondary, #5d6d7e);
          margin: 0;
          font-size: 0.9rem;
        }
        
        /* Main Layout */
        .sandbox-content {
          display: flex;
          flex: 1;
          height: 100%; /* Ensure it fills the flex container */
          overflow: hidden;
        }
        
        /* Sidebar */
        .sidebar {
          width: 360px; /* Wider sidebar per feedback */
          background: var(--white, #fff);
          border-right: 2px solid var(--border-color, #2c3e50);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .sidebar-section {
          padding: 16px;
          border-bottom: 1px solid var(--cream, #f8f4eb);
        }
        
        .sidebar-section h3 {
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text-secondary, #5d6d7e);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .events-section {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .events-list {
          flex: 1;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        /* Location Search */
        .location-search {
          position: relative;
        }
        
        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--cream, #f8f4eb);
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 8px;
          padding: 8px 12px;
        }
        
        .search-icon {
          margin-right: 8px;
          font-size: 1.1rem;
        }
        
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.95rem;
          outline: none;
        }
        
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid var(--border-color, #2c3e50);
          border-top: none;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 1000;
          max-height: 240px;
          overflow-y: auto;
        }
        
        .search-result-item {
          display: flex;
          align-items: flex-start;
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--cream, #f8f4eb);
          transition: background 0.15s;
        }
        
        .search-result-item:hover {
          background: var(--cream, #f8f4eb);
        }
        
        .result-icon {
          margin-right: 10px;
          font-size: 1.2rem;
        }
        
        .result-name {
          font-weight: 500;
          color: var(--text-primary, #2c3e50);
        }
        
        .result-coords {
          font-size: 0.75rem;
          color: var(--text-secondary, #5d6d7e);
        }
        
        /* Day Filter */
        .day-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .day-btn {
          padding: 6px 12px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 20px;
          background: var(--white, #fff);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .day-btn:hover {
          background: var(--cream, #f8f4eb);
        }
        
        .day-btn.active {
          background: var(--border-color, #2c3e50);
          color: white;
        }
        
        /* Event Items */
        .event-item {
          display: flex;
          align-items: flex-start;
          padding: 12px;
          margin-bottom: 8px;
          background: var(--white, #fff);
          border: 2px solid var(--cream, #f8f4eb);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          border-left: 4px solid var(--event-color);
        }
        
        .event-item:hover,
        .event-item.hovered {
          background: var(--cream, #f8f4eb);
          border-color: var(--event-color);
        }
        
        .event-item.selected {
          background: var(--cream, #f8f4eb);
          border-color: var(--event-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .event-icon {
          font-size: 1.5rem;
          margin-right: 12px;
          line-height: 1;
        }
        
        .event-content {
          flex: 1;
          min-width: 0;
        }
        
        .event-title {
          font-weight: 600;
          color: var(--text-primary, #2c3e50);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-location {
          font-size: 0.8rem;
          color: var(--text-secondary, #5d6d7e);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time {
          font-size: 0.75rem;
          color: var(--text-tertiary, #8e9aab);
          margin-top: 4px;
        }
        
        .event-type-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        
        /* Map Container */
        .map-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          height: 100%;
          overflow: hidden;
          background: #e5e5e5; /* Loading placeholder color */
        }
        
        .map {
          flex: 1;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 0;
          z-index: 1;
        }
        
        .map-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          color: var(--text-secondary, #5d6d7e);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
          pointer-events: none;
        }
        
        /* Custom Pin Styles */
        .custom-pin {
          background: none !important;
          border: none !important;
        }
        
        .pin-wrapper {
          width: 36px;
          height: 36px;
          background: var(--pin-color);
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s;
        }
        
        .pin-wrapper.hovered {
          transform: rotate(-45deg) scale(1.15);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        
        .pin-wrapper.selected {
          transform: rotate(-45deg) scale(1.25);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        
        .pin-icon {
          transform: rotate(45deg);
          font-size: 1.1rem;
        }
        
        .pin-popup {
          padding: 4px;
          min-width: 150px;
        }
        
        .pin-popup strong {
          display: block;
          margin-bottom: 4px;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .modal-content {
          background: white;
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 12px;
          box-shadow: 6px 6px 0 var(--border-color, #2c3e50);
          width: 400px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 2px solid var(--cream, #f8f4eb);
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary, #5d6d7e);
        }
        
        .modal-location-preview {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          background: var(--cream, #f8f4eb);
          border-bottom: 2px solid var(--cream, #f8f4eb);
        }
        
        .preview-icon {
          font-size: 1.5rem;
          margin-right: 12px;
        }
        
        .preview-name {
          font-weight: 600;
          color: var(--text-primary, #2c3e50);
        }
        
        .preview-coords {
          font-size: 0.75rem;
          color: var(--text-secondary, #5d6d7e);
        }
        
        .modal-content form {
          padding: 20px;
        }
        
        .type-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .type-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 20px;
          background: white;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .type-chip:hover {
          background: var(--cream, #f8f4eb);
        }
        
        .type-chip.active {
          background: var(--chip-color);
          color: white;
          border-color: var(--chip-color);
        }
        
        .form-field {
          margin-bottom: 16px;
        }
        
        .form-field label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #5d6d7e);
          margin-bottom: 6px;
        }
        
        .form-field input,
        .form-field select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid var(--cream, #f8f4eb);
          border-radius: 6px;
          font-size: 0.95rem;
          transition: border-color 0.15s;
        }
        
        .form-field input:focus,
        .form-field select:focus {
          outline: none;
          border-color: var(--border-color, #2c3e50);
        }
        
        .form-row {
          display: flex;
          gap: 12px;
        }
        
        .form-row .form-field {
          flex: 1;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }
        
        .btn-cancel {
          padding: 10px 20px;
          border: 2px solid var(--cream, #f8f4eb);
          border-radius: 6px;
          background: white;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-cancel:hover {
          background: var(--cream, #f8f4eb);
        }
        
        .btn-save {
          padding: 10px 20px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          background: var(--border-color, #2c3e50);
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-save:hover {
          opacity: 0.9;
        }
        
        /* Leaflet overrides */
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          border: 2px solid var(--border-color, #2c3e50);
        }
      `}</style>
    </>
  );
}
