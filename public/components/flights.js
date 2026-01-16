/**
 * Flights Component - Handles rendering and form for flight data
 */

export function renderFlights(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { flights, travelers: allTravelers } = trip;

  const formatDateTime = (dateStr, timezone) => {
    if (!dateStr) return { time: '', date: '', offset: '' }; // Added offset
    // robust parsing for purely local display (no timezone conversion)
    // expected format: YYYY-MM-DDTHH:mm
    try {
      const [d, t] = dateStr.split('T');
      if (!d || !t) throw new Error('Invalid format');

      const [year, month, day] = d.split('-').map(Number);
      const [hour, minute] = t.split(':').map(Number);

      const dateObj = new Date(year, month - 1, day, hour, minute);

      // Get UTC offset string if timezone is provided
      let offset = '';
      if (timezone) {
        try {
          // Intl can give us "GMT+9" or "GMT-7"
          const part = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
            .formatToParts(dateObj).find(p => p.type === 'timeZoneName');
          if (part) offset = part.value.replace('GMT', 'UTC');
        } catch (e) { console.error('Offset calc error', e); }
      }

      return {
        time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), // Changed to 12h
        date: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        offset: offset
      };
    } catch (e) {
      // Fallback
      const date = new Date(dateStr);
      return {
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        offset: ''
      };
    }
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

  const flightCards = flights && flights.length > 0 ? flights.map(flight => {
    // Pass timezone from metadata
    const dep = formatDateTime(flight.departureTime, flight.metadata?.departureTimezone);
    const arr = formatDateTime(flight.arrivalTime, flight.metadata?.arrivalTimezone);
    const travelers = store.getTravelersByIds(flight.travelers);
    const missingTravelers = allTravelers.filter(t => !flight.travelers.includes(t.id));

    return `
      <div class="entity-card flight-card">
        <div class="flight-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${getBadgeClass(flight.type)}">${getBadgeLabel(flight.type)}</span>
            <span class="text-muted text-small flight-card-title">${flight.airline} ${flight.flightNumber}</span>
          </div>
          ${callbacks ? `
            <button class="btn-icon edit-btn" data-id="${flight.id}" title="Edit Flight">✏️</button>
          ` : ''}
        </div>
        <div class="entity-card-body flight-card-body">
          <div class="flight-route-display">
            <div class="flight-endpoint">
              <div class="airport-code">${flight.departureAirport}</div>
              <div class="flight-time-group">
                <div class="flight-time">${dep.time}</div>
                ${dep.offset ? `<div class="flight-offset">${dep.offset}</div>` : ''}
              </div>
              <div class="flight-date">${dep.date}</div>
            </div>
            <div class="flight-path">
              <div class="flight-path-line">
                <span class="line"></span>
                <span class="plane">✈️</span>
                <span class="line"></span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                ${flight.duration || ''}
              </div>
            </div>
            <div class="flight-endpoint arrival">
              <div class="airport-code">${flight.arrivalAirport}</div>
              <div class="flight-time-group">
                <div class="flight-time">${arr.time}</div>
                ${arr.offset ? `<div class="flight-offset">${arr.offset}</div>` : ''}
              </div>
              <div class="flight-date">${arr.date}</div>
            </div>
          </div>
          
        </div>
        <div class="entity-card-footer">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
            👥 Travelers:
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
              📌 ${flight.notes}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('') : `<div class="empty-state">
    <div style="font-size: 3rem; margin-bottom: 1rem;">✈️</div>
    <p>No flights added yet.</p>
  </div>`;

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

export function renderFlightForm(flight = null, store = null) {
  const isEdit = !!flight;
  // Use passed store or fallback to window.store
  const currentStore = store || window.store;
  let allTravelerIds = [];

  if (currentStore) {
    const activeTrip = currentStore.getActiveTrip();
    if (activeTrip && activeTrip.travelers) {
      allTravelerIds = activeTrip.travelers.map(t => t.id);
    }
  }

  const data = flight || {
    type: 'departure',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    duration: '',
    notes: '',
    travelers: allTravelerIds, // Default to ALL travelers for new items
    cost: '',
    paidBy: ''
  };

  const formatDateForInput = (dateStr, timezone) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (timezone) {
        // "en-CA" is a trick to get YYYY-MM-DD, mixed with hour12: false for 24h time
        // We need YYYY-MM-DDTHH:mm
        const opts = {
          timeZone: timezone,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        };
        const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(date);
        const map = parts.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
        return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
      }
      // Fallback: use UTC slice if no timezone (as stored DB value is UTC)
      return date.toISOString().slice(0, 16);
    } catch (e) {
      console.error('Date format error', e);
      return '';
    }
  };

  const renderImportZone = () => {
    if (isEdit) return '';
    return `
      <div class="import-zone" id="import-zone">
        <div class="import-icon">📄</div>
        <div class="import-text">
            <strong>Drag screenshot here</strong> or <span class="cmd-shortcut">Ctrl+V / Cmd+V</span> to paste
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            AI will auto-fill details
        </div>
        <input type="file" id="import-file-input" accept="image/*" style="display: none;">
        <button type="button" onclick="document.getElementById('import-file-input').click()" class="btn-text" style="font-size: 0.875rem; margin-top: 8px;">
            Or click to upload
        </button>
      </div>
      <div class="form-divider"><span>OR ENTER MANUALLY</span></div>
    `;
  };

  const getOffsetHint = (timezone) => {
    if (!timezone) return '';
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
        .formatToParts(new Date()).find(p => p.type === 'timeZoneName');
      const offset = part ? part.value.replace('GMT', 'UTC') : '';
      return offset ? ` <span style="font-weight: 400; color: var(--text-muted); font-size: 0.75em;">(${offset})</span>` : '';
    } catch (e) { return ''; }
  };
  const depOffset = getOffsetHint(data.departureTimezone || data.metadata?.departureTimezone);
  const arrOffset = getOffsetHint(data.arrivalTimezone || data.metadata?.arrivalTimezone);

  return `
    <div class="form-container">
      <h2>${isEdit ? '📝 Edit Flight' : '✈️ Add Flight'}</h2>
      
      ${renderImportZone()}

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
                <label for="arrivalAirport">Arr Airport</label>
                <input type="text" name="arrivalAirport" value="${data.arrivalAirport}" placeholder="e.g. NRT" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                 <label for="departureTime">Dep Time (Local${depOffset})</label>
                 <input type="datetime-local" name="departureTime" value="${formatDateForInput(data.startAt || data.departureTime, data.departureTimezone || data.metadata?.departureTimezone)}" required>
            </div>
            <div class="form-group">
                 <label for="arrivalTime">Arr Time (Local${arrOffset})</label>
                 <input type="datetime-local" name="arrivalTime" value="${formatDateForInput(data.endAt || data.arrivalTime, data.arrivalTimezone || data.metadata?.arrivalTimezone)}" required>
            </div>
        </div >

        <div class="form-row">
            <div class="form-group">
                <label for="duration">Duration</label>
                <input type="text" name="duration" value="${data.duration || ''}" placeholder="e.g. 11h 20m">
            </div>
            <div class="form-group">
                <label for="cost">Cost (Total)</label>
                <input type="number" name="cost.amount" value="${data.cost?.amount || data.metadata?.cost?.amount || ''}" placeholder="0.00" step="0.01" min="0" class="currency-input">
                <input type="hidden" name="cost.currency" value="${data.cost?.currency || 'USD'}">
            </div>
        </div>

        <script>
            // Format currency on blur
            document.querySelectorAll('.currency-input').forEach(input => {
                input.addEventListener('blur', (e) => {
                    if (e.target.value) {
                        e.target.value = parseFloat(e.target.value).toFixed(2);
                    }
                });
            });
        </script>

        <div class="form-group">
            <label for="paidBy">Paid by</label>
            <select name="paidBy">
                <option value="">-- Select Payer --</option>
                ${window.store?.getActiveTrip()?.travelers.map(t => {
    const payerId = data.paidBy || data.cost?.paidBy || (data.metadata?.cost?.paidBy);
    return `<option value="${t.id}" ${payerId === t.id ? 'selected' : ''}>${t.name}</option>`;
  }).join('')}
            </select>
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
      </form >
    </div >
    `;
}

function generateTravelerCheckboxes(selectedIds = []) {
  const trip = window.store?.getActiveTrip();
  if (!trip) return '';

  return trip.travelers.map(t => `
    <label class="checkbox-label">
      <input type="checkbox" name="travelers" value="${t.id}" ${selectedIds.includes(t.id) ? 'checked' : ''}>
        ${t.name}
    </label>
  `).join('');
}
