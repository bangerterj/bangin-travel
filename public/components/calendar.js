/**
 * Calendar Component - Redesigned with Timeline View
 * Replaces month-grid with vertical day columns for drag-to-create interactions
 * Integrates with TripService for real-time CRUD operations
 */

export function renderCalendar(container, store, openModal) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  // Get trip date range
  const tripStart = new Date(trip.startDate + 'T00:00:00');
  const tripEnd = new Date(trip.endDate + 'T00:00:00');

  // State: current week offset from trip start
  let weekOffset = 0;

  function render() {
    // Calculate the days to display (7 days based on weekOffset)
    const startOfWeek = new Date(tripStart);
    startOfWeek.setDate(tripStart.getDate() + (weekOffset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    // Collect all items and convert to timeline format
    const { flights, stays, activities, transit } = trip;

    const allItems = [
      ...flights.map(f => ({
        id: f.id,
        type: 'flight',
        title: `${f.airline || ''} ${f.flightNumber || f.title}`.trim(),
        startTime: f.startAt || f.departureTime,
        endTime: f.endAt || f.arrivalTime,
        data: f
      })),
      ...stays.map(s => ({
        id: s.id,
        type: 'stay',
        title: s.name || s.title,
        startTime: s.startAt || s.checkIn,
        endTime: s.endAt || s.checkOut,
        data: s
      })),
      ...activities.map(a => ({
        id: a.id,
        type: 'activity',
        title: a.name || a.title,
        startTime: a.startAt || a.startTime,
        endTime: a.endAt || a.endTime,
        data: a
      })),
      ...transit.map(t => ({
        id: t.id,
        type: 'transit',
        title: t.name || t.title,
        startTime: t.startAt || t.departureTime,
        endTime: t.endAt || t.arrivalTime,
        data: t
      }))
    ];

    // Format week range for header
    const weekStart = days[0];
    const weekEnd = days[6];
    const formatWeekDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekRange = `${formatWeekDate(weekStart)} - ${formatWeekDate(weekEnd)}, ${weekEnd.getFullYear()}`;

    container.innerHTML = `
      <div class="timeline-calendar">
        <!-- Header -->
        <header class="timeline-header">
          <div class="timeline-title">
            <h2>📅 Trip Timeline</h2>
            <span class="week-range">${weekRange}</span>
          </div>
          <div class="timeline-nav">
            <button id="timeline-prev" class="btn-nav">◀ Prev Week</button>
            <button id="timeline-today" class="btn-nav">Today</button>
            <button id="timeline-next" class="btn-nav">Next Week ▶</button>
          </div>
        </header>

        <!-- Instructions -->
        <div class="timeline-instructions">
          <span>📝 Drag on timeline to create • Click item to edit</span>
        </div>

        <!-- Timeline Grid -->
        <div class="timeline-wrapper">
          <div class="timeline-hours">
            <div class="hours-header-spacer"></div>
            ${Array.from({ length: 24 }, (_, i) => `
              <div class="hour-label">${i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</div>
            `).join('')}
          </div>
          <div class="timeline-grid" id="timeline-grid">
            ${days.map(day => renderDayColumn(day, allItems, trip)).join('')}
          </div>
        </div>

        <!-- Legend -->
        <div class="timeline-legend">
          <span><span class="legend-dot flight"></span> Flight</span>
          <span><span class="legend-dot stay"></span> Stay</span>
          <span><span class="legend-dot transit"></span> Transit</span>
          <span><span class="legend-dot activity"></span> Activity</span>
        </div>
      </div>

      <style>
        .timeline-calendar {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 150px);
          min-height: 600px;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--cream, #f8f4eb);
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 12px 12px 0 0;
          flex-wrap: wrap;
          gap: 12px;
        }

        .timeline-title h2 {
          margin: 0;
          font-size: 1.3rem;
        }

        .week-range {
          font-size: 0.9rem;
          color: var(--text-secondary, #5d6d7e);
          margin-left: 12px;
        }

        .timeline-nav {
          display: flex;
          gap: 8px;
        }

        .btn-nav {
          padding: 8px 16px;
          background: white;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .btn-nav:hover {
          background: var(--cream, #f8f4eb);
        }

        .timeline-instructions {
          padding: 8px 16px;
          background: white;
          border-left: 3px solid var(--border-color, #2c3e50);
          border-right: 3px solid var(--border-color, #2c3e50);
          font-size: 0.8rem;
          color: var(--text-secondary, #5d6d7e);
        }

        .timeline-wrapper {
          flex: 1;
          display: flex;
          overflow: auto;
          border: 3px solid var(--border-color, #2c3e50);
          border-top: none;
          border-radius: 0 0 12px 12px;
          background: white;
        }

        .timeline-hours {
          width: 60px;
          flex-shrink: 0;
          background: var(--cream, #f8f4eb);
          border-right: 2px solid var(--border-color, #2c3e50);
          height: 1492px; /* Force full height to match grid */
          min-height: 1492px;
        }

        .hour-label {
          height: 60px;
          padding: 2px 8px;
          font-size: 0.7rem;
          color: var(--text-secondary, #5d6d7e);
          border-top: 1px solid rgba(0,0,0,0.1);
          box-sizing: border-box;
        }

        .hours-header-spacer {
          height: 52px; /* Match day header height */
          background: var(--cream, #f8f4eb);
          border-bottom: 2px solid var(--border-color, #2c3e50);
        }

        .timeline-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          min-width: 700px;
        }

        .day-column {
          position: relative;
          border-right: 1px solid rgba(0,0,0,0.1);
          /* 15-minute Gridlines */
          background-color: var(--white);
          background-image: 
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px);
          background-size: 100% 15px, 100% 60px; /* 15m lines, Hour lines */
          background-position: 0 52px; /* Offset for header */
          background-repeat: repeat;
          height: 1492px; /* Force full height (24h * 60px + 52px) */
          min-height: 1492px;
        }

        .day-column:last-child {
          border-right: none;
        }

        .day-column.out-of-trip {
          background-color: rgba(0,0,0,0.03);
          background-image: none;
        }

        .day-header {
          position: sticky;
          top: 0;
          height: 52px; /* Fixed height for alignment */
          box-sizing: border-box;
          background: var(--cream, #f8f4eb);
          padding: 8px;
          text-align: center;
          border-bottom: 2px solid var(--border-color, #2c3e50);
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .day-header-dow {
          font-weight: 700;
          font-size: 0.8rem;
          line-height: 1.2;
        }

        .day-header-date {
          font-size: 1.1rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .day-header.today {
          background: #3498db;
          color: white;
        }

        /* Timeline Items */
        .timeline-item {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 0.75rem;
          cursor: pointer;
          border: 2px solid var(--border-color, #2c3e50);
          box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
          overflow: hidden;
          z-index: 5;
          transition: transform 0.1s, box-shadow 0.1s;
        }

        .timeline-item:hover {
          transform: translateY(-2px);
          box-shadow: 4px 4px 0 rgba(0,0,0,0.15);
          z-index: 20;
        }

        .timeline-item.flight { background: #3498db; color: white; }
        .timeline-item.stay { background: #9b59b6; color: white; }
        .timeline-item.transit { background: #1abc9c; color: white; }
        .timeline-item.activity { background: #e67e22; color: white; }

        .item-title {
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-time {
          font-size: 0.65rem;
          opacity: 0.9;
        }

        /* Legend */
        .timeline-legend {
          display: flex;
          gap: 20px;
          padding: 12px 16px;
          margin-top: 12px;
          background: white;
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .legend-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
        }

        .legend-dot.flight { background: #3498db; }
        .legend-dot.stay { background: #9b59b6; }
        .legend-dot.transit { background: #1abc9c; }
        .legend-dot.activity { background: #e67e22; }

        /* Responsive */
        @media (max-width: 768px) {
          .timeline-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .timeline-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      </style>
    `;

    // Event listeners
    document.getElementById('timeline-prev').addEventListener('click', () => {
      weekOffset--;
      render();
    });

    document.getElementById('timeline-next').addEventListener('click', () => {
      weekOffset++;
      render();
    });

    document.getElementById('timeline-today').addEventListener('click', () => {
      // Calculate offset to show current week
      const today = new Date();
      const diffDays = Math.floor((today - tripStart) / (1000 * 60 * 60 * 24));
      weekOffset = Math.floor(diffDays / 7);
      render();
    });

    // Item click handlers
    document.querySelectorAll('.timeline-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = item.dataset.id;
        const itemType = item.dataset.type;

        // Find the item data
        const itemData = allItems.find(i => i.id === itemId);
        if (itemData && openModal) {
          openModal(itemType, itemData.data, 'edit');
        }
      });
    });

    // Drag-to-create on day columns
    document.querySelectorAll('.day-column').forEach(column => {
      let isDragging = false;
      let startY = 0;
      let currentY = 0;
      let dragIndicator = null;

      const HEADER_HEIGHT = 52; // Height of sticky day header

      const getTimeFromY = (y, rect) => {
        const relY = y - rect.top - HEADER_HEIGHT;
        const hour = Math.floor(relY / 60);
        const minutes = Math.floor((relY % 60) / 15) * 15;
        return { hour: Math.max(0, Math.min(23, hour)), minutes };
      };

      column.addEventListener('mousedown', (e) => {
        if (e.target.closest('.timeline-item')) return; // Don't drag on items

        isDragging = true;
        const rect = column.getBoundingClientRect();
        startY = e.clientY;

        // Create drag indicator
        dragIndicator = document.createElement('div');
        dragIndicator.className = 'drag-indicator';
        dragIndicator.style.cssText = `
          position: absolute;
          left: 4px;
          right: 4px;
          background: rgba(52, 152, 219, 0.3);
          border: 2px dashed #3498db;
          border-radius: 6px;
          pointer-events: none;
          z-index: 15;
        `;
        column.appendChild(dragIndicator);

        const startTime = getTimeFromY(startY, rect);
        dragIndicator.style.top = `${startTime.hour * 60 + startTime.minutes + HEADER_HEIGHT}px`;
        dragIndicator.style.height = '30px';
      });

      column.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragIndicator) return;

        currentY = e.clientY;
        const rect = column.getBoundingClientRect();

        const startTime = getTimeFromY(startY, rect);
        const endTime = getTimeFromY(currentY, rect);

        const startPx = Math.min(startTime.hour * 60 + startTime.minutes, endTime.hour * 60 + endTime.minutes);
        const endPx = Math.max(startTime.hour * 60 + startTime.minutes, endTime.hour * 60 + endTime.minutes);

        dragIndicator.style.top = `${startPx + HEADER_HEIGHT}px`;
        dragIndicator.style.height = `${Math.max(30, endPx - startPx)}px`;
      });

      const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (dragIndicator) {
          dragIndicator.remove();
          dragIndicator = null;
        }

        if (Math.abs(currentY - startY) < 10) return; // Too small

        const rect = column.getBoundingClientRect();
        const startTime = getTimeFromY(startY, rect);
        const endTime = getTimeFromY(currentY, rect);

        const date = column.dataset.date;

        const formatTime = (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;

        const earlier = startTime.hour * 60 + startTime.minutes < endTime.hour * 60 + endTime.minutes ? startTime : endTime;
        const later = startTime.hour * 60 + startTime.minutes >= endTime.hour * 60 + endTime.minutes ? startTime : endTime;

        // Open modal for new item
        if (openModal) {
          openModal('activity', {
            date: date,
            startTime: formatTime(earlier),
            endTime: formatTime(later),
            isNew: true
          }, 'create');
        }
      };

      column.addEventListener('mouseup', endDrag);
      column.addEventListener('mouseleave', endDrag);
    });
  }

  render();
}

