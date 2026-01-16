/**
 * Stays Component - Handles rendering and form for accommodation data
 */

export function renderStays(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { stays, travelers: allTravelers } = trip;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Use T00:00:00 to ensure local date parsing
    const date = new Date(dateStr.split('T')[0] + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn.split('T')[0] + 'T00:00:00');
    const d2 = new Date(checkOut.split('T')[0] + 'T00:00:00');
    const diff = d2 - d1;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStayIcon = (type) => {
    const icons = {
      hotel: '🏨',
      airbnb: '🏠',
      hostel: '🛌'
    };
    return icons[type] || '🏨';
  };

  const getStayLabel = (type) => {
    const labels = {
      hotel: 'Hotel',
      airbnb: 'Airbnb',
      hostel: 'Hostel'
    };
    return labels[type] || type;
  };

  const formatAmenity = (amenity) => {
    const labels = {
      'wifi': '📶 WiFi',
      'breakfast': '🍳 Breakfast',
      'pool': '🏊 Pool',
      'gym': '💪 Gym'
    };
    return labels[amenity.toLowerCase()] || amenity;
  };

  const stayCards = stays && stays.length > 0 ? stays.map(stay => {
    const nights = calculateNights(stay.checkIn, stay.checkOut);
    const travelers = store.getTravelersByIds(stay.travelers);
    const notStaying = allTravelers.filter(t => !stay.travelers.includes(t.id));

    return `
      <div class="entity-card stay-card">
        <div class="entity-card-body">
          <div class="stay-card-content">
            <div class="stay-thumbnail">
              ${getStayIcon(stay.type)}
            </div>
            <div class="stay-info">
              <span class="badge badge-type">${getStayLabel(stay.type)}</span>
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3 style="margin-top: 8px;">${stay.name}</h3>
                ${callbacks ? `
                  <button class="btn-icon edit-btn" data-id="${stay.id}" title="Edit Stay">✏️</button>
                ` : ''}
              </div>
              
              <div class="stay-dates">
                <div class="stay-date-item">
                  <span class="stay-date-label">Check-in</span>
                  <span class="stay-date-value">${formatDate(stay.checkIn)}</span>
                </div>
                <div style="font-size: 1.25rem; color: var(--text-muted);">→</div>
                <div class="stay-date-item">
                  <span class="stay-date-label">Check-out</span>
                  <span class="stay-date-value">${formatDate(stay.checkOut)}</span>
                </div>
                <div style="background: var(--accent-orange); color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.75rem;">
                  ${nights} ${nights === 1 ? 'night' : 'nights'}
                </div>
              </div>

              <div class="stay-address">
                <span>📍</span>
                <span>${stay.address}</span>
              </div>



              ${stay.cost && stay.cost.amount > 0 ? `
                <div class="stay-cost">
                  <span>💰</span>
                  <span class="stay-cost-total">$${parseFloat(stay.cost.amount || 0).toFixed(2)}</span>
                  ${stay.cost.perNight ? `<span class="text-muted">($${parseFloat(stay.cost.perNight).toFixed(2)}/night × ${nights} nights)</span>` : ''}
                  ${travelers.length > 1 ? `
                    <span class="text-muted">• $${Math.round(stay.cost.amount / travelers.length).toLocaleString()}/person</span>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="entity-card-footer">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
            👥 Staying here:
          </div>
          <div class="traveler-list">
            ${travelers.map(t => `
              <div class="traveler-chip">
                <div class="avatar avatar-sm" style="background-color: ${t.color}">${t.initials}</div>
                <span>${t.name.split(' ')[0]}</span>
              </div>
            `).join('')}
          </div>
          ${notStaying.length > 0 ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: rgba(52, 152, 219, 0.1); border-radius: 6px; font-size: 0.75rem;">
              ℹ️ ${notStaying.map(t => t.name.split(' ')[0]).join(' & ')} staying elsewhere
            </div>
          ` : ''}
          ${stay.notes ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: var(--cream); border-radius: 6px; font-size: 0.75rem;">
              💡 ${stay.notes}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('') : `<div class="empty-state">
    <div style="font-size: 3rem; margin-bottom: 1rem;">🏨</div>
    <p>No stays added yet.</p>
  </div>`;

  container.innerHTML = `
    <div class="tab-header">
      <div class="tab-title">
        <span style="font-size: 1.5rem;">🏨</span>
        <h2>Stays</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary" id="add-stay-btn">➕ Add Stay</button>
      ` : ''}
    </div>
    ${stayCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
  }
}

export function renderStayForm(stay = null) {
  const isEdit = !!stay;
  const allTravelerIds = window.store?.getActiveTrip()?.travelers.map(t => t.id) || [];

  const data = stay || {
    type: 'hotel',
    name: '',
    address: '',
    checkIn: '',
    checkOut: '',
    amenities: [],
    cost: { amount: 0, currency: 'USD', perNight: 0 },
    notes: '',
    travelers: allTravelerIds,
    paidBy: stay?.paidBy || ''
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
                <input type="date" name="checkIn" value="${data.checkIn ? data.checkIn.split('T')[0] : ''}" required>
            </div>
            <div class="form-group">
                <label for="checkOut">Check Out</label>
                <input type="date" name="checkOut" value="${data.checkOut ? data.checkOut.split('T')[0] : ''}" required>
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
