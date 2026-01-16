/**
 * Summary Component - Trip overview with map and key info
 */

export function renderSummary(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { travelers, flights, stays, activities, transit } = trip;

  const outboundFlight = flights.find(f => f.type === 'departure');
  const returnFlight = flights.find(f => f.type === 'return');

  const startDate = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : null;
  const endDate = trip.endDate ? new Date(trip.endDate + 'T00:00:00') : null;
  const duration = store.getTripDuration();

  const formatDate = (date) => {
    if (!date) return '';
    // Append time to ensure local date parsing instead of UTC
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  container.innerHTML = `
    <div class="summary-grid">
      <!-- Trip Header -->
      <div class="trip-header card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h1 class="trip-title">${trip.name.toUpperCase()}</h1>
                <p class="trip-dates">${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} (${duration} days)</p>
                <span class="trip-destination">📍 ${trip.destination}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                <button class="btn-text" id="edit-trip-btn" style="padding: 8px 0; font-weight: bold; font-size: 0.8rem; opacity: 0.7;">✏️ Edit Details</button>
                <button class="btn-secondary" id="open-invite-btn" style="padding: 8px 12px; font-weight: bold;">✉️ Invite</button>
            </div>
        </div>
      </div>

      <!-- Map Container -->
      <div class="map-container" style="grid-column: 1 / -1;">
        <div id="trip-map"></div>
      </div>

      <!--Flight Summary-->
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <h3>✈️ Flight Overview</h3>
        </div>
        <div class="card-body">
          <div class="flight-summary-grid">
            ${outboundFlight ? `
            <div class="flight-summary-card">
              <h4><span class="badge badge-departure">Outbound</span></h4>
              <div class="flight-route">
                <span>${outboundFlight.departureAirport}</span>
                <span class="arrow">→</span>
                <span>${outboundFlight.arrivalAirport}</span>
              </div>
              <div class="flight-meta">
                <div>${outboundFlight.airline} ${outboundFlight.flightNumber}</div>
                <div>${formatShortDate(outboundFlight.departureTime)}</div>
                <div class="text-muted">${store.getTravelersByIds(outboundFlight.travelers).length} travelers</div>
              </div>
            </div>
            ` : ''}
            ${returnFlight ? `
            <div class="flight-summary-card">
              <h4><span class="badge badge-return">Return</span></h4>
              <div class="flight-route">
                <span>${returnFlight.departureAirport}</span>
                <span class="arrow">→</span>
                <span>${returnFlight.arrivalAirport}</span>
              </div>
              <div class="flight-meta">
                <div>${returnFlight.airline} ${returnFlight.flightNumber}</div>
                <div>${formatShortDate(returnFlight.departureTime)}</div>
                <div class="text-muted">${store.getTravelersByIds(returnFlight.travelers).length} travelers</div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!--Travelers -->
      <div class="card">
        <div class="card-header">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <h3>👥 Travelers</h3>
            ${callbacks ? `
                <button class="btn-primary" id="add-traveler-btn" style="font-size: 0.75rem; padding: 4px 8px;">➕ Add</button>
            ` : ''}
          </div>
        </div>
        <div class="card-body">
          <div class="traveler-list">
            ${travelers.map(t => `
              <div class="traveler-chip">
                <div class="avatar ${t.isOrganizer ? 'avatar-organizer' : ''}" style="background-color: ${t.color}">
                  ${t.initials}
                </div>
                <span>${t.name}</span>
                ${callbacks ? `
                    <span class="edit-traveler-btn" data-id="${t.id}" title="Edit" style="cursor: pointer; margin-left: 4px; opacity: 0.5;">✏️</span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!--Quick Stats-->
      <div class="card">
        <div class="card-header">
          <h3>📊 Quick Stats</h3>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${stays.length}</div>
              <div class="stat-label">Stays</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${flights.filter(f => f.type === 'internal').length}</div>
              <div class="stat-label">Internal Flights</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${transit.length}</div>
              <div class="stat-label">Transit Legs</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${activities.length}</div>
              <div class="stat-label">Activities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize map
  initMap(store);

  if (callbacks) {
    container.querySelectorAll('.edit-traveler-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent clicking chip if that does something
        const t = travelers.find(traveler => traveler.id === btn.dataset.id);
        callbacks.onEdit('travelers', t);
      });
    });

    const inviteBtn = container.querySelector('#open-invite-btn');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => {
        callbacks.onInvite();
      });
    }

    const editTripBtn = container.querySelector('#edit-trip-btn');
    if (editTripBtn) {
      editTripBtn.addEventListener('click', () => {
        callbacks.onEditTrip();
      });
    }
  }
}




