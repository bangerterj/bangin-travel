/**
 * Transit Component - Transportation cards with reservation status
 */

export function renderTransit(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { transit } = trip;

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return {
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    };
  };

  const calculateDuration = (dep, arr) => {
    const diff = new Date(arr) - new Date(dep);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getTransitIcon = (type) => {
    const icons = {
      train: '🚄',
      bus: '🚌',
      taxi: '🚕',
      subway: '🚇',
      ferry: '🚢',
      rental_car: '🚗'
    };
    return icons[type] || '🚏';
  };

  const getTransitLabel = (type) => {
    const labels = {
      train: 'Train',
      bus: 'Bus',
      taxi: 'Taxi/Private Transfer',
      subway: 'Subway/Metro',
      ferry: 'Ferry',
      rental_car: 'Rental Car'
    };
    return labels[type] || type;
  };

  const isJRPassEligible = (ticketType) => {
    return ticketType && ticketType.toLowerCase().includes('jr pass');
  };

  const transitCards = transit.map(t => {
    const dep = formatDateTime(t.departureTime);
    const arr = formatDateTime(t.arrivalTime);
    const duration = calculateDuration(t.departureTime, t.arrivalTime);
    const travelers = store.getTravelersByIds(t.travelers);

    return `
      <div class="entity-card transit-card">
        <div class="entity-card-header">
          <div class="transit-type-badge">
            <span style="font-size: 1.25rem;">${getTransitIcon(t.type)}</span>
            <span>${getTransitLabel(t.type).toUpperCase()}</span>
          </div>
          ${isJRPassEligible(t.ticketType) ? `
            <span class="jr-pass-badge">JR Pass ✓</span>
          ` : ''}
          ${callbacks ? `
            <button class="btn-icon edit-btn" data-id="${t.id}" title="Edit Transit">✏️</button>
          ` : ''}
        </div>
        <div class="entity-card-body">
          <h3 style="margin-bottom: 16px;">${t.name}</h3>
          
          <div class="transit-route-display">
            <div class="transit-station">
              <div class="transit-station-name">${t.departureLocation}</div>
              <div class="transit-station-time">
                <strong>${dep.time}</strong> • ${dep.date}
              </div>
            </div>
            <div class="transit-arrow">═══▶</div>
            <div class="transit-station">
              <div class="transit-station-name">${t.arrivalLocation}</div>
              <div class="transit-station-time">
                <strong>${arr.time}</strong> • ${arr.date}
              </div>
            </div>
          </div>

          <div class="transit-meta" style="margin-top: 16px;">
            <div class="transit-meta-item">
              <span>⏱️</span>
              <span>Duration: <strong>${duration}</strong></span>
            </div>
            ${t.ticketType ? `
              <div class="transit-meta-item">
                <span>🎫</span>
                <span>${t.ticketType}</span>
              </div>
            ` : ''}
            ${t.reservationRequired ? `
              <div class="transit-meta-item">
                <span style="color: var(--warning);">📋</span>
                <span>Reservation Required</span>
              </div>
            ` : `
              <div class="transit-meta-item">
                <span style="color: var(--success);">✓</span>
                <span>No Reservation Needed</span>
              </div>
            `}
            ${t.cost && t.cost.amount > 0 ? `
              <div class="transit-meta-item">
                <span>💰</span>
                <span>${t.cost.currency === 'JPY' ? '¥' : '$'}${t.cost.amount.toLocaleString()}/person</span>
              </div>
            ` : ''}
          </div>

          ${t.confirmationCode ? `
            <div style="margin-top: 16px; padding: 8px 12px; background: rgba(39, 174, 96, 0.1); border-radius: 6px; font-size: 0.875rem;">
              <span class="text-muted">Confirmation:</span> <strong>${t.confirmationCode}</strong>
            </div>
          ` : ''}
        </div>
        <div class="entity-card-footer">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
            👥 Travelers:
          </div>
          <div class="traveler-list">
            ${travelers.map(tr => `
              <div class="traveler-chip">
                <div class="avatar avatar-sm" style="background-color: ${tr.color}">${tr.initials}</div>
                <span>${tr.name.split(' ')[0]}</span>
              </div>
            `).join('')}
          </div>
          ${t.notes ? `
            <div style="margin-top: 12px; padding: 8px 12px; background: var(--cream); border-radius: 6px; font-size: 0.75rem;">
              💡 ${t.notes}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="tab-header">
      <div class="tab-title">
        <span style="font-size: 1.5rem;">🚆</span>
        <h2>Transit</h2>
      </div>
      ${callbacks ? `
        <button class="btn-primary" id="add-transit-btn">➕ Add Transit</button>
      ` : ''}
    </div>
    ${transitCards}
  `;

  if (callbacks) {
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
  }
}

export function renderTransitForm(transit = null) {
  const isEdit = !!transit;
  const data = transit || {
    type: 'train',
    name: '',
    route: '',
    departureLocation: '',
    arrivalLocation: '',
    departureTime: '',
    arrivalTime: '',
    reservationRequired: false,
    confirmationCode: '',
    ticketType: '',
    cost: { amount: 0, currency: 'JPY' },
    notes: '',
    travelers: []
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  };

  return `
    <div class="form-container">
      <h2>${isEdit ? '✏️ Edit Transit' : '🚆 Add Transit'}</h2>
      <form id="transit-form">
        <div class="form-group">
          <label>Type</label>
          <select name="type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <option value="train" ${data.type === 'train' ? 'selected' : ''}>Train</option>
            <option value="bus" ${data.type === 'bus' ? 'selected' : ''}>Bus</option>
            <option value="subway" ${data.type === 'subway' ? 'selected' : ''}>Subway</option>
            <option value="taxi" ${data.type === 'taxi' ? 'selected' : ''}>Taxi</option>
            <option value="ferry" ${data.type === 'ferry' ? 'selected' : ''}>Ferry</option>
            <option value="rental_car" ${data.type === 'rental_car' ? 'selected' : ''}>Rental Car</option>
          </select>
        </div>

        <div class="form-group">
            <label for="name">Name / Route Name</label>
            <input type="text" name="name" value="${data.name}" placeholder="e.g. Narita Express" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="departureLocation">Dep Location</label>
                <input type="text" name="departureLocation" value="${data.departureLocation}" placeholder="e.g. Narita Airport" required>
            </div>
            <div class="form-group">
                <label for="arrivalLocation">Arr Location</label>
                <input type="text" name="arrivalLocation" value="${data.arrivalLocation}" placeholder="e.g. Shinjuku Station" required>
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
                <label>Ticket Type</label>
                <input type="text" name="ticketType" value="${data.ticketType}" placeholder="e.g. JR Pass, Suica, Ticket">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
                 <label class="checkbox-label">
                    <input type="checkbox" name="reservationRequired" value="true" ${data.reservationRequired ? 'checked' : ''}>
                    Reservation Required
                </label>
            </div>
        </div>

        <div class="form-group">
            <label for="confirmationCode">Confirmation Code</label>
            <input type="text" name="confirmationCode" value="${data.confirmationCode}" placeholder="e.g. RES-123">
        </div>

        <div class="form-group">
            <label>Cost</label>
            <div style="display: flex; gap: 8px;">
                <select name="cost.currency" style="width: 80px; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <option value="JPY" ${data.cost?.currency === 'JPY' ? 'selected' : ''}>JPY</option>
                    <option value="USD" ${data.cost?.currency === 'USD' ? 'selected' : ''}>USD</option>
                </select>
                <input type="number" name="cost.amount" value="${data.cost?.amount || 0}" placeholder="Cost per person">
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