/**
 * Render a single day column with items
 */
function renderDayColumn(day, items, trip) {
  const tripStart = new Date(trip.startDate + 'T00:00:00');
  const tripEnd = new Date(trip.endDate + 'T00:00:00');

  const isInTrip = day >= tripStart && day <= tripEnd;
  const isToday = isSameDay(day, new Date());

  const dayStr = day.toISOString().split('T')[0];
  const dow = day.toLocaleDateString('en-US', { weekday: 'short' });
  const dateNum = day.getDate();

  // Filter items for this day
  const dayItems = items.filter(item => {
    if (!item.startTime) return false;
    const itemDate = new Date(item.startTime).toISOString().split('T')[0];
    return itemDate === dayStr;
  });

  // Render items
  const itemsHtml = dayItems.map(item => {
    const start = new Date(item.startTime);
    const end = item.endTime ? new Date(item.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = Math.max(30, endMinutes - startMinutes);

    const top = startMinutes + 52; // Header offset (matches HEADER_HEIGHT in drag handlers)

    const formatItemTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `
      <div class="timeline-item ${item.type}" 
           data-id="${item.id}" 
           data-type="${item.type}"
           style="top: ${top}px; height: ${duration}px;">
        <div class="item-title">${item.title}</div>
        <div class="item-time">${formatItemTime(start)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="day-column ${isInTrip ? '' : 'out-of-trip'}" data-date="${dayStr}">
      <div class="day-header ${isToday ? 'today' : ''}">
        <div class="day-header-dow">${dow}</div>
        <div class="day-header-date">${dateNum}</div>
      </div>
      ${itemsHtml}
    </div>
  `;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}
