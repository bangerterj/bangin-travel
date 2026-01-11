/**
 * Flights Component - Flight cards with traveler assignments
 */

export function renderFlights(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { flights, travelers: allTravelers } = trip;

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return {
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  };

  const calculateDuration = (dep, arr) => {
    const diff = new Date(arr) - new Date(dep);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'departure': return 'badge-departure';
      case 'return': return 'badge-return';
      case 'internal': return 'badge-internal';
      default: return 'badge-type';
    }
  };

  const getBadgeLabel = (type) => {
    switch (type) {
      case 'departure': return 'Outbound';
      case 'return': return 'Return';
      case 'internal': return 'Internal';
      default: return type;
    }
  };

  const flightCards = flights.map(flight => {
    const dep = formatDateTime(flight.departureTime);
    const arr = formatDateTime(flight.arrivalTime);
    const duration = calculateDuration(flight.departureTime, flight.arrivalTime);
    const travelers = store.getTravelersByIds(flight.travelers);
    const missingTravelers = allTravelers.filter(t => !flight.travelers.includes(t.id));

    return `
      <div class="entity-card flight-card">
        <div class="flight-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${getBadgeClass(flight.type)}">${getBadgeLabel(flight.type)}</span>
            <span class="text-muted text-small">${flight.airline} ${flight.flightNumber}</span>
          </div>
          ${callbacks ? `
            <button class="btn-icon edit-btn" data-id="${flight.id}" title="Edit Flight">✏️</button>
          ` : ''}
        </div>
        <div class="entity-card-body flight-card-body">
          <div class="flight-route-display">
            <div class="flight-endpoint">
              <div class="airport-code">${flight.departureAirport}</div>
              <div class="airport-city">${flight.departureCity}</div>
              <div class="flight-time">${dep.time}</div>
              <div class="flight-date">${dep.date}</div>
            </div>
            <div class="flight-path">
              <div class="flight-path-line">
                <span class="line"></span>
                <span class="plane">✈️</span>
                <span class="line"></span>
              </div>
            </div>
            <div class="flight-endpoint arrival">
              <div class="airport-code">${flight.arrivalAirport}</div>
              <div class="airport-city">${flight.arrivalCity}</div>
              <div class="flight-time">${arr.time}</div>
              <div class="flight-date">${arr.date}</div>
            </div>
          </div>
          <div class="flight-details">
            <div class="flight-detail-item">
              <span class="flight-detail-label">Duration</span>
              <span class="flight-detail-value">${duration}</span>
            </div>
            ${flight.confirmationCode ? `
            <div class="flight-detail-item">
              <span class="flight-detail-label">Confirmation</span>
              <span class="flight-detail-value">${flight.confirmationCode}</span>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="entity-card-footer">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
            👥 Travelers on this flight:
          </div>
          <div class="traveler-list">
            ${travelers.map(t => `
              <div class="traveler-chip">
                <div class="avatar avatar-sm" style="background-color: ${t.color}">${t.initials}</div>
                <span>${t.name.split(' ')[0]}</span>
              </div>
            `).join('')}
          </div>
          ${missingTravelers.length > 0 && flight.type === 'internal' ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: rgba(241, 196, 15, 0.15); border-radius: 6px; font-size: 0.75rem;">
              ⚠️ Not on this flight: ${missingTravelers.map(t => t.name.split(' ')[0]).join(', ')}
            </div>
          ` : ''}
          ${flight.notes ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: var(--cream); border-radius: 6px; font-size: 0.75rem;">
              📝 ${flight.notes}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="tab-header">
      <div class="tab-title">
        <span style="font-size: 1.5rem;">✈️</span>
        <h2>Flights</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary" id="add-flight-btn">➕ Add Flight</button>
      ` : ''}
    </div>
    ${flightCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const flight = flights.find(f => f.id === btn.dataset.id);
        callbacks.onEdit('flights', flight);
      });
    });

    const addBtn = container.querySelector('#add-flight-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        callbacks.onAdd('flights');
      });
    }
  }
}

