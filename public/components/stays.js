/**
 * Stays Component - Accommodation cards with traveler assignments
 */

export function renderStays(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { stays, travelers: allTravelers } = trip;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const diff = new Date(checkOut) - new Date(checkIn);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStayIcon = (type) => {
    const icons = {
      hotel: '🏨',
      airbnb: '🏠',
      hostel: '🛏️',
      ryokan: '🏯'
    };
    return icons[type] || '🏨';
  };

  const getStayLabel = (type) => {
    const labels = {
      hotel: 'Hotel',
      airbnb: 'Airbnb',
      hostel: 'Hostel',
      ryokan: 'Traditional Ryokan'
    };
    return labels[type] || type;
  };

  const formatAmenity = (amenity) => {
    const labels = {
      'wifi': '📶 WiFi',
      'breakfast': '🍳 Breakfast',
      'luggage-storage': '🧳 Luggage Storage',
      'onsen': '♨️ Onsen',
      'kaiseki-dinner': '🍱 Kaiseki Dinner',
      'tatami-rooms': '🎎 Tatami Rooms',
      'gym': '💪 Gym',
      'restaurant': '🍽️ Restaurant',
      'spa': '💆 Spa',
      'ski-shuttle': '🎿 Ski Shuttle',
      'pool': '🏊 Pool',
      'bar': '🍸 Bar'
    };
    return labels[amenity] || amenity;
  };

  const stayCards = stays.map(stay => {
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
                  <span class="stay-date-value">${formatDate(stay.checkIn)} at ${formatTime(stay.checkIn)}</span>
                </div>
                <div style="font-size: 1.25rem; color: var(--text-muted);">→</div>
                <div class="stay-date-item">
                  <span class="stay-date-label">Check-out</span>
                  <span class="stay-date-value">${formatDate(stay.checkOut)} at ${formatTime(stay.checkOut)}</span>
                </div>
                <div style="background: var(--accent-orange); color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.75rem;">
                  ${nights} ${nights === 1 ? 'night' : 'nights'}
                </div>
              </div>

              <div class="stay-address">
                <span>📍</span>
                <span>${stay.address}</span>
              </div>

              ${stay.confirmationCode ? `
                <div style="margin-bottom: 12px; font-size: 0.875rem;">
                  <span class="text-muted">Confirmation:</span> 
                  <strong>${stay.confirmationCode}</strong>
                </div>
              ` : ''}

              ${stay.amenities && stay.amenities.length > 0 ? `
                <div class="amenities-list">
                  ${stay.amenities.map(a => `
                    <span class="amenity-pill">${formatAmenity(a)}</span>
                  `).join('')}
                </div>
              ` : ''}

              ${stay.cost ? `
                <div class="stay-cost">
                  <span>💰</span>
                  <span class="stay-cost-total">$${stay.cost.amount}</span>
                  <span class="text-muted">($${stay.cost.perNight}/night × ${nights} nights)</span>
                  ${travelers.length > 1 ? `
                    <span class="text-muted">• $${Math.round(stay.cost.amount / travelers.length)}/person</span>
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
              📝 ${notStaying.map(t => t.name.split(' ')[0]).join(' & ')} staying elsewhere
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
  }).join('');

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
  const data = stay || {
    type: 'hotel',
    name: '',
    address: '',
    checkIn: '',
    checkOut: '',
    confirmationCode: '',
    amenities: [],
    cost: { amount: 0, currency: 'USD', perNight: 0 },
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
      <h2>${isEdit ? '✏️ Edit Stay' : '🏨 Add Stay'}</h2>
      <form id="stays-form">
        <div class="form-group">
          <label>Accommodation Type</label>
          <select name="type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <option value="hotel" ${data.type === 'hotel' ? 'selected' : ''}>Hotel</option>
            <option value="airbnb" ${data.type === 'airbnb' ? 'selected' : ''}>Airbnb</option>
            <option value="hostel" ${data.type === 'hostel' ? 'selected' : ''}>Hostel</option>
            <option value="ryokan" ${data.type === 'ryokan' ? 'selected' : ''}>Ryokan</option>
          </select>
        </div>

        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" name="name" value="${data.name}" placeholder="e.g. Shinjuku Granbell" required>
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

        <div class="form-group">
            <label for="confirmationCode">Confirmation Code</label>
            <input type="text" name="confirmationCode" value="${data.confirmationCode}" placeholder="e.g. RES-12345">
        </div>

        <div class="form-group">
            <label for="amenities">Amenities (comma separated)</label>
            <input type="text" name="amenities" value="${data.amenities ? data.amenities.join(', ') : ''}" placeholder="wifi, pool, breakfast">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Total Cost</label>
                <div style="display: flex; gap: 8px;">
                    <select name="cost.currency" style="width: 80px; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <option value="USD" ${data.cost?.currency === 'USD' ? 'selected' : ''}>USD</option>
                        <option value="JPY" ${data.cost?.currency === 'JPY' ? 'selected' : ''}>JPY</option>
                    </select>
                    <input type="number" name="cost.amount" value="${data.cost?.amount || 0}" placeholder="Total">
                </div>
            </div>
            <div class="form-group">
                <label>Cost Per Night</label>
                <input type="number" name="cost.perNight" value="${data.cost?.perNight || 0}" placeholder="Per Night">
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
