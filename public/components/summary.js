/**
 * Map View Component (formerly Summary)
 * Full-screen map with interactive pins and bottom detail sheet
 */

import { renderTripSwitcher, bindTripSwitcherEvents } from './trips.js';

export function renderSummary(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { stays, activities, transit } = trip;

  // Normalize trip fields (DB uses name/startDate, Scan uses title/startAt)
  const tripTitle = trip.title || trip.name || 'Untitled Trip';
  const startDate = trip.startAt || trip.startDate;
  const endDate = trip.endAt || trip.endDate;

  const dateRange = formatDateRange(startDate, endDate);

  // Collect all items with coordinates for the map
  const allMapEvents = [
    ...stays.map(s => ({
      id: s.id,
      type: 'stay',
      title: s.name || s.title,
      location: s.location || s.metadata?.location || (s.coordinates ? { displayName: s.address, coordinates: s.coordinates } : null),
      coordinates: s.location?.coordinates || s.metadata?.location?.coordinates || s.coordinates,
      startTime: s.startAt || s.checkIn,
      endTime: s.endAt || s.checkOut,
      data: s
    })),
    ...activities.map(a => ({
      id: a.id,
      type: 'activity',
      title: a.name || a.title,
      location: a.location || a.metadata?.location || (a.coordinates ? { displayName: a.location, coordinates: a.coordinates } : null),
      coordinates: a.location?.coordinates || a.metadata?.location?.coordinates || a.coordinates,
      startTime: a.startAt || a.startTime,
      endTime: a.endAt || a.endTime,
      data: a
    })),
    ...transit.map(t => ({
      id: t.id,
      type: 'transit',
      title: t.title || t.name,
      location: t.location || t.metadata?.location || (t.coordinates ? { displayName: '', coordinates: t.coordinates } : null),
      coordinates: t.location?.coordinates || t.metadata?.location?.coordinates || t.coordinates,
      startTime: t.startAt || t.departureTime,
      endTime: t.endAt || t.arrivalTime,
      data: t
    })),
    ...(trip.flights || []).map(f => ({
      id: f.id,
      type: 'flight',
      title: f.title || `Flight ${f.flightNumber}`,
      // Use arrival airport for map pin usually, or departure? 
      // User said "Flights 'departure' and 'arrival'". 
      // Let's show pin at Arrival city for context of "where I'm going" or Departure for "where I am"?
      // Usually maps show destinations. Let's use Arrival.
      location: {
        displayName: f.arrivalCity || f.arrivalAirport,
        coordinates: f.metadata?.arrivalCoordinates // If we have coords for airport
        // If no coords, flight won't show on map (filter at end handles this)
      },
      coordinates: f.metadata?.arrivalCoordinates, // Need coords schema for airports
      startTime: f.startAt || f.departureTime,
      endTime: f.endAt || f.arrivalTime,
      data: f
    }))
  ].filter(e => e.coordinates || (typeof e.location === 'string' && e.location) || e.location?.displayName);

  // Render Full Screen Map Structure
  container.innerHTML = `
      <div class="map-view-container">
        
        <!-- Slim Info Bar -->
        <!-- Slim Info Bar (Now Trip Switcher) -->
        <div class="map-info-bar" id="map-trip-switcher"></div>

        <!-- Map Root -->
        <div id="trip-map-react-root" style="height: 100%; width: 100%; z-index: 1;"></div>
        
        <!-- Bottom Detail Card (Hidden by default) -->
        <div id="map-detail-card" class="map-detail-card">
          <div class="drag-handle"></div>
          
          <button id="close-detail-card" class="close-btn">×</button>

          <div id="detail-card-content"></div>
        </div>

      </div>
  `;

  // Trip Switcher Logic
  const switcherContainer = container.querySelector('#map-trip-switcher');
  if (switcherContainer) {
    switcherContainer.innerHTML = renderTripSwitcher(store);
    bindTripSwitcherEvents(switcherContainer, store, {
      onTripSelect: callbacks.onTripSelect,
      onSettings: callbacks.onEditTrip,
      onAllTrips: callbacks.onAllTrips
    });
  }

  // Bind Global Close
  const closeBtn = container.querySelector('#close-detail-card');
  const card = container.querySelector('#map-detail-card');
  const content = container.querySelector('#detail-card-content');

  const hideCard = () => {
    if (card) card.style.transform = 'translateY(110%)';
  };

  if (closeBtn && card) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent triggering card click
      hideCard();
    });
  }

  // Show Card Logic
  const showCard = (event) => {
    if (!card || !content) return;

    const { data: item, type } = event;
    const timeStr = item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const dateStr = item.startTime ? new Date(item.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

    // Mini Card Content
    // Mini Card Content
    content.innerHTML = `
      <div class="mini-card-preview">
        <div class="mini-icon">
           ${getItemIcon(type)}
        </div>
        <div class="mini-info">
           <h3 class="mini-title">${item.title || item.name}</h3>
           
           <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
               ${dateStr ? `
                   <div class="mini-meta-badge">
                       <span>📅</span> ${dateStr} ${timeStr ? `• ${timeStr}` : ''}
                   </div>
               ` : ''}
           </div>

           ${item.location?.displayName ? `
               <div class="mini-location">
                   <span style="flex-shrink: 0; margin-top: 1px;">📍</span> 
                   <span style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.location.displayName}</span>
               </div>
           ` : ''}
        </div>
        <div class="mini-arrow">→</div>
      </div>
    `;

    // Click card to open full details
    content.onclick = () => {
      if (callbacks.onView) callbacks.onView(type, item);
      hideCard();
    };

    // Show it
    card.style.transform = 'translateY(0)';
  };

  // Initialize Map with showCard callback (Single Call)
  initMapView(allMapEvents, trip, callbacks, showCard);
}

