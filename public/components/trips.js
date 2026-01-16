/**
 * Trips Component - Trip selector, password modal, and trip creation form
 */

export function renderTripSelector(container, store, callbacks) {
  const allTrips = store.getTrips();
  const trips = allTrips.filter(t => !t.isArchived);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Append time to ensure local date parsing instead of UTC
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
        <div style="display: flex; align-items: center; gap: 8px;">
            <h3 class="trip-card-name">${trip.name}</h3>
            ${trip.role ? `<span class="role-badge ${trip.role.toLowerCase()}">${trip.role}</span>` : ''}
        </div>
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
        <div class="header-top" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <h1 class="brand-title">🚐 Bangin' Travel</h1>
            <div class="auth-controls">
                ${store.getSession() ? `
                    <button class="btn-text btn-sm" id="account-settings-btn" style="margin-right: 10px; font-weight: bold;">⚙️ Account Settings</button>
                    <span class="user-email" style="margin-right: 10px; font-size: 0.9rem;">${store.getSession().user.email}</span>
                    ${!store.getSession().user.hasPassword ? `
                        <button class="btn-text btn-sm" id="set-password-btn" style="margin-right: 10px; color: var(--accent-orange); font-weight: bold;">🔑 Set Password</button>
                    ` : ''}
                    <button class="btn-secondary btn-sm" onclick="window.location.href='/api/auth/signout'">Log Out</button>
                ` : `
                    <button class="btn-primary btn-sm" onclick="window.location.href='/api/auth/signin'">Log In / Sign Up</button>
                `}
            </div>
        </div>
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
            <p class="trip-card-dates">Plan your next adventure</p>
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

  document.getElementById('account-settings-btn')?.addEventListener('click', () => {
    callbacks.onAccountSettings();
  });
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
  const allTrips = store.getTrips();
  const trips = allTrips.filter(t => !t.isArchived);
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

export function renderSetPasswordModal() {
  return `
    <div class="set-password-form">
      <h2>🔑 Set Account Password</h2>
      <p class="text-secondary">Set a password for faster sign-in next time. You can always still use magic links.</p>
      
      <form id="set-password-form">
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" placeholder="At least 6 characters" required minlength="6">
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input type="password" id="confirm-password" placeholder="Repeat password" required minlength="6">
        </div>
        <div id="set-password-error" class="form-error hidden">Passwords do not match.</div>
        <button type="submit" class="btn-primary" style="width: 100%;">Set Password</button>
      </form>
    </div>
  `;
}

export function renderInviteModal(trip) {
  const shareLink = `${window.location.origin}/join/${trip.id}`;

  return `
    <div class="invite-modal">
      <h2>✉️ Invite to ${trip.name}</h2>
      
      <div class="invite-section">
        <h3>Primary: Send Email Invitation</h3>
        <p class="text-secondary text-small">They'll get an email with a secure link to join.</p>
        <form id="email-invite-form">
          <div class="form-group" style="text-align: left;">
            <label for="invite-email" style="font-size: 0.8rem; margin-bottom: 4px;">Collaborator Email</label>
            <input type="email" id="invite-email" placeholder="collaborator@example.com" required style="width: 100%; padding: 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-sm); font-family: var(--font-body);">
          </div>
          <button type="submit" class="btn-primary" style="width: 100%;">Send Invitation</button>
        </form>
        <div id="invite-email-success" class="text-success hidden" style="margin-top: 8px; font-size: 0.875rem;">✅ Invite sent!</div>
      </div>

      <div class="divider"><span>OR</span></div>

      <div class="invite-section">
        <h3>Public Share Link</h3>
        <p class="text-secondary text-small">Share this link directly. It's the fastest way for others to join.</p>
        <div class="share-link-box" style="display: flex; gap: 8px; margin-top: 12px;">
          <input type="text" value="${shareLink}" readonly style="flex: 1; font-size: 0.875rem; padding: 10px; border: 2px solid var(--border-color); border-radius: var(--radius-sm); background: var(--cream);">
          <button class="btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${shareLink}'); alert('Link copied!')">Copy</button>
        </div>
      </div>
    </div>
  `;
}

export function renderTripEditForm(trip) {
  const formatDateInput = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  return `
    <div class="trip-setup-form">
      <h2>✏️ Edit Trip Details</h2>
      <p class="text-secondary">Update the core details of your trip.</p>
      
      <form id="trip-edit-form">
        <div class="form-group">
          <label for="edit-trip-name">Trip Name *</label>
          <input type="text" id="edit-trip-name" value="${trip.name}" required>
        </div>
        
        <div class="form-group">
          <label for="edit-trip-destination">Destination *</label>
          <input type="text" id="edit-trip-destination" value="${trip.destination}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="edit-trip-start-date">Start Date *</label>
            <input type="date" id="edit-trip-start-date" value="${formatDateInput(trip.startDate)}" required>
          </div>
          <div class="form-group">
            <label for="edit-trip-end-date">End Date *</label>
            <input type="date" id="edit-trip-end-date" value="${formatDateInput(trip.endDate)}" required>
          </div>
        </div>

        <div id="edit-trip-error" class="form-error hidden">Please fill in all required fields.</div>
        
        <div class="form-actions" style="flex-wrap: wrap; gap: 8px;">
          <button type="button" id="delete-trip-btn" class="btn-danger">🗑️ Delete Trip</button>
          <div style="flex: 1;"></div>
          <button type="button" class="btn-secondary" id="archive-trip-btn">
            ${trip.isArchived ? '📥 Revive' : '📦 Archive'}
          </button>
          <button type="button" class="btn-secondary" id="cancel-edit-btn">Cancel</button>
          <button type="submit" class="btn-primary">💾 Save Changes</button>
        </div>
      </form>
    </div>
  `;
}

export function renderAccountSettings(user, archivedTrips = []) {
  return `
    <div class="account-settings">
      <h2>👤 Account Settings</h2>
      <p class="text-secondary">Manage your personal details and archived trips.</p>

      <div class="settings-section">
        <h3>Personal Information</h3>
        <form id="account-settings-form">
          <div class="form-group">
            <label for="settings-name">Traveler Name</label>
            <input type="text" id="settings-name" value="${user?.name || ''}" placeholder="Your display name" required>
            <p class="text-small text-muted" style="margin-top: 4px;">This updates your name on all your trips.</p>
          </div>
          <button type="submit" class="btn-primary">Update Name</button>
        </form>
      </div>

      <div class="settings-section" style="margin-top: 2rem;">
        <h3>Archived Trips</h3>
        ${archivedTrips.length === 0 ? `
          <p class="text-muted text-small">No archived trips found.</p>
        ` : `
          <div class="archived-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
            ${archivedTrips.map(trip => `
              <div class="archived-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--cream); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <div>
                  <div style="font-weight: 600;">${trip.name}</div>
                  <div class="text-small text-muted">${trip.destination}</div>
                </div>
                <button class="btn-secondary btn-sm revive-trip-btn" data-id="${trip.id}">📥 Revive</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}
