/**
 * Calendar Component - Month view with day drill-down
 */

export function renderCalendar(container, store, openModal) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  let currentDate = new Date(trip.startDate);
  currentDate.setDate(1); // Start of the month

  function render() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Generate calendar days
    let days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        date: new Date(year, month - 1, prevMonthLastDay - i),
        outsideMonth: true
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const events = store.getEventsForDate(date);
      days.push({
        day: i,
        date: date,
        outsideMonth: false,
        inTrip: store.isDateInTrip(date),
        isToday: isSameDay(date, new Date()),
        events: events
      });
    }

    // Next month padding (fill to 42 cells for 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        outsideMonth: true
      });
    }

    container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <h2 class="calendar-title">📅 ${monthName}</h2>
          <div class="calendar-nav">
            <button id="cal-prev">◀ Prev</button>
            <button id="cal-today">Today</button>
            <button id="cal-next">Next ▶</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          <div class="calendar-weekday">Sun</div>
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
        </div>
        <div class="calendar-grid" id="calendar-days">
          ${days.map(d => renderDayCell(d)).join('')}
        </div>
      </div>

      <!-- Legend -->
      <div style="display: flex; gap: 16px; margin-top: 16px; padding: 12px 16px; background: white; border: 3px solid #2c3e50; border-radius: 12px; font-size: 0.75rem;">
        <span><span class="day-event-dot flight" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px;"></span> Flight</span>
        <span><span class="day-event-dot stay" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px;"></span> Stay</span>
        <span><span class="day-event-dot transit" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px;"></span> Transit</span>
        <span><span class="day-event-dot activity" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px;"></span> Activity</span>
      </div>
    `;

    // Bind events
    document.getElementById('cal-prev').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });

    document.getElementById('cal-today').addEventListener('click', () => {
      currentDate = new Date();
      currentDate.setDate(1);
      render();
    });

    // Day click handlers
    document.querySelectorAll('.calendar-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = new Date(cell.dataset.date);
        const events = store.getEventsForDate(date);
        if (events.length > 0 || store.isDateInTrip(date)) {
          openModal(renderDayDetail(date, events, store));
        }
      });
    });
  }

  render();
}

function renderDayCell(day) {
  const classes = ['calendar-day'];
  if (day.outsideMonth) classes.push('outside-month');
  if (day.inTrip) classes.push('in-trip');
  if (day.isToday) classes.push('today');

  const eventDots = (day.events || []).slice(0, 4).map(e => {
    let type = e.type;
    if (type.includes('stay')) type = 'stay';
    return `<span class="day-event-dot ${type}"></span>`;
  }).join('');

  return `
    <div class="${classes.join(' ')}" data-date="${day.date.toISOString()}">
      <div class="day-number">${day.day}</div>
      <div class="day-events">${eventDots}</div>
    </div>
  `;
}

function renderDayDetail(date, events, store) {
  const formatDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const tripStart = new Date(store.getActiveTrip().startDate);
  const dayNum = Math.ceil((date - tripStart) / (1000 * 60 * 60 * 24)) + 1;

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const eventsHtml = events.map(e => {
    let icon, title, subtitle, time, type;

    switch (e.type) {
      case 'flight':
        icon = '✈️';
        title = `${e.data.airline} ${e.data.flightNumber}`;
        subtitle = `${e.data.departureAirport} → ${e.data.arrivalAirport}`;
        time = formatTime(e.data.departureTime);
        type = 'flight';
        break;
      case 'stay-checkin':
        icon = '🏨';
        title = `Check In: ${e.data.name}`;
        subtitle = e.data.address;
        time = formatTime(e.data.checkIn);
        type = 'stay';
        break;
      case 'stay-checkout':
        icon = '🏨';
        title = `Check Out: ${e.data.name}`;
        subtitle = e.data.address;
        time = formatTime(e.data.checkOut);
        type = 'stay';
        break;
      case 'transit':
        icon = getTransitIcon(e.data.type);
        title = e.data.name;
        subtitle = e.data.route;
        time = formatTime(e.data.departureTime);
        type = 'transit';
        break;
      case 'activity':
        icon = getActivityIcon(e.data.type);
        title = e.data.name;
        subtitle = e.data.location;
        time = formatTime(e.data.startTime);
        type = 'activity';
        break;
      default:
        icon = '📌';
        title = 'Event';
        subtitle = '';
        time = '';
        type = '';
    }

    const travelers = e.data.travelers ? store.getTravelersByIds(e.data.travelers) : [];
    const travelersHtml = travelers.length > 0 ? `
      <div class="avatar-group" style="margin-top: 8px;">
        ${travelers.slice(0, 4).map(t => `
          <div class="avatar avatar-sm" style="background-color: ${t.color}" title="${t.name}">${t.initials}</div>
        `).join('')}
        ${travelers.length > 4 ? `<span style="font-size: 0.75rem; margin-left: 4px;">+${travelers.length - 4}</span>` : ''}
      </div>
    ` : '';

    return `
      <div class="timeline-item ${type}">
        <div class="timeline-time">${time}</div>
        <div class="timeline-content ${type}">
          <div class="timeline-title">${icon} ${title}</div>
          <div class="timeline-subtitle">${subtitle}</div>
          ${travelersHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="day-detail-header">
      <div class="day-detail-date">${formatDate}</div>
      <div class="day-detail-meta">Day ${dayNum} of ${store.getTripDuration()}</div>
    </div>
    <div class="timeline">
      ${eventsHtml.length > 0 ? eventsHtml : '<p class="text-muted">No events scheduled for this day.</p>'}
    </div>
  `;
}

function getTransitIcon(type) {
  const icons = {
    train: '🚄',
    bus: '🚌',
    taxi: '🚕',
    subway: '🚇',
    ferry: '🚢',
    rental_car: '🚗'
  };
  return icons[type] || '🚏';
}

function getActivityIcon(type) {
  const icons = {
    tour: '🎨',
    dining: '🍣',
    sightseeing: '🏯',
    entertainment: '🎭',
    shopping: '🛍️',
    relaxation: '♨️'
  };
  return icons[type] || '🎌';
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}