function getItemIcon(type) {
  const map = { flight: '✈️', stay: '🏨', activity: '📍', transit: '🚆' };
  return map[type] || '📅';
}

function initMapView(events, trip, callbacks, showCard) {
  const mapContainer = document.getElementById('trip-map-react-root');
  if (!mapContainer) return;

  if (typeof L === 'undefined') {
    mapContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666;">
        <div style="font-size: 2rem; margin-bottom: 12px;">🗺️</div>
        <div>Loading map...</div>
      </div>
    `;

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => renderMap(mapContainer, events, trip, callbacks, showCard);
      document.body.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check);
          renderMap(mapContainer, events, trip, callbacks, showCard);
        }
      }, 100);
    }
  } else {
    renderMap(mapContainer, events, trip, callbacks, showCard);
  }
}

function renderMap(container, events, trip, callbacks, showCard) {
  container.innerHTML = '';
  const L = window.L;

  // Use trip location as fallback, or default to Los Angeles
  const tripCoords = trip?.location?.coordinates;
  const defaultCenter = tripCoords
    ? [tripCoords.lat, tripCoords.lng]
    : [34.0522, -118.2437];

  const map = L.map(container, {
    zoomControl: false
  }).setView(defaultCenter, 12);

  // Fallback: If no coordinates but we have a destination name, try to geocode it
  if (!tripCoords && trip?.destination) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.destination)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          map.setView([lat, lon], 12);
          console.log(`[Map] Geocoded fallback for "${trip.destination}":`, lat, lon);
        }
      })
      .catch(err => console.error('[Map] Geocoding failed:', err));
  }

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    maxZoom: 20
  }).addTo(map);

  // Add Zoom Control at top right
  L.control.zoom({ position: 'topright' }).addTo(map);

  const bounds = [];
  const TYPE_CONFIG = {
    stay: { icon: '🏨', color: '#9b59b6' },
    activity: { icon: '🎯', color: '#e67e22' },
    transit: { icon: '🚃', color: '#1abc9c' },
    flight: { icon: '✈️', color: '#3498db' },
  };

  events.forEach(event => {
    let coords = event.coordinates;
    const locationName = typeof event.location === 'string' ? event.location : event.location?.displayName;

    if (!coords && locationName) {
      // Try to geocode on the fly
      // Use a simple cache key to avoid re-fetching the same location multiple times in a session
      const cacheKey = `geo:${locationName}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { lat, lon } = JSON.parse(cached);
          coords = { lat, lng: lon }; // normalize lon -> lng
        } catch (e) { }
      } else {
        // Fetch async and add marker later
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              const { lat, lon } = data[0];
              sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lon }));
              // Add marker dynamically (no bounds update to avoid jumping)
              addMarker({ ...event, coordinates: { lat, lng: lon } }, map, L, callbacks, TYPE_CONFIG, showCard);
            }
          })
          .catch(err => console.warn('[Map] Item geocoding failed:', locationName, err));

        return; // Skip sync render, wait for async
      }
    }

    if (!coords || !coords.lat || !coords.lng) return;

    addMarker({ ...event, coordinates: coords }, map, L, callbacks, TYPE_CONFIG, showCard);
    bounds.push([coords.lat, coords.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
}

function addMarker(event, map, L, callbacks, TYPE_CONFIG, showCard) {
  const coords = event.coordinates;
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.activity;

  const icon = L.divIcon({
    className: 'custom-map-pin',
    html: `
        <div class="map-pin-marker" style="
          background: ${config.color}; 
          color: white;
          border-radius: 8px;
          border: 2px solid #2c3e50;
          box-shadow: 2px 2px 0 #2c3e50;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          cursor: pointer;
          transition: transform 0.1s;
        ">
          <div style="font-size: 1.25rem;">${config.icon}</div>
          <div class="pin-tail" style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%) rotate(45deg);
            width: 12px;
            height: 12px;
            background: ${config.color};
            border-right: 2px solid #2c3e50;
            border-bottom: 2px solid #2c3e50;
            z-index: -1;
          "></div>
        </div>
      `,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  });

  const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

  marker.on('click', () => {
    // Display Mini Card instead of opening full view immediately
    if (showCard) {
      showCard(event);
    } else if (callbacks?.onView) {
      callbacks.onView(event.type, event.data);
    }

    map.flyTo([coords.lat, coords.lng], map.getZoom(), {
      animate: true,
      duration: 0.5
    });
  });
}

function formatDateRange(start, end) {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : null;

  const options = { month: 'short', day: 'numeric' };
  const str = s.toLocaleDateString(undefined, options);

  if (e) {
    return `${str} - ${e.toLocaleDateString(undefined, options)}`;
  }
  return str;
}

// Keeping this stub for now as app.js imports it
export function renderTravelerForm() { }
