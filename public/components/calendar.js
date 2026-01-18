/**
 * Calendar Component - High Quality Timeline View
 * Replicates the robust logic and styling from the React Sandbox (timeline.js)
 */

export function renderCalendar(container, store, callbacks) {
  const trip = store.getActiveTrip();
  if (!trip) return;

  // Constants (Matched to Sandbox)
  const SLOT_HEIGHT = 15;
  const HOUR_HEIGHT = 60;
  const HEADER_HEIGHT = 52;
  const START_HOUR = 0;
  const END_HOUR = 24;
  const GRID_OFFSET = 16; // Top spacing

  // State (Closure-based)
  if (window._calendarState === undefined) {
    window._calendarState = {
      weekOffset: 0,
      viewMode: 'week', // 'week' | 'day'
      selectedDay: null // Date object for day view
    };
  }
  let state = window._calendarState;

  // Selection / Drag State
  let activeSelection = null;
  let isDragging = false;
  let isResizing = null;
  let dragStartY = 0;
  let activeColumn = null;

  // Helper: Format Date
  const formatDate = (date) => date.toISOString().split('T')[0];

  const formatTimeStr = (t) => {
    return `${String(t.hour).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;
  };

  // Helper: Get time from Y position (relative to slots)
  const getTimeFromY = (y) => {
    const relativeY = Math.max(0, y - GRID_OFFSET);
    const totalMinutes = Math.round(relativeY / SLOT_HEIGHT) * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours >= 24) return { hour: 23, minutes: 59 };

    return {
      hour: Math.min(Math.max(hours, 0), 23),
      minutes: Math.min(Math.max(minutes, 0), 59)
    };
  };

  // Main Render Function
  function render() {
    const tripStart = new Date(trip.startDate + 'T00:00:00');

    // Calculate visible days
    let days = [];
    if (state.viewMode === 'week') {
      const startOfWeek = new Date(tripStart);
      startOfWeek.setDate(tripStart.getDate() + (state.weekOffset * 7));
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
      }
    } else {
      days = [state.selectedDay || tripStart];
    }

    const weekRange = state.viewMode === 'week'
      ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${days[6].getFullYear()}`
      : `${days[0].toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

    // Prepare Items
    const items = [
      ...trip.flights.map(f => ({ ...f, type: 'flight', startTime: f.startAt || f.departureTime, endTime: f.endAt || f.arrivalTime, title: f.title || `${f.airline} ${f.flightNumber}` })),
      ...trip.stays.map(s => ({ ...s, type: 'stay', startTime: s.startAt || s.checkIn, endTime: s.endAt || s.checkOut, title: s.title || s.name })),
      ...trip.activities.map(a => ({ ...a, type: 'activity', startTime: a.startAt, endTime: a.endAt, title: a.title || a.name })),
      ...trip.transit.map(t => ({ ...t, type: 'transit', startTime: t.startAt || t.departureTime, endTime: t.endAt || t.arrivalTime, title: t.title || t.name }))
    ];

    container.innerHTML = `
      <div class="timeline-calendar ${state.viewMode}-view" style="position: relative;">
        <header class="timeline-header" style="height: 52px; padding: 0 12px; border-bottom: 2px solid var(--border-color); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; background: var(--cream);">
          <div class="timeline-nav">
             <button id="timeline-prev" class="btn-nav" title="Previous ${state.viewMode}">◀</button>
             <button id="timeline-today" class="btn-nav">Today</button>
             <button id="timeline-next" class="btn-nav" title="Next ${state.viewMode}">▶</button>
             ${state.viewMode === 'day' ? `<button id="timeline-back" class="btn-nav">Week View</button>` : ''}
          </div>

          <div class="calendar-legend" style="display: flex; gap: 16px; font-size: 0.75rem; font-weight: 600;">
              <div style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--flight-color);"></span> Flight</div>
              <div style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--stay-color);"></span> Stay</div>
              <div style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--activity-color);"></span> Activity</div>
              <div style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--transit-color);"></span> Transit</div>
          </div>

          <span class="week-range" style="font-weight: 700; color: var(--border-color);">${weekRange}</span>
        </header>

        <div class="timeline-wrapper">
          <div class="hour-sidebar" style="width: 60px; flex-shrink: 0;">
             <div class="hours-header-spacer" style="height: 52px; border-bottom: 2px solid var(--border-color); box-sizing: border-box; background: var(--cream);"></div>
             <div class="hour-labels-container" style="position: relative; height: ${24 * HOUR_HEIGHT + GRID_OFFSET}px;">
                 ${Array.from({ length: 25 }, (_, i) => {
      const label = i === 0 ? '12A' : i < 12 ? i + 'A' : i === 12 ? '12P' : i === 24 ? '12A' : (i - 12) + 'P';
      const top = i * HOUR_HEIGHT + GRID_OFFSET;
      return `<div class="hour-label" style="position: absolute; top: ${top}px; right: 8px; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); line-height: 1;">${label}</div>`;
    }).join('')}
             </div>
          </div>

          <div class="timeline-container" id="timeline-scroll-area" style="overscroll-behavior-y: contain;">
             <div class="timeline-grid" id="timeline-grid" style="grid-template-columns: repeat(${days.length}, 1fr);">
                ${days.map(day => renderDayColumn(day, items)).join('')}
             </div>
          </div>
        </div>
        
        <button id="calendar-fab" class="calendar-fab hidden" style="position: absolute; bottom: calc(16px + env(safe-area-inset-bottom)); right: 16px; width: 48px; height: 48px; border-radius: 50%; background: var(--accent-orange); color: white; border: 3px solid var(--border-color); box-shadow: 3px 3px 0 var(--border-color); font-size: 1.25rem; font-weight: bold; cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center;">+</button>
      </div>
    `;

    bindEvents(days, items);

    // Sync Scroll: Sidebar moves with Grid vertically
    const scrollArea = container.querySelector('#timeline-scroll-area');
    const sidebar = container.querySelector('.hour-sidebar');
    scrollArea.onscroll = () => {
      sidebar.scrollTop = scrollArea.scrollTop;
    };
  }

  function renderDayColumn(day, items) {
    const dateStr = formatDate(day);
    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = day.getDate();
    const isToday = formatDate(new Date()) === dateStr;

    // Filter items
    const dayItems = items.filter(item => item.startTime && item.startTime.startsWith(dateStr));

    const itemsHtml = dayItems.map(item => {
      const start = new Date(item.startTime);
      const end = item.endTime ? new Date(item.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

      const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT + GRID_OFFSET;
      const bottom = (end.getHours() + end.getMinutes() / 60) * HOUR_HEIGHT + GRID_OFFSET;
      const height = Math.max(30, bottom - top);

      return `
          <div class="timeline-item ${item.type}" 
               data-id="${item.id}" 
               data-type="${item.type}"
               style="top: ${top}px; height: ${height}px; z-index: 10; cursor: pointer;">
             <div class="item-title">${item.title}</div>
             <div class="item-time">${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        `;
    }).join('');

    // Visual grid lines (High Precision)
    const gridLines = [];
    // Always start with a line at the very top (Hour 0)
    gridLines.push(`<div class="slot-line hour-line top-most" style="position: absolute; top: ${GRID_OFFSET}px; left: 0; right: 0; border-top: 2px solid rgba(0,0,0,0.15); height: 0; z-index: 1;"></div>`);

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 0 && m === 0) continue; // Already added as top-most
        const top = (h + m / 60) * HOUR_HEIGHT + GRID_OFFSET;
        gridLines.push(`<div class="slot-line ${m === 0 ? 'hour-line' : 'quarter-line'}" style="position: absolute; top: ${top}px; left: 0; right: 0; border-top: 1px solid ${m === 0 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.03)'}; height: ${SLOT_HEIGHT}px; z-index: 1; pointer-events: none;"></div>`);
      }
    }

    return `
      <div class="day-column" data-date="${dateStr}">
         <div class="day-header ${isToday ? 'today' : ''}" style="height: 52px; border-bottom: 2px solid var(--border-color); box-sizing: border-box; position: sticky; top: 0; z-index: 20;">
            <div class="day-header-dow">${dayName}</div>
            <div class="day-header-date">${dayNum}</div>
         </div>
         <div class="day-slots" style="height: ${24 * HOUR_HEIGHT + GRID_OFFSET}px;">
            ${gridLines.join('')}
            ${itemsHtml}
         </div>
      </div>
    `;
  }

  function bindEvents(days, items) {
    // Nav
    document.getElementById('timeline-prev').onclick = () => {
      if (state.viewMode === 'week') state.weekOffset--;
      else state.selectedDay.setDate(state.selectedDay.getDate() - 1);
      render();
    };
    document.getElementById('timeline-next').onclick = () => {
      if (state.viewMode === 'week') state.weekOffset++;
      else state.selectedDay.setDate(state.selectedDay.getDate() + 1);
      render();
    };
    document.getElementById('timeline-today').onclick = () => {
      if (state.viewMode === 'week') {
        state.weekOffset = 0;
      } else {
        state.selectedDay = new Date();
      }
      render();
    };
    const backBtn = document.getElementById('timeline-back');
    if (backBtn) backBtn.onclick = () => {
      state.viewMode = 'week';
      render();
    };


    // Day Header Click -> Switch to Day View
    container.querySelectorAll('.day-header').forEach(header => {
      header.onclick = () => {
        if (state.viewMode === 'week') {
          const dateStr = header.closest('.day-column').dataset.date;
          state.selectedDay = new Date(dateStr + 'T00:00:00');
          state.viewMode = 'day';
          render();
        }
      };
    });

    // Item Clicks
    container.querySelectorAll('.timeline-item').forEach(el => {
      // Prevent grid from starting selection when clicking an item
      el.onpointerdown = (e) => e.stopPropagation();

      el.onclick = (e) => {
        e.stopPropagation();
        const itemId = el.dataset.id;
        // Search in items with loose ID matching
        const item = items.find(i => String(i.id) === String(itemId));
        if (item && callbacks.onView) {
          const viewType = item.type || el.dataset.type;
          callbacks.onView(viewType, item);
        }
      };
    });

    // Swipe Support (Improved Sensitivity)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      const duration = Date.now() - touchStartTime;

      // Swipe Horizontal (Must be significant and more horizontal than vertical)
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) && duration < 500) {
        if (diffX > 0) document.getElementById('timeline-prev').click();
        else document.getElementById('timeline-next').click();
      }
    };

    const scrollArea = document.getElementById('timeline-scroll-area');
    const grid = document.getElementById('timeline-grid');

    // Attach swipe to scroll area for better detection
    scrollArea.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollArea.addEventListener('touchend', onTouchEnd, { passive: true });

    let touchStartedPos = null;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;

      // Resize Handle (Always takes priority)
      if (e.target.classList.contains('resize-handle')) {
        e.preventDefault(); e.stopPropagation();
        isResizing = e.target.classList.contains('top') ? 'top' : 'bottom';
        activeColumn = e.target.closest('.day-column');
        return;
      }

      // FAB or other actions
      if (e.target.closest('#calendar-fab') || e.target.closest('.timeline-item')) {
        // Clear selection if clicking an item too? User didn't specify, but often expected.
        // For now just return to let item handler work.
        return;
      }

      if (activeSelection) {
        const rect = activeSelection.element.getBoundingClientRect();
        const isInside = (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom);
        if (!isInside) {
          clearSelection();
          // DO NOT start a new selection on this click
          return;
        }
      }

      const column = e.target.closest('.day-column');
      if (!column) return;
      const slots = column.querySelector('.day-slots');
      if (!slots.contains(e.target)) return;

      if (e.pointerType === 'touch') {
        touchStartedPos = { x: e.clientX, y: e.clientY };
        return; // Don't preventDefault, let scroll happen
      }

      startSelection(e, column, slots);
    };

    const startSelection = (e, column, slots) => {
      isDragging = true;
      activeColumn = column;
      const rect = slots.getBoundingClientRect();
      const rawY = e.clientY - rect.top;

      const hour = Math.floor(Math.max(0, rawY - GRID_OFFSET) / HOUR_HEIGHT);
      const snappedTop = hour * HOUR_HEIGHT + GRID_OFFSET;
      const snappedBottom = (hour + 1) * HOUR_HEIGHT + GRID_OFFSET;

      dragStartY = snappedTop;
      createSelectionBox(snappedTop, snappedBottom, column);
    };

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch' && touchStartedPos && !isResizing && !isDragging) {
        const dx = Math.abs(e.clientX - touchStartedPos.x);
        const dy = Math.abs(e.clientY - touchStartedPos.y);
        if (dx > 10 || dy > 10) touchStartedPos = null;
      }

      if (!activeColumn || (!isDragging && !isResizing)) return;
      if (e.pointerType === 'touch' && !isResizing && !isDragging) return;

      const slots = activeColumn.querySelector('.day-slots');
      const rect = slots.getBoundingClientRect();
      const y = e.clientY - rect.top;

      if (isResizing) {
        e.preventDefault();
        const snappedY = Math.round((y - GRID_OFFSET) / SLOT_HEIGHT) * SLOT_HEIGHT + GRID_OFFSET;
        if (isResizing === 'top') {
          updateSelectionBox(Math.min(snappedY, activeSelection.endY - SLOT_HEIGHT), activeSelection.endY);
        } else {
          updateSelectionBox(activeSelection.startY, Math.max(snappedY, activeSelection.startY + SLOT_HEIGHT));
        }
      } else if (isDragging) {
        e.preventDefault();
        // Snapping refinement: 15-minute segments (SLOT_HEIGHT)
        const currentSnapY = Math.round((y - GRID_OFFSET) / SLOT_HEIGHT) * SLOT_HEIGHT + GRID_OFFSET;

        // Expand from initial hour
        const newStart = Math.min(dragStartY, currentSnapY);
        const newEnd = Math.max(dragStartY + HOUR_HEIGHT, currentSnapY);
        updateSelectionBox(newStart, newEnd);
      }
    };

    const onPointerUp = (e) => {
      if (e.pointerType === 'touch' && touchStartedPos) {
        const column = e.target.closest('.day-column');
        const slots = column?.querySelector('.day-slots');
        if (column && slots && slots.contains(e.target)) {
          startSelection(e, column, slots);
        }
        touchStartedPos = null;
      }
      isDragging = false;
      isResizing = null;
    };

    grid.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    // FAB click handler
    const fabBtn = document.getElementById('calendar-fab');
    if (fabBtn) {
      fabBtn.onclick = () => {
        if (!activeSelection) return;
        const start = getTimeFromY(activeSelection.startY);
        const end = getTimeFromY(activeSelection.endY);
        const dateData = {
          date: activeSelection.colDate,
          startTime: formatTimeStr(start),
          endTime: formatTimeStr(end),
          isNew: true
        };
        if (callbacks.onAddFromCalendar) {
          callbacks.onAddFromCalendar(dateData);
        }
        clearSelection();
      };
    }
  }

  function createSelectionBox(startY, endY, column) {
    if (activeSelection?.element) activeSelection.element.remove();
    const box = document.createElement('div');
    box.className = 'selection-box';
    box.innerHTML = `
        <div class="resize-handle top"></div>
        <div class="resize-handle bottom"></div>
        <div class="selection-time-label" style="position:absolute; top:-22px; left:0; font-size:11px; background:var(--primary-blue); color:white; padding:2px 6px; border-radius:4px; white-space:nowrap; z-index:30;"></div>
      `;
    column.querySelector('.day-slots').appendChild(box);
    activeSelection = { startY, endY, colDate: column.dataset.date, element: box };
    updateVisuals();
    showFab();
  }

  function updateSelectionBox(startY, endY) {
    if (!activeSelection) return;
    activeSelection.startY = startY;
    activeSelection.endY = endY;
    updateVisuals();
  }

  function updateVisuals() {
    if (!activeSelection?.element) return;
    const { startY, endY, element } = activeSelection;
    element.style.top = `${startY}px`;
    element.style.height = `${endY - startY}px`;
    const start = getTimeFromY(startY);
    const end = getTimeFromY(endY);
    element.querySelector('.selection-time-label').textContent = `${formatTimeStr(start)} - ${formatTimeStr(end)}`;
  }

  function showFab() {
    const fab = document.getElementById('calendar-fab');
    if (fab) fab.classList.remove('hidden');
  }

  function hideFab() {
    const fab = document.getElementById('calendar-fab');
    if (fab) fab.classList.add('hidden');
  }

  function clearSelection() {
    if (activeSelection?.element) activeSelection.element.remove();
    activeSelection = null;
    hideFab();
  }

  render();
}