export function renderTravelerForm(traveler = null) {
  const isEdit = !!traveler;
  const data = traveler || {
    name: '',
    color: '#3498db',
    isOrganizer: false
  };

  const colors = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
    '#1abc9c', '#d35400', '#c0392b', '#7f8c8d'
  ];

  return `
  <div class="form-container">
      <h2>${isEdit ? '✏️ Edit Traveler' : '👥 Add Traveler'}</h2>
      <form id="travelers-form">
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" name="name" value="${data.name}" placeholder="e.g. John Doe" required>
        </div>

        <div class="form-group">
            <label>Avatar Color</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                ${colors.map(c => `
                    <label style="cursor: pointer;">
                        <input type="radio" name="color" value="${c}" ${data.color === c ? 'checked' : ''} style="display: none;">
                        <div class="color-swatch ${data.color === c ? 'selected' : ''}" 
                             style="width: 32px; height: 32px; background-color: ${c}; border-radius: 50%; border: 3px solid ${data.color === c ? '#2c3e50' : 'transparent'}; transition: all 0.2s;">
                        </div>
                    </label>
                `).join('')}
            </div>
            <!-- Hidden input fallback if needed, but radios handle it -->
        </div>

        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" name="isOrganizer" value="true" ${data.isOrganizer ? 'checked' : ''}>
                Is Organizer (👑)
            </label>
            <p class="text-muted text-small" style="margin-top: 4px;">Organizers are highlighted in the list.</p>
        </div>

        <div class="form-actions">
           ${isEdit ? '<button type="button" id="delete-btn" class="btn-danger">🗑️ Delete</button>' : '<div></div>'}
           <button type="submit" class="btn-primary">Save Traveler</button>
        </div>
      </form>
    </div>

  <script>
        // Simple script to update selection visual
        document.querySelectorAll('input[name="color"]').forEach(input => {
      input.addEventListener('change', (e) => {
        document.querySelectorAll('.color-swatch').forEach(s => s.style.borderColor = 'transparent');
        e.target.nextElementSibling.style.borderColor = '#2c3e50';
      });
        });
  </script>
`;
}

function initMap(store) {
  const mapContainer = document.getElementById('trip-map');
  if (!mapContainer || typeof L === 'undefined') {
    // Leaflet not loaded, show placeholder
    mapContainer.innerHTML = `
  <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--cream); color: var(--text-secondary);">
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 8px;">🗺️</div>
      <p>Interactive map loading...</p>
    </div>
  </div>
  `;
    return;
  }

  const trip = store.getActiveTrip();
  if (!trip) return;

  // Default center if no markers
  const map = L.map('trip-map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const bounds = [];

  // Add markers for stays
  const stayIcon = L.divIcon({
    className: 'map-marker',
    html: '<div style="background: #9b59b6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #2c3e50; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">🏨</div>',
    iconSize: [24, 24]
  });

  trip.stays.forEach(stay => {
    if (stay.coordinates && stay.coordinates.lat && stay.coordinates.lng) {
      const pos = [stay.coordinates.lat, stay.coordinates.lng];
      L.marker(pos, { icon: stayIcon })
        .addTo(map)
        .bindPopup(`<strong>${stay.name}</strong><br>${stay.address}`);
      bounds.push(pos);
    }
  });

  // Add markers for activities
  const activityIcon = L.divIcon({
    className: 'map-marker',
    html: '<div style="background: #e67e22; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #2c3e50; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">📍</div>',
    iconSize: [20, 20]
  });

  trip.activities.forEach(activity => {
    if (activity.coordinates && activity.coordinates.lat && activity.coordinates.lng) {
      const pos = [activity.coordinates.lat, activity.coordinates.lng];
      L.marker(pos, { icon: activityIcon })
        .addTo(map)
        .bindPopup(`<strong>${activity.name}</strong><br>${activity.location}`);
      bounds.push(pos);
    }
  });

  // Smart bounds: fit map to all markers
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  } else if (trip.destination) {
    // Optionally: could geocode trip destination here if no specific markers
  }
}
