import { renderItemCard } from './common/ItemCard.js';

/**
 * Stays Component - Handles rendering and form for accommodation data
 */

export function renderStays(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { stays } = trip;

  const stayCards = stays && stays.length > 0 ? stays.map(stay => {
    return renderItemCard(stay, 'stay');
  }).join('') : `<div class="empty-state" style="text-align: center; padding: 40px 0;">
    <p style="color: var(--text-secondary);">No stays added yet.</p>
  </div>`;

  container.innerHTML = `
    <div class="tab-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div class="tab-title" style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">🏨</span>
        <h2 style="margin: 0;">Stays</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary-compact" id="add-stay-btn" title="Add Stay">➕</button>
      ` : ''}
    </div>
    ${stayCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const stay = stays.find(s => s.id === btn.dataset.id);
        callbacks.onEdit('stays', stay);
      });
    });

    const addBtn = container.querySelector('#add-stay-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        callbacks.onAdd('stays');
      });
    }

    // View Details on Card Click
    container.querySelectorAll('.unified-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-action') || e.target.closest('a')) return;
        const id = card.dataset.id;
        const stay = stays.find(s => s.id === id);
        if (stay && callbacks.onView) {
          callbacks.onView('stay', stay);
        }
      });
    });
  }
}

export function renderStayForm(stay = null) {
  const isEdit = !!stay;
  const allTravelerIds = window.store?.getActiveTrip()?.travelers.map(t => t.id) || [];

  const data = stay ? {
    type: stay.type || 'hotel',
    name: stay.title || stay.name || '',
    address: stay.address || '',
    checkIn: stay.isNew ? `${stay.date}T${stay.startTime || '00:00'}` : (stay.startAt || stay.checkIn || ''),
    checkOut: stay.isNew ? `${stay.date}T${stay.endTime || '23:59'}` : (stay.endAt || stay.checkOut || ''),
    amenities: stay.amenities || [],
    cost: stay.cost || { amount: 0, currency: 'USD', perNight: 0 },
    notes: stay.notes || '',
    travelers: stay.travelers || allTravelerIds,
    paidBy: stay.paidBy || stay.cost?.paidBy || ''
  } : {
    type: 'hotel',
    name: '',
    address: '',
    checkIn: '',
    checkOut: '',
    amenities: [],
    cost: { amount: 0, currency: 'USD', perNight: 0 },
    notes: '',
    travelers: allTravelerIds,
    paidBy: ''
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

  return `
    <div class="form-container">
      <h2>${isEdit ? '📝 Edit Stay' : '🏨 Add Stay'}</h2>
      
      ${renderImportZone()}

      <form id="stays-form">
        <div class="form-group">
          <label>Accommodation Type</label>
          <select name="type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <option value="hotel" ${data.type === 'hotel' ? 'selected' : ''}>Hotel</option>
            <option value="airbnb" ${data.type === 'airbnb' ? 'selected' : ''}>Airbnb</option>
            <option value="hostel" ${data.type === 'hostel' ? 'selected' : ''}>Hostel</option>
          </select>
        </div>

        <div class="form-group">
            <label for="title">Name</label>
            <input type="text" name="title" value="${data.title || data.name || ''}" placeholder="e.g. Shinjuku Granbell" required>
        </div>

        <div class="form-group">
            <label for="address">Address</label>
            <input type="text" name="address" value="${data.address}" placeholder="e.g. 2-14-5 Kabukicho" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="checkIn">Check In</label>
                <input type="datetime-local" name="checkIn" value="${formatDateForInput(data.checkIn)}" required>
            </div>
            <div class="form-group">
                <label for="checkOut">Check Out</label>
                <input type="datetime-local" name="checkOut" value="${formatDateForInput(data.checkOut)}" required>
            </div>
        </div>



        <div class="form-row">
            <div class="form-group">
                <label>Total Cost (USD)</label>
                <div style="display: flex; gap: 8px;">
                     <input type="number" name="cost.amount" value="${data.cost?.amount || data.metadata?.cost?.amount || ''}" placeholder="0.00" step="0.01" min="0" class="currency-input" style="flex: 1;">
                     <input type="hidden" name="cost.currency" value="USD">
                </div>
            </div>
            <!-- Per Night removed as per request -->
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
            <label>Travelers (Staying here)</label>
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
           <button type="submit" class="btn-primary">Save Stay</button>
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
