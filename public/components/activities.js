/**
 * Activities Component - Handles rendering and form for trip activities
 */

export function renderActivities(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { activities } = trip;
  let filter = 'all';

  function render() {
    // No filtering, show all sorted by date
    const sortedActivities = [...activities].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Group by date
    const grouped = {};
    if (sortedActivities.length > 0) {
      sortedActivities.forEach(a => {
        const dateKey = new Date(a.startTime.split('T')[0] + 'T00:00:00').toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(a);
      });
    }
    const sortedDates = Object.keys(grouped); // Already sorted by insertion implicitly if we sorted input? No, verify.
    // robust sort
    sortedDates.sort((a, b) => new Date(a) - new Date(b));

    const formatGroupDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const calculateDuration = (start, end) => {
      if (!start || !end) return '';
      const diff = new Date(end) - new Date(start);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours === 0) return `${mins} min`;
      if (mins === 0) return `${hours} hours`;
      return `${hours}h ${mins}m`;
    };

    const activityGroups = sortedDates.map(dateKey => {
      const dayActivities = grouped[dateKey];
      const locations = [...new Set(dayActivities.map(a => {
        const parts = a.location.split(',');
        return parts[parts.length - 1].trim();
      }))];

      return `
        <div class="activity-day-group">
          <div class="activity-day-header">
            <div class="activity-day-date">${formatGroupDate(dateKey)}</div>
            <div class="activity-day-location">📍 ${locations.join(', ')}</div>
          </div>
          ${dayActivities.map(activity => {
        const travelers = activity.travelers ? store.getTravelersByIds(activity.travelers) : [];
        const duration = calculateDuration(activity.startTime, activity.endTime);
        const isBooked = activity.status === 'booked';

        return `
              <div class="entity-card activity-card" style="${isBooked ? 'border-left: 4px solid var(--success);' : ''}">
                <div class="entity-card-body">
                  <div class="activity-card-header">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        <div class="activity-title-row">
                             <span class="activity-icon">📍</span>
                             <h3>${activity.name}</h3>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${isBooked ? '<span class="badge badge-nice-to-have">✅ Booked</span>' : '<span class="badge badge-optional">💭 Planned</span>'}
                            ${callbacks ? `<button class="btn-icon edit-btn" data-id="${activity.id}" title="Edit Activity">✏️</button>` : ''}
                        </div>
                    </div>
                  </div>

                  <div class="activity-time-location">
                    <div>
                      <span>🕒</span>
                      <span>${formatTime(activity.startTime)} – ${formatTime(activity.endTime)}</span>
                      <span class="text-muted">(${duration})</span>
                    </div>
                    <div>
                      <span>📍</span>
                      <span>${activity.location}</span>
                    </div>
                    ${activity.cost && activity.cost.amount > 0 ? `
                      <div>
                        <span>💰</span>
                        <span>$${activity.cost.amount.toLocaleString()}/person</span>
                      </div>
                    ` : ''}
                  </div>

                  ${activity.notes ? `
                    <div class="activity-notes">
                      <span>📝</span>
                      <span>${activity.notes}</span>
                    </div>
                  ` : ''}

                  ${activity.links && activity.links.filter(Boolean).length > 0 ? `
                    <div style="margin-bottom: 12px;">
                      ${activity.links.map(link => `<a href="${link}" target="_blank" style="font-size: 0.75rem; color: var(--primary-blue);">🔗 More Info</a>`).join(' ')}
                    </div>
                  ` : ''}

                  <div style="margin-top: 12px;">
                    <div class="traveler-list">
                      ${travelers.map(t => `
                        <div class="traveler-chip">
                          <div class="avatar avatar-sm" style="background-color: ${t.color}">${t.initials}</div>
                          <span>${t.name.split(' ')[0]}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
      }).join('')}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="tab-header">
        <div class="tab-title">
          <span style="font-size: 1.5rem;">📍</span>
          <h2>Activities</h2>
        </div>
        ${callbacks ? `<button class="btn-primary" id="add-activity-btn">➕ Add Activity</button>` : ''}
      </div>

      <!-- No Filters -->

      ${activityGroups.length > 0 ? activityGroups : `
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
          <p>No activities added yet.</p>
        </div>
      `}
    `;

    if (callbacks) {
      container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = activities.find(a => a.id === btn.dataset.id);
          callbacks.onEdit('activities', item);
        });
      });
      const addBtn = container.querySelector('#add-activity-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          callbacks.onAdd('activities');
        });
      }
    }
  }

  render(); // Initial render
}

export function renderActivityForm(activity = null) {
  const isEdit = !!activity;
  const allTravelerIds = window.store?.getActiveTrip()?.travelers.map(t => t.id) || [];

  const data = activity || {
    name: '',
    location: '',
    startTime: '',
    endTime: '',
    status: 'planned',
    cost: { amount: 0, currency: 'USD' },
    notes: '',
    links: [],
    travelers: allTravelerIds,
    paidBy: activity?.paidBy || activity?.cost?.paidBy || activity?.metadata?.cost?.paidBy || ''
  };

  /* Robust Date Formatter using Trip Timezone */
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
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
      console.error('Date format error', e);
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
      <h2>${isEdit ? '📝 Edit Activity' : '📍 Add Activity'}</h2>
      
      ${renderImportZone()}

      <form id="activities-form">
        
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" name="name" value="${data.name}" placeholder="e.g. TeamLabs Planets" required>
        </div>

        <div class="form-group">
            <label for="location">Location</label>
            <input type="text" name="location" value="${data.location}" placeholder="e.g. Toyosu, Tokyo" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="startTime">Start Time</label>
                <input type="datetime-local" name="startTime" value="${formatDateForInput(data.startTime)}" required>
            </div>
            <div class="form-group">
                <label for="endTime">End Time</label>
                <input type="datetime-local" name="endTime" value="${formatDateForInput(data.endTime)}" required>
            </div>
        </div>

        <div class="form-group" style="display: flex; align-items: flex-end;">
             <label class="checkbox-label">
                <input type="checkbox" name="status" value="booked" ${data.status === 'booked' ? 'checked' : ''}>
                ✅ Already Booked?
            </label>
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
            <label for="links">Website Link</label>
            <input type="text" name="links" value="${data.links ? data.links.join(', ') : ''}" placeholder="https://example.com">
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
           <button type="submit" class="btn-primary">Save Activity</button>
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
