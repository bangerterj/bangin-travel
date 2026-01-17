import { renderItemCard } from './common/ItemCard.js';

/**
 * Activities Component - Handles rendering and form for trip activities
 */

export function renderActivities(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  const { activities } = trip;

  function render() {
    // Helper to get start/end times
    const getStartTime = (a) => a.startAt || a.startTime;

    // Helper to get location (API stores in metadata.location, legacy at top level)
    const getLocation = (a) => {
      if (a.metadata?.location?.displayName) return a.metadata.location.displayName;
      if (typeof a.location === 'object' && a.location?.displayName) return a.location.displayName;
      if (typeof a.location === 'string') return a.location;
      return '';
    };

    // Filter and sort
    const sortedActivities = [...activities]
      .filter(a => getStartTime(a))
      .sort((a, b) => new Date(getStartTime(a)) - new Date(getStartTime(b)));

    // Group by date
    const grouped = {};
    if (sortedActivities.length > 0) {
      sortedActivities.forEach(a => {
        const startTime = getStartTime(a);
        const dateKey = new Date(startTime.split('T')[0] + 'T00:00:00').toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(a);
      });
    }
    const sortedDates = Object.keys(grouped);
    sortedDates.sort((a, b) => new Date(a) - new Date(b));

    const formatGroupDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const activityGroups = sortedDates.map(dateKey => {
      const dayActivities = grouped[dateKey];
      // Collect updated locations for the header summary
      const locations = [...new Set(dayActivities.map(a => {
        const loc = getLocation(a);
        if (!loc) return 'Unknown';
        const parts = loc.split(',');
        return parts[parts.length - 1].trim();
      }).filter(Boolean))];

      return `
        <div class="activity-day-group">
          <div class="activity-day-header">
            <div class="activity-day-date">${formatGroupDate(dateKey)}</div>
            <div class="activity-day-location">📍 ${locations.join(', ')}</div>
          </div>
          ${dayActivities.map(activity => renderItemCard(activity, 'activity')).join('')}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="tab-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div class="tab-title" style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5rem;">📍</span>
          <h2 style="margin: 0;">Activities</h2>
        </div>
        ${callbacks ? `<button class="btn-primary-compact" id="add-activity-btn" title="Add Activity">➕</button>` : ''}
      </div>

      ${activityGroups.length > 0 ? activityGroups : `
        <div class="empty-state" style="text-align: center; padding: 40px 0;">
          <p style="color: var(--text-secondary);">No activities added yet.</p>
        </div>
      `}
    `;

    if (callbacks) {
      container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
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

      // View Details on Card Click
      container.querySelectorAll('.unified-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-action') || e.target.closest('a')) return;
          const item = activities.find(a => a.id === card.dataset.id);
          if (item && callbacks.onView) {
            callbacks.onView('activity', item);
          }
        });
      });
    }
  }

  render(); // Initial render
}

export function renderActivityForm(activity = null) {
  const isEdit = !!activity;
  const allTravelerIds = window.store?.getActiveTrip()?.travelers.map(t => t.id) || [];

  // Helper to extract location string from various formats
  const extractLocation = (act) => {
    if (!act) return '';
    // Check metadata.location first (from API)
    if (act.metadata?.location?.displayName) return act.metadata.location.displayName;
    // Check if location is an object with displayName  
    if (typeof act.location === 'object' && act.location?.displayName) return act.location.displayName;
    // Check if location is a string
    if (typeof act.location === 'string') return act.location;
    return '';
  };

  // Helper to get start/end time from either API or legacy format
  const getStartTime = (act) => act?.startAt || act?.startTime || '';
  const getEndTime = (act) => act?.endAt || act?.endTime || '';

  const data = activity ? {
    name: activity.name || activity.title || '',
    location: extractLocation(activity),
    startTime: activity.isNew ? `${activity.date}T${activity.startTime}` : getStartTime(activity),
    endTime: activity.isNew ? `${activity.date}T${activity.endTime}` : getEndTime(activity),
    status: activity.status || 'planned',
    cost: activity.cost || activity.metadata?.cost || { amount: 0, currency: 'USD' },
    notes: activity.notes || '',
    links: activity.links || activity.metadata?.links || [],
    travelers: activity.travelers || allTravelerIds,
    paidBy: activity.paidBy || activity.cost?.paidBy || activity.metadata?.cost?.paidBy || ''
  } : {
    name: '',
    location: '',
    startTime: '',
    endTime: '',
    status: 'planned',
    cost: { amount: 0, currency: 'USD' },
    notes: '',
    links: [],
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

        <div class="form-group">
            <label>Date Range (Start ➝ End)</label>
            <input type="text" id="activity-range-picker" class="form-input" placeholder="Select dates..." required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Start Time</label>
                <input type="text" id="activity-start-time-picker" class="form-input" value="${data.startTime ? new Date(data.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:00'}" required>
            </div>
            <div class="form-group">
                <label>End Time</label>
                <input type="text" id="activity-end-time-picker" class="form-input" value="${data.endTime ? new Date(data.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '12:00'}" required>
            </div>
        </div>

        <input type="hidden" name="startTime" id="startTime" value="${data.startTime || ''}">
        <input type="hidden" name="endTime" id="endTime" value="${data.endTime || ''}">

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
