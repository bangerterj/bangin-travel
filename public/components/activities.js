/**
 * Activities Component - Activity cards grouped by date with priority filtering
 */

export function renderActivities(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { activities } = trip;
  let filter = 'all';

  function render() {
    const filteredActivities = filter === 'all'
      ? activities
      : activities.filter(a => a.priority === filter);

    // Group by date
    const grouped = {};
    filteredActivities.forEach(a => {
      const dateKey = new Date(a.startTime).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(a);
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    const formatGroupDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
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

    const getActivityIcon = (type) => {
      const icons = {
        tour: '🎨',
        dining: '🍣',
        sightseeing: '🏯',
        entertainment: '🎭',
        shopping: '🛍️',
        relaxation: '♨️'
      };
      return icons[type] || '🎌';
    };

    const getPriorityBadge = (priority) => {
      switch (priority) {
        case 'must-do':
          return '<span class="badge badge-must-do">⭐ Must-Do</span>';
        case 'nice-to-have':
          return '<span class="badge badge-nice-to-have">✓ Nice to Have</span>';
        case 'optional':
          return '<span class="badge badge-optional">💭 Optional</span>';
        default:
          return '';
      }
    };

    const calculateDuration = (start, end) => {
      const diff = new Date(end) - new Date(start);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours === 0) return `${mins} min`;
      if (mins === 0) return `${hours} hours`;
      return `${hours}h ${mins}m`;
    };

    const activityGroups = sortedDates.map(dateKey => {
      const dayActivities = grouped[dateKey];

      // Get location for the day (from first activity or stays)
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
        const travelers = store.getTravelersByIds(activity.travelers);
        const duration = calculateDuration(activity.startTime, activity.endTime);

        return `
              <div class="entity-card activity-card">
                <div class="entity-card-body">
                  <div class="activity-card-header">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        <div class="activity-title-row">
                        <span class="activity-icon">${getActivityIcon(activity.type)}</span>
                        <h3>${activity.name}</h3>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${getPriorityBadge(activity.priority)}
                            ${callbacks ? `
                                <button class="btn-icon edit-btn" data-id="${activity.id}" title="Edit Activity">✏️</button>
                            ` : ''}
                        </div>
                    </div>
                  </div>

                  <div class="activity-time-location">
                    <div>
                      <span>🕐</span>
                      <span>${formatTime(activity.startTime)} – ${formatTime(activity.endTime)}</span>
                      <span class="text-muted">(${duration})</span>
                    </div>
                    <div>
                      <span>📍</span>
                      <span>${activity.location}</span>
                    </div>
                    ${activity.reservationRequired ? `
                      <div>
                        <span style="color: var(--warning);">📋</span>
                        <span>Reserved${activity.confirmationCode ? `: ${activity.confirmationCode}` : ''}</span>
                      </div>
                    ` : `
                      <div>
                        <span style="color: var(--success);">✓</span>
                        <span>No Reservation Needed</span>
                      </div>
                    `}
                    ${activity.cost && activity.cost.amount > 0 ? `
                      <div>
                        <span>💰</span>
                        <span>${activity.cost.currency === 'JPY' ? '¥' : '$'}${activity.cost.amount.toLocaleString()}/person</span>
                      </div>
                    ` : ''}
                  </div>

                  ${activity.notes ? `
                    <div class="activity-notes">
                      <span>📝</span>
                      <span>${activity.notes}</span>
                    </div>
                  ` : ''}

                  ${activity.links && activity.links.length > 0 ? `
                    <div style="margin-bottom: 12px;">
                      ${activity.links.map(link => `
                        <a href="${link}" target="_blank" style="font-size: 0.75rem; color: var(--primary-blue);">🔗 More Info</a>
                      `).join(' ')}
                    </div>
                  ` : ''}

                  <div style="margin-top: 12px;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
                      👥 Going:
                    </div>
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
          <span style="font-size: 1.5rem;">🎌</span>
          <h2>Activities</h2>
        </div>
        ${callbacks ? `
            <button class="btn-primary" id="add-activity-btn">➕ Add Activity</button>
        ` : ''}
      </div>

      <div class="activities-filters">
        <button class="filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">All (${activities.length})</button>
        <button class="filter-btn ${filter === 'must-do' ? 'active' : ''}" data-filter="must-do">⭐ Must-Do (${activities.filter(a => a.priority === 'must-do').length})</button>
        <button class="filter-btn ${filter === 'nice-to-have' ? 'active' : ''}" data-filter="nice-to-have">✓ Nice to Have (${activities.filter(a => a.priority === 'nice-to-have').length})</button>
        <button class="filter-btn ${filter === 'optional' ? 'active' : ''}" data-filter="optional">💭 Optional (${activities.filter(a => a.priority === 'optional').length})</button>
      </div>

      ${activityGroups.length > 0 ? activityGroups : '<p class="text-muted">No activities match the current filter.</p>'}
    `;

    // Bind filter buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      });
    });

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

  render();
}

export function renderActivityForm(activity = null) {
  const isEdit = !!activity;
  const data = activity || {
    type: 'sightseeing',
    name: '',
    location: '',
    startTime: '',
    endTime: '',
    priority: 'nice-to-have',
    reservationRequired: false,
    confirmationCode: '',
    cost: { amount: 0, currency: 'JPY' },
    notes: '',
    links: [],
    travelers: []
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  };

  return `
    <div class="form-container">
      <h2>${isEdit ? '✏️ Edit Activity' : '🎌 Add Activity'}</h2>
      <form id="activities-form">
        <div class="form-group">
          <label>Type</label>
          <select name="type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
            <option value="sightseeing" ${data.type === 'sightseeing' ? 'selected' : ''}>Sightseeing</option>
            <option value="dining" ${data.type === 'dining' ? 'selected' : ''}>Dining</option>
            <option value="shopping" ${data.type === 'shopping' ? 'selected' : ''}>Shopping</option>
            <option value="entertainment" ${data.type === 'entertainment' ? 'selected' : ''}>Entertainment</option>
            <option value="relaxation" ${data.type === 'relaxation' ? 'selected' : ''}>Relaxation / Onsen</option>
            <option value="tour" ${data.type === 'tour' ? 'selected' : ''}>Tour</option>
          </select>
        </div>

        <div class="form-group">
          <label>Priority</label>
          <div style="display: flex; gap: 16px;">
            <label><input type="radio" name="priority" value="must-do" ${data.priority === 'must-do' ? 'checked' : ''}> Must-Do</label>
            <label><input type="radio" name="priority" value="nice-to-have" ${data.priority === 'nice-to-have' ? 'checked' : ''}> Nice to Have</label>
            <label><input type="radio" name="priority" value="optional" ${data.priority === 'optional' ? 'checked' : ''}> Optional</label>
          </div>
        </div>

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

        <div class="form-row">
            <div class="form-group" style="display: flex; align-items: flex-end;">
                 <label class="checkbox-label">
                    <input type="checkbox" name="reservationRequired" value="true" ${data.reservationRequired ? 'checked' : ''}>
                    Reservation Required
                </label>
            </div>
            <div class="form-group">
                <label for="confirmationCode">Confirmation Code</label>
                <input type="text" name="confirmationCode" value="${data.confirmationCode}" placeholder="e.g. BOOK-123">
            </div>
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
            <label for="links">Links (comma separated)</label>
            <input type="text" name="links" value="${data.links ? data.links.join(', ') : ''}" placeholder="https://example.com, https://booking.com">
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
