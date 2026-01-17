import { renderItemCard } from './common/ItemCard.js';

/**
 * Transit Component - Handles rendering and form for transportation data
 */

export function renderTransit(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { transit } = trip;

  const transitCards = transit && transit.length > 0 ? transit.map(item => {
    return renderItemCard(item, 'transit');
  }).join('') : `<div class="empty-state" style="text-align: center; padding: 40px 0;">
    <p style="color: var(--text-secondary);">No transit legs added yet.</p>
  </div>`;

  container.innerHTML = `
    <div class="tab-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div class="tab-title" style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">🚆</span>
        <h2 style="margin: 0;">Transit</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary-compact" id="add-transit-btn" title="Add Transit">➕</button>
      ` : ''}
    </div>
    ${transitCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = transit.find(t => t.id === btn.dataset.id);
        callbacks.onEdit('transit', item);
      });
    });

    const addBtn = container.querySelector('#add-transit-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        callbacks.onAdd('transit');
      });
    }

    // View Details on Card Click
    container.querySelectorAll('.unified-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-action') || e.target.closest('a')) return;
        const item = transit.find(t => t.id === card.dataset.id);
        if (item && callbacks.onView) {
          callbacks.onView('transit', item);
        }
      });
    });
  }
}

export function renderTransitForm(transit = null) {
  const isEdit = !!transit;
  const allTravelerIds = window.store?.getActiveTrip()?.travelers.map(t => t.id) || [];

  const data = transit ? {
    type: transit.type || 'train',
    name: transit.name || '',
    route: transit.route || '',
    departureLocation: transit.departureLocation || '',
    arrivalLocation: transit.arrivalLocation || '',
    departureTime: transit.isNew ? `${transit.date}T${transit.startTime}` : (transit.startAt || transit.departureTime || ''),
    arrivalTime: transit.isNew ? `${transit.date}T${transit.endTime}` : (transit.endAt || transit.arrivalTime || ''),
    cost: transit.cost || { amount: 0, currency: 'USD' },
    notes: transit.notes || '',
    travelers: transit.travelers || allTravelerIds,
    paidBy: transit.paidBy || transit.cost?.paidBy || ''
  } : {
    type: 'train',
    name: '',
    route: '',
    departureLocation: '',
    arrivalLocation: '',
    departureTime: '',
    arrivalTime: '',
    cost: { amount: 0, currency: 'USD' },
    notes: '',
    travelers: allTravelerIds,
    paidBy: ''
  };

  /* Robust Date Formatter using Trip Timezone */
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // If it's already in the correct format from pre-fill (YYYY-MM-DDTHH:mm), return it
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) return dateStr;

    const trip = window.store?.getActiveTrip();
    const timezone = trip?.timezone || 'UTC';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
      const parts = fmt.formatToParts(date);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
    } catch (e) {
      return dateStr ? new Date(dateStr).toISOString().slice(0, 16) : '';
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

  return `
    <div class="form-container">
      <h2>${isEdit ? '📝 Edit Transit' : '🚆 Add Transit'}</h2>
      
      ${renderImportZone()}

      <form id="transit-form">
        <div class="form-group">
          <label>Type</label>
          <select name="type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <option value="train" ${data.type === 'train' ? 'selected' : ''}>Train / Shinkansen</option>
            <option value="bus" ${data.type === 'bus' ? 'selected' : ''}>Bus</option>
            <option value="subway" ${data.type === 'subway' ? 'selected' : ''}>Subway / Metro</option>
            <option value="ferry" ${data.type === 'ferry' ? 'selected' : ''}>Ferry</option>
            <option value="taxi" ${data.type === 'taxi' ? 'selected' : ''}>Taxi / Uber</option>
            <option value="rental_car" ${data.type === 'rental_car' ? 'selected' : ''}>Rental Car</option>
            <option value="drive" ${data.type === 'drive' ? 'selected' : ''}>Drive</option>
          </select>
        </div>

        <div class="form-group">
            <label for="name">Name / Route</label>
            <input type="text" name="name" value="${data.name}" placeholder="e.g. Narita Express NE 123" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="departureLocation">From</label>
                <input type="text" name="departureLocation" value="${data.departureLocation}" placeholder="e.g. Tokyo Station" required>
            </div>
            <div class="form-group">
                <label for="arrivalLocation">To</label>
                <input type="text" name="arrivalLocation" value="${data.arrivalLocation}" placeholder="e.g. Kyoto Station" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="departureTime">Dep Time</label>
                <input type="datetime-local" name="departureTime" value="${formatDateForInput(data.departureTime)}" required>
            </div>
            <div class="form-group">
                <label for="arrivalTime">Arr Time</label>
                <input type="datetime-local" name="arrivalTime" value="${formatDateForInput(data.arrivalTime)}" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Cost (Total USD)</label>
                <div style="display: flex; gap: 8px;">
                    <input type="number" name="cost.amount" value="${data.cost?.amount || data.metadata?.cost?.amount || ''}" placeholder="Cost total" step="0.01" min="0" class="currency-input" style="flex: 1;">
                    <input type="hidden" name="cost.currency" value="USD">
                </div>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="paidBy">Paid by</label>
                <select name="paidBy" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <option value="">-- Select Payer --</option>
                    ${window.store?.getActiveTrip()?.travelers.map(t => {
    const payerId = data.paidBy || data.cost?.paidBy || data.metadata?.cost?.paidBy;
    return `<option value="${t.id}" ${payerId === t.id ? 'selected' : ''}>${t.name}</option>`;
  }).join('')}
                </select>
            </div>
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
           <button type="submit" class="btn-primary">Save Transit</button>
        </div>
      </form>
    </div>
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
