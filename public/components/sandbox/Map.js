import { useState, useRef, useEffect, useCallback } from 'react';

// Event type configuration
export const TYPE_CONFIG = {
  stay: { icon: '🏨', color: '#9b59b6', label: 'Stay' },
  activity: { icon: '🎯', color: '#e67e22', label: 'Activity' },
  dining: { icon: '🍽️', color: '#f1c40f', label: 'Dining' },
  transit: { icon: '🚃', color: '#1abc9c', label: 'Transit' },
  flight: { icon: '✈️', color: '#3498db', label: 'Flight' },
};

// ============================================
// Nominatim Geocoding Service
// ============================================
// Helper to format address cleanly (Name/Street, City, State)
function formatAddress(item) {
  if (!item.address) return item.display_name.split(',').slice(0, 3).join(', ');

  const addr = item.address;
  const parts = [];

  // 1. Specific Name/Street
  let firstPart = item.display_name.split(',')[0];

  // If first part is just a number (house number), append the road
  if (/^\d+$/.test(firstPart) && addr.road) {
    firstPart = `${firstPart} ${addr.road}`;
  }

  parts.push(firstPart);

  // 2. City-level
  const city = addr.city || addr.town || addr.village || addr.municipality;
  if (city && !firstPart.includes(city)) {
    parts.push(city);
  }

  // 3. State
  if (addr.state) parts.push(addr.state);

  return parts.join(', ');
}

export async function searchLocation(query) {
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
      displayName: formatAddress(item),
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

export async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BanginTravel-Prototype/1.0' }
    });
    const data = await res.json();

    return {
      displayName: formatAddress(data),
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
export function LocationSearch({ onSelect, placeholder = 'Search for a location...' }) {
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

      <style jsx>{`
        .location-search {
          position: relative;
          color: var(--text-primary, #2c3e50);
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
          color: inherit;
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
      `}</style>
    </div>
  );
}

// ============================================
// Leaflet Map Component (Dynamic Import)
// ============================================
export default function MapView({
  events = [],
  selectedId,
  hoveredId,
  onPinSelect,
  onPinHover = () => { },
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isReady]);

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
      // Handle both flat location structure or nested location object
      // Timeline items might just have 'location' as string or object without coords if not set proper
      // Check for valid coords
      const coordinates = event?.location?.coordinates || (event.coordinates);
      // If mock events from timeline.js generated by stress test, they definitely DO NOT have coordinates.
      // So this map will only show items that HAVE coordinates.

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
          ${event.location?.displayName || ''}<br>
          <small>${event.startTime?.split('T')[1]?.substring(0, 5) || ''}</small>
        </div>
      `);

      // Event handlers
      marker.on('click', () => onPinSelect && onPinSelect(event.id));
      marker.on('mouseover', () => onPinHover && onPinHover(event.id));
      marker.on('mouseout', () => onPinHover && onPinHover(null));

      markersRef.current[event.id] = marker;
    });
  }, [isReady, events, selectedId, hoveredId, dayFilter, onPinSelect, onPinHover]);

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

      <style jsx>{`
        .map-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          height: 100%;
          overflow: hidden;
          background: #e5e5e5; 
        }
        
        .map {
          flex: 1;
          width: 100%;
          height: 100%;
          z-index: 1;
        }
        
        .map-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.8);
          z-index: 2;
        }
        
        /* Leaflet overrides */
        :global(.leaflet-container) {
          font-family: inherit;
        }
        :global(.leaflet-popup-content-wrapper) {
          border-radius: 8px;
          border: 2px solid var(--border-color, #2c3e50);
        }
        
        /* Custom Pin Styles (Global because inserted by Leaflet) */
        :global(.custom-pin) {
          background: none !important;
          border: none !important;
        }
        
        :global(.pin-wrapper) {
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
        
        :global(.pin-wrapper.hovered) {
          transform: rotate(-45deg) scale(1.15);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        
        :global(.pin-wrapper.selected) {
          transform: rotate(-45deg) scale(1.25);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        
        :global(.pin-icon) {
          transform: rotate(45deg);
          font-size: 1.1rem;
        }
        
        :global(.pin-popup) {
          padding: 4px;
          min-width: 150px;
        }
        
        :global(.pin-popup strong) {
          display: block;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