export function renderFlightForm(flight = null) {
  const isEdit = !!flight;
  // Default values if adding
  const data = flight || {
    type: 'departure',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    departureCity: '',
    arrivalAirport: '',
    arrivalCity: '',
    departureTime: '',
    arrivalTime: '',
    confirmationCode: '',
    notes: '',
    travelers: []
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // datetime-local expects YYYY-MM-DDThh:mm
    return d.toISOString().slice(0, 16);
  };

  return `
    <div class="form-container">
      <h2>${isEdit ? '✏️ Edit Flight' : '✈️ Add Flight'}</h2>
      <form id="flights-form">
        <div class="form-group">
          <label>Flight Type</label>
          <div style="display: flex; gap: 16px;">
            <label><input type="radio" name="type" value="departure" ${data.type === 'departure' ? 'checked' : ''}> Outbound</label>
            <label><input type="radio" name="type" value="return" ${data.type === 'return' ? 'checked' : ''}> Return</label>
            <label><input type="radio" name="type" value="internal" ${data.type === 'internal' ? 'checked' : ''}> Internal</label>
          </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="airline">Airline</label>
                <input type="text" name="airline" value="${data.airline}" placeholder="e.g. United" required>
            </div>
            <div class="form-group">
                <label for="flightNumber">Flight Number</label>
                <input type="text" name="flightNumber" value="${data.flightNumber}" placeholder="e.g. UA 123" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="departureAirport">Dep Airport</label>
                <input type="text" name="departureAirport" value="${data.departureAirport}" placeholder="e.g. SFO" required>
            </div>
            <div class="form-group">
                <label for="departureCity">Dep City</label>
                <input type="text" name="departureCity" value="${data.departureCity}" placeholder="e.g. San Francisco" required>
            </div>
        </div>

        <div class="form-group">
             <label for="departureTime">Departure Time</label>
             <input type="datetime-local" name="departureTime" value="${formatDateForInput(data.departureTime)}" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="arrivalAirport">Arr Airport</label>
                <input type="text" name="arrivalAirport" value="${data.arrivalAirport}" placeholder="e.g. NRT" required>
            </div>
            <div class="form-group">
                <label for="arrivalCity">Arr City</label>
                <input type="text" name="arrivalCity" value="${data.arrivalCity}" placeholder="e.g. Tokyo" required>
            </div>
        </div>

        <div class="form-group">
             <label for="arrivalTime">Arrival Time</label>
             <input type="datetime-local" name="arrivalTime" value="${formatDateForInput(data.arrivalTime)}" required>
        </div>

        <div class="form-group">
            <label for="confirmationCode">Confirmation Code</label>
            <input type="text" name="confirmationCode" value="${data.confirmationCode}" placeholder="e.g. ABC123XYZ">
        </div>

        <div class="form-group">
            <label>Travelers</label>
            <div class="checkbox-group">
                ${generateTravelerCheckboxes(data.travelers)}
            </div>
        </div>

        <div class="form-group">
            <label for="notes">Notes</label>
            <textarea name="notes" rows="3">${data.notes}</textarea>
        </div>

        <div class="form-actions">
           ${isEdit ? '<button type="button" id="delete-btn" class="btn-danger">🗑️ Delete</button>' : '<div></div>'}
           <button type="submit" class="btn-primary">Save Flight</button>
        </div>
      </form>
    </div>
    `;
}

function generateTravelerCheckboxes(selectedIds = []) {
  // We need access to store.getActiveTrip() here but store isn't passed to renderForm
  // We can use window.store as a fallback since it's exposed in app.js for debug
  // Or we could pass travelers list to renderFlightForm
  const trip = window.store?.getActiveTrip();
  if (!trip) return '';

  return trip.travelers.map(t => `
        <label class="checkbox-label">
            <input type="checkbox" name="travelers" value="${t.id}" ${selectedIds.includes(t.id) ? 'checked' : ''}>
            ${t.name}
        </label>
    `).join('');
}
