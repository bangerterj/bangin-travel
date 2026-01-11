/**
 * Trips Component - Trip selector, password modal, and trip creation form
 */

export function renderTripSelector(container, store, callbacks) {
  const trips = store.getTrips();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTripIcon = (destination) => {
    const lower = destination.toLowerCase();
    if (lower.includes('japan') || lower.includes('tokyo')) return '🗾';
    if (lower.includes('ski') || lower.includes('colorado') || lower.includes('mountain')) return '🏔️';
    if (lower.includes('beach') || lower.includes('hawaii') || lower.includes('mexico')) return '🏖️';
    if (lower.includes('europe') || lower.includes('paris') || lower.includes('london')) return '🏰';
    if (lower.includes('road') || lower.includes('drive')) return '🚗';
    return '✈️';
  };

  const tripCards = trips.map(trip => `
    <div class="trip-card" data-trip-id="${trip.id}">
      <div class="trip-card-icon">${getTripIcon(trip.destination)}</div>
      <div class="trip-card-info">
        <h3 class="trip-card-name">${trip.name}</h3>
        <p class="trip-card-dates">
          ${formatDate(trip.startDate)}${trip.endDate ? ` – ${formatDate(trip.endDate)}` : ''}
          ${trip.destination ? ` • ${trip.destination}` : ''}
        </p>
        <p class="trip-card-travelers">
          ${trip.travelers?.length || 0} traveler${trip.travelers?.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div class="trip-card-arrow">→</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="trips-container">
      <div class="trips-header">
        <h1 class="brand-title">🚐 Bangin' Travel</h1>
        <p class="trips-subtitle">Select a trip to view or create a new one</p>
      </div>
      
      <div class="trips-list">
        <h2 class="trips-section-title">Your Trips</h2>
        ${tripCards.length > 0 ? tripCards : `
          <div class="trips-empty">
            <p>No trips yet. Create your first adventure!</p>
          </div>
        `}
        
        <div class="trip-card trip-card-new" id="create-trip-btn">
          <div class="trip-card-icon">➕</div>
          <div class="trip-card-info">
            <h3 class="trip-card-name">Create New Trip</h3>
            <p class="trip-card-dates">Requires organizer password</p>
          </div>
          <div class="trip-card-arrow">→</div>
        </div>
      </div>
    </div>
  `;

  // Bind events
  container.querySelectorAll('.trip-card[data-trip-id]').forEach(card => {
    card.addEventListener('click', () => {
      const tripId = card.dataset.tripId;
      callbacks.onSelectTrip(tripId);
    });
  });

  document.getElementById('create-trip-btn')?.addEventListener('click', () => {
    callbacks.onCreateNew();
  });
}

export function renderPasswordModal(tripName) {
  const title = tripName ? `🔒 Unlock ${tripName}` : '🔒 Organizer Access';
  const subtitle = tripName
    ? `Enter the password for this trip to view its details.`
    : 'Enter the organizer password to create or manage trips.';

  return `
    <div class="password-modal">
      <h2>${title}</h2>
      <p class="text-secondary">${subtitle}</p>
      
      <form id="password-form">
        <div class="form-group">
          <label for="password-input">Password</label>
          <input type="password" id="password-input" placeholder="Enter password" required autocomplete="off">
        </div>
        <div id="password-error" class="form-error hidden">Incorrect password. Please try again.</div>
        <button type="submit" class="btn-primary" style="width: 100%;">🔓 Unlock</button>
      </form>
    </div>
  `;
}

export function renderTripSetupForm() {
  // Get today and a week from now as defaults
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDateInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  return `
    <div class="trip-setup-form">
      <h2>📝 Create New Trip</h2>
      <p class="text-secondary">Set up the basics for your trip. You can add more details later.</p>
      
      <form id="trip-setup-form">
        <div class="form-group">
          <label for="trip-name">Trip Name *</label>
          <input type="text" id="trip-name" placeholder="e.g. Japan 2026" required>
        </div>
        
        <div class="form-group">
          <label for="trip-destination">Destination *</label>
          <input type="text" id="trip-destination" placeholder="e.g. Tokyo & Nagano" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="trip-start-date">Start Date *</label>
            <input type="date" id="trip-start-date" value="${formatDateInput(today)}" required>
          </div>
          <div class="form-group">
            <label for="trip-end-date">End Date *</label>
            <input type="date" id="trip-end-date" value="${formatDateInput(nextWeek)}" required>
          </div>
        </div>

        <div class="form-group">
          <label for="trip-password">Trip Password *</label>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Used by others to access this specific trip</div>
          <input type="password" id="trip-password" placeholder="e.g. secret123" required>
        </div>
        
        <div id="trip-form-error" class="form-error hidden">Please fill in all required fields.</div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="cancel-trip-btn">Cancel</button>
          <button type="submit" class="btn-primary">🚀 Create Trip</button>
        </div>
      </form>
    </div>
  `;
}

export function renderTripSwitcher(store) {
  const trips = store.getTrips();
  const activeTrip = store.getActiveTrip();

  if (!activeTrip || trips.length <= 1) {
    return `<span class="current-trip-name">${activeTrip?.name || 'No Trip'}</span>`;
  }

  const getTripIcon = (destination) => {
    const lower = (destination || '').toLowerCase();
    if (lower.includes('japan') || lower.includes('tokyo')) return '🗾';
    if (lower.includes('ski') || lower.includes('colorado')) return '🏔️';
    if (lower.includes('beach') || lower.includes('hawaii')) return '🏖️';
    return '✈️';
  };

  return `
    <div class="trip-switcher">
      <button class="trip-switcher-btn" id="trip-switcher-toggle">
        <span class="trip-switcher-icon">${getTripIcon(activeTrip.destination)}</span>
        <span class="trip-switcher-name">${activeTrip.name}</span>
        <span class="trip-switcher-arrow">▼</span>
      </button>
      <div class="trip-switcher-dropdown hidden" id="trip-switcher-dropdown">
        ${trips.map(trip => `
          <button class="trip-switcher-option ${trip.id === activeTrip.id ? 'active' : ''}" data-trip-id="${trip.id}">
            <span>${getTripIcon(trip.destination)}</span>
            <span>${trip.name}</span>
            ${trip.id === activeTrip.id ? '<span>✓</span>' : ''}
          </button>
        `).join('')}
        <div class="trip-switcher-divider"></div>
        <button class="trip-switcher-option" id="go-to-all-trips">
          <span>⬅</span>
          <span>All Trips</span>
        </button>
      </div>
    </div>
  `;
}
