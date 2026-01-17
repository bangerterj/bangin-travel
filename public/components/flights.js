import { renderItemCard } from './common/ItemCard.js';

/**
 * Flights Component - Handles rendering and form for flight data
 */

export function renderFlights(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { flights, travelers: allTravelers } = trip;

  const flightCards = flights && flights.length > 0 ? flights.map(flight => {
    return renderItemCard(flight, 'flight');
  }).join('') : `<div class="empty-state" style="text-align: center; padding: 40px 0;">
    <p style="color: var(--text-secondary);">No flights added yet.</p>
  </div>`;

  container.innerHTML = `
    <div class="tab-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div class="tab-title" style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">✈️</span>
        <h2 style="margin: 0;">Flights</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary-compact" id="add-flight-btn" title="Add Flight">➕</button>
      ` : ''}
    </div>
    ${flightCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Stop propagation just in case, though item card already handles map btn propagation
        e.stopPropagation();
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

    // View Details on Card Click
    container.querySelectorAll('.unified-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent if clicking actions (though they usually stop prop)
        if (e.target.closest('.btn-action') || e.target.closest('a')) return;

        const id = card.dataset.id;
        const flight = flights.find(f => f.id === id);
        if (flight && callbacks.onView) {
          callbacks.onView('flight', flight);
        }
      });
    });
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

  const data = flight ? {
    type: flight.type || 'departure',
    airline: flight.airline || '',
    flightNumber: flight.flightNumber || '',
    departureAirport: flight.departureAirport || '',
    arrivalAirport: flight.arrivalAirport || '',
    departureTime: flight.isNew ? `${flight.date}T${flight.startTime}` : (flight.startAt || flight.departureTime),
    arrivalTime: flight.isNew ? `${flight.date}T${flight.endTime}` : (flight.endAt || flight.arrivalTime),
    duration: flight.duration || '',
    notes: flight.notes || '',
    travelers: flight.travelers || allTravelerIds,
    cost: flight.cost || flight.metadata?.cost || { amount: '', currency: 'USD' },
    paidBy: flight.paidBy || flight.cost?.paidBy || flight.metadata?.cost?.paidBy || ''
  } : {
    type: 'departure',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    duration: '',
    notes: '',
    travelers: allTravelerIds,
    cost: { amount: '', currency: 'USD' },
    paidBy: ''
  };

  const formatDateForInput = (dateStr, timezone) => {
    if (!dateStr) return '';
    // If it's already in the correct format from pre-fill (YYYY-MM-DDTHH:mm), return it
    // Expanded regex to catch likely valid inputs that just need to be passed through
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr) && !timezone) {
      return dateStr.substring(0, 16);
    }

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

      // Fallback: If no timezone content, assume the string is the "Wall Clock" time we want.
      // Avoid new Date() -> toISOString() roundtrip if possible as it shifts based on local vs UTC.
      if (typeof dateStr === 'string') {
        return dateStr.substring(0, 16);
      }
      return date.toISOString().slice(0, 16);
    } catch (e) {
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
