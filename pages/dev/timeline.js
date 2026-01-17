/**
 * Timeline Sandbox - Prototype for drag-to-create calendar interaction
 * Access at: /dev/timeline
 * 
 * v2 Changes:
 * - Hour labels in left sidebar (not inside each column)
 * - 15-minute grid with visual lines
 * - Timezone display in header
 * - Full-width items with stacking only when overlapping
 * - Fixed header overlap
 * - Removed flexible timing option
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';

// Mock data for testing
const MOCK_ITEMS = [
  {
    id: 'flight-1',
    type: 'flight',
    title: 'LAX → JFK',
    startTime: '2026-01-20T08:00:00',
    endTime: '2026-01-20T16:30:00',
  },
  {
    id: 'stay-1',
    type: 'stay',
    title: 'Hotel Check-in',
    startTime: '2026-01-20T17:00:00',
    endTime: '2026-01-20T18:00:00',
  },
  {
    id: 'activity-1',
    type: 'activity',
    title: 'Broadway Show',
    startTime: '2026-01-21T19:00:00',
    endTime: '2026-01-21T22:00:00',
  },
  {
    id: 'transit-1',
    type: 'transit',
    title: 'Uber to Theater',
    startTime: '2026-01-21T18:00:00',
    endTime: '2026-01-21T18:45:00',
  },
  {
    id: 'activity-2',
    type: 'activity',
    title: 'Central Park Walk',
    startTime: '2026-01-22T10:00:00',
    endTime: '2026-01-22T12:00:00',
  },
];

// Time constants
const SLOT_HEIGHT = 15; // pixels per 15-minute slot
const HOUR_HEIGHT = SLOT_HEIGHT * 4; // 60px per hour
const SNAP_MINUTES = 15;
const START_HOUR = 0;  // Start at midnight
const END_HOUR = 24;   // End at midnight next day
const COLUMN_WIDTH = 200; // Width of each day column
const GRID_OFFSET = 16;   // Top spacing to prevent overlap

// Default timezone (will be configurable later)
const DEFAULT_TIMEZONE = 'America/New_York';

// Item type colors
const TYPE_COLORS = {
  flight: { bg: '#3498db', border: '#2980b9', text: '#fff' },
  stay: { bg: '#9b59b6', border: '#8e44ad', text: '#fff' },
  transit: { bg: '#1abc9c', border: '#16a085', text: '#fff' },
  activity: { bg: '#e67e22', border: '#d35400', text: '#fff' },
};

// Helper: Parse time string
function parseTime(timeStr) {
  const date = new Date(timeStr);
  return {
    date,
    hours: date.getHours(),
    minutes: date.getMinutes(),
    dayStart: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
  };
}

// Helper: Format time for display (just hour for labels)
function formatHour(hours) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours} ${period}`;
}

// Helper: Format time with minutes
function formatTime(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Helper: Snap to 15-min grid
function snapToGrid(minutes, snapTo = SNAP_MINUTES) {
  return Math.round(minutes / snapTo) * snapTo;
}

// Helper: Get Y position from time
function getYFromTime(hours, minutes) {
  const totalMinutes = (hours - START_HOUR) * 60 + minutes;
  return (totalMinutes / 60) * HOUR_HEIGHT + GRID_OFFSET;
}

// Helper: Get time from Y position
function getTimeFromY(y) {
  // Adjust for grid offset
  const relativeY = Math.max(0, y - GRID_OFFSET);

  const totalSlots = relativeY / SLOT_HEIGHT;
  const snappedSlots = Math.round(totalSlots);
  const totalMinutes = snappedSlots * 15;
  const hours = START_HOUR + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours: Math.min(Math.max(hours, START_HOUR), END_HOUR),
    minutes: Math.min(minutes, 45)
  };
}

// Helper: Get days between dates
function getDaysBetween(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Helper: Check if two items overlap in time
function itemsOverlap(item1, item2) {
  const start1 = new Date(item1.startTime).getTime();
  const end1 = new Date(item1.endTime).getTime();
  const start2 = new Date(item2.startTime).getTime();
  const end2 = new Date(item2.endTime).getTime();
  return start1 < end2 && start2 < end1;
}

// Helper: Get items for a specific day with overlap info
function getItemsForDay(items, dayStart) {
  const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;

  const dayItems = items.filter(item => {
    const itemStart = new Date(item.startTime).getTime();
    const itemEnd = new Date(item.endTime).getTime();
    return itemStart < dayEnd && itemEnd > dayStart.getTime();
  });

  // Calculate overlap groups
  const itemsWithPosition = dayItems.map((item, idx) => {
    const overlappingItems = dayItems.filter((other, otherIdx) =>
      otherIdx !== idx && itemsOverlap(item, other)
    );
    return {
      ...item,
      hasOverlap: overlappingItems.length > 0,
      overlapCount: overlappingItems.length + 1,
      overlapIndex: 0, // Will be calculated below
    };
  });

  // Assign overlap indices for stacking
  itemsWithPosition.forEach((item, idx) => {
    if (item.hasOverlap) {
      const overlappingBefore = itemsWithPosition.slice(0, idx).filter(other =>
        itemsOverlap(item, other)
      );
      item.overlapIndex = overlappingBefore.length;
    }
  });

  return itemsWithPosition;
}

// ============================================
// Timeline Item Component
// ============================================
function TimelineItem({ item, dayStart }) {
  const startParsed = parseTime(item.startTime);
  const endParsed = parseTime(item.endTime);

  const thisDayStart = dayStart.getTime();
  const thisDayEnd = thisDayStart + 24 * 60 * 60 * 1000;

  if (endParsed.date.getTime() < thisDayStart || startParsed.date.getTime() >= thisDayEnd) {
    return null;
  }

  let displayStartHours = START_HOUR;
  let displayStartMinutes = 0;
  let displayEndHours = END_HOUR;
  let displayEndMinutes = 0;

  if (startParsed.date.getTime() >= thisDayStart) {
    displayStartHours = startParsed.hours;
    displayStartMinutes = startParsed.minutes;
  }

  if (endParsed.date.getTime() < thisDayEnd) {
    displayEndHours = endParsed.hours;
    displayEndMinutes = endParsed.minutes;
  }

  const top = getYFromTime(displayStartHours, displayStartMinutes);
  const bottom = getYFromTime(displayEndHours, displayEndMinutes);
  const height = Math.max(bottom - top, SLOT_HEIGHT);

  const colors = TYPE_COLORS[item.type] || TYPE_COLORS.activity;

  // Calculate width based on overlaps (leaving room for "sliver" to add overlapping items)
  const MAX_WIDTH_PERCENT = 85;

  const width = item.hasOverlap
    ? `calc(${MAX_WIDTH_PERCENT / item.overlapCount}% - 4px)`
    : `${MAX_WIDTH_PERCENT}%`;
  const left = item.hasOverlap
    ? `calc(${(item.overlapIndex / item.overlapCount) * MAX_WIDTH_PERCENT}% + 4px)`
    : '4px';

  return (
    <div
      className="timeline-item"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width,
        left,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        zIndex: 10,
      }}
      title={`${item.title}\n${formatTime(displayStartHours, displayStartMinutes)} - ${formatTime(displayEndHours, displayEndMinutes)}`}
      onClick={(e) => {
        e.stopPropagation();
        item.onEdit && item.onEdit(item);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="timeline-item-content">
        <span className="timeline-item-title">{item.title}</span>
        <span className="timeline-item-time">
          {formatTime(displayStartHours, displayStartMinutes)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Draft Item Component (shown while dragging)
// ============================================
function DraftItem({ startY, endY }) {
  const top = Math.min(startY, endY);
  const height = Math.max(Math.abs(endY - startY), SLOT_HEIGHT);

  return (
    <div
      className="timeline-draft"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        background: 'rgba(52, 152, 219, 0.1)',
        border: '2px solid #3498db',
        borderRadius: '6px',
        zIndex: 15,
      }}
    />
  );
}

// ============================================
// Add/Edit Item Modal Component
// ============================================
function AddItemModal({ isOpen, onClose, onSave, onDelete, initialTime, editingItem, timezone }) {
  const [itemType, setItemType] = useState('activity');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialTime?.date || '');
  const [startTime, setStartTime] = useState(initialTime?.start || '09:00');
  const [endDate, setEndDate] = useState(initialTime?.date || '');
  const [endTime, setEndTime] = useState(initialTime?.end || '10:00');

  useEffect(() => {
    if (editingItem) {
      setItemType(editingItem.type);
      setTitle(editingItem.title);

      const start = parseTime(editingItem.startTime);
      const end = parseTime(editingItem.endTime);

      // Format YYYY-MM-DD for date inputs
      // Format YYYY-MM-DD for date inputs using LOCAL time, not UTC (toISOString caused day jump)
      const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const formatTimeInput = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      setStartDate(formatDate(start.date));
      setStartTime(formatTimeInput(start.date));
      setEndDate(formatDate(end.date));
      setEndTime(formatTimeInput(end.date));
    } else if (initialTime) {
      setStartDate(initialTime.date);
      setEndDate(initialTime.date);
      setStartTime(initialTime.start);
      setEndTime(initialTime.end);
      setTitle('');
      setItemType('activity');
    }
  }, [initialTime, editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: editingItem?.id, // Pass ID if editing
      type: itemType,
      title: title || `New ${itemType}`,
      startDate,
      startTime,
      endDate,
      endTime,
    });
    onClose();
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingItem ? 'Edit Item' : 'Add to Trip'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type selector chips */}
          <div className="type-selector">
            {Object.keys(TYPE_COLORS).map((type) => (
              <button
                key={type}
                type="button"
                className={`type-chip ${itemType === type ? 'active' : ''}`}
                style={{ '--chip-color': TYPE_COLORS[type].bg }}
                onClick={() => setItemType(type)}
              >
                {type === 'flight' && '✈️'}
                {type === 'stay' && '🏨'}
                {type === 'transit' && '🚗'}
                {type === 'activity' && '🎯'}
                {' '}{type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Start Date/Time */}
          <div className="datetime-row">
            <div className="datetime-field">
              <label>Start</label>
              <div className="datetime-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* End Date/Time */}
          <div className="datetime-row">
            <div className="datetime-field">
              <label>End</label>
              <div className="datetime-inputs">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="timezone-hint">🌍 {timezone}</div>

          {/* Title input */}
          <div className="form-field">
            <label>Title</label>
            <input
              type="text"
              placeholder={`What's the ${itemType}?`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            {editingItem && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => {
                  onDelete(editingItem.id);
                  onClose();
                }}
                style={{ marginRight: 'auto', backgroundColor: '#e74c3c', color: 'white', border: 'none' }}
              >
                Delete
              </button>
            )}
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              {editingItem ? 'Save Changes' : 'Add to Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Day Column Component (no hour labels - those are in sidebar)
// Phase 4: Tap-Select-Refine Creation
// ============================================
function DayColumn({ date, items, onDragCreate, onEditItem, onDaySelect, isFullWidth, activeSelection, onSelectionChange }) {
  const columnRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  // Phase 4: Selection state controlled by parent
  const [isResizing, setIsResizing] = useState(null); // 'top' | 'bottom' | null
  const resizeStartY = useRef(null);

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayItems = useMemo(() => getItemsForDay(items, dayStart), [items, dayStart]);

  // Handle tap to create selection (Phase 4)
  const handleTap = (e) => {
    // Fix: Use currentTarget (day-slots) for correct relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Create a default 1-hour selection starting at tapped position
    const snappedY = Math.floor(y / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4);

    if (onSelectionChange) {
      onSelectionChange({
        startY: snappedY,
        endY: snappedY + HOUR_HEIGHT
      }, false); // isResize = false
    }
  };

  // Ref to prevent double-firing taps on mouse (PointerUp + Click)
  const ignoreNextClick = useRef(false);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;

    // Fix: Use currentTarget (day-slots) rect
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Check if clicking a resize handle (Robust check via DOM target)
    if (e.target.classList.contains('resize-handle')) {
      const isTop = e.target.classList.contains('top');
      setIsResizing(isTop ? 'top' : 'bottom');
      resizeStartY.current = y;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // If active selection exists:
    if (activeSelection) {
      // Phase 4.1: If Touch, allow native scroll (return early).
      if (e.pointerType === 'touch') {
        return;
      }

      // Mouse Logic: Clear if clicking outside
      const min = Math.min(activeSelection.startY, activeSelection.endY);
      const max = Math.max(activeSelection.startY, activeSelection.endY);
      if (y < min || y > max) {
        if (onSelectionChange) onSelectionChange(null);
      }

      // Consume mouse event
      e.preventDefault();
      return;
    }

    // Phase 4.1: Touch Handling for Creation
    // If touch, DO NOT capture pointer for drag-create. Allow native scroll.
    if (e.pointerType === 'touch') {
      return;
    }

    // Otherwise (Mouse), start drag-to-create
    setIsDragging(true);
    setDragStart(y);
    setDragEnd(y);

    if (e.pointerId) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    // Fix: Use currentTarget (day-slots) rect
    const rect = e.currentTarget.getBoundingClientRect();
    const maxY = (END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET;
    const y = Math.max(0, Math.min(e.clientY - rect.top, maxY));

    // Handle resize
    if (isResizing && activeSelection && onSelectionChange) {
      const snappedY = Math.round(y / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4);
      if (isResizing === 'top') {
        onSelectionChange({
          ...activeSelection,
          startY: Math.min(snappedY, activeSelection.endY - HOUR_HEIGHT / 4)
        }, true); // isResize = true
      } else if (isResizing === 'bottom') {
        onSelectionChange({
          ...activeSelection,
          endY: Math.max(snappedY, activeSelection.startY + HOUR_HEIGHT / 4)
        }, true); // isResize = true
      }
      return;
    }

    // Handle drag-to-create
    if (!isDragging) return;
    setDragEnd(y);
  };

  const handlePointerUp = (e) => {
    // End resize
    if (isResizing) {
      setIsResizing(null);
      resizeStartY.current = null;
      return;
    }

    if (!isDragging) return;

    const startTime = getTimeFromY(Math.min(dragStart, dragEnd));
    const endTime = getTimeFromY(Math.max(dragStart, dragEnd));

    const durationMinutes = (endTime.hours - startTime.hours) * 60 + (endTime.minutes - startTime.minutes);

    // If it was a tap (very small drag), create a selection instead
    if (durationMinutes < SNAP_MINUTES) {
      handleTap(e);
      ignoreNextClick.current = true; // Signal handleClick to ignore this
    } else {
      // Drag created a range - set as draft selection so drawer opens
      if (onSelectionChange) {
        onSelectionChange({
          startY: Math.min(dragStart, dragEnd),
          endY: Math.max(dragStart, dragEnd)
        }, false); // isResize = false
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Handle click for touch devices (Tap-to-create)
  // This event fires after pointer events if no scroll/cancel occurred
  const handleClick = (e) => {
    // If we just handled this via PointerUp (Mouse), ignore the subsequent Click
    if (ignoreNextClick.current) {
      ignoreNextClick.current = false;
      return;
    }

    // Ignore if we just finished dragging or resizing (handled in pointerUp)
    if (isDragging || isResizing) return;

    // Safety check: Don't create if clicking on existing events (handled by event stopPropagation usually)

    handleTap(e);
  };



  // Generate 15-minute slot markers (just visual lines, no labels)
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push({ hour: h, minute: m, isHour: m === 0 });
    }
  }

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });

  // Handle header click to zoom into day
  const handleHeaderClick = () => {
    if (onDaySelect) {
      onDaySelect(date);
    }
  };

  // Format selection time for display
  const getSelectionTimeDisplay = () => {
    if (!selection) return '';
    const start = getTimeFromY(selection.startY);
    const end = getTimeFromY(selection.endY);
    return `${formatTime(start.hours, start.minutes)} – ${formatTime(end.hours, end.minutes)}`;
  };

  return (
    <div className={`day-column ${isFullWidth ? 'full-width' : ''}`}>
      <div
        className={`day-header ${onDaySelect ? 'clickable' : ''}`}
        onClick={handleHeaderClick}
        title={onDaySelect ? 'Click to zoom into this day' : ''}
      >
        <span className="day-name">{dayName}</span>
        <span className="day-date">{monthName} {dayNum}</span>
        {onDaySelect && <span className="zoom-hint">→</span>}
      </div>

      <div
        ref={columnRef}
        className={`day-slots ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onPointerCancel={() => {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
          setIsResizing(null);
        }}
        style={{
          height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET}px`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 15-minute grid lines */}
        {slots.map(({ hour, minute, isHour }, idx) => (
          <div
            key={idx}
            className={`slot-line ${isHour ? 'hour-line' : 'quarter-line'}`}
            style={{ top: `${getYFromTime(hour, minute)}px` }}
          />
        ))}

        {/* Items */}
        {dayItems.map((item) => (
          <TimelineItem key={item.id} item={{ ...item, onEdit: onEditItem }} dayStart={dayStart} />
        ))}

        {/* Draft while dragging */}
        {isDragging && dragStart !== null && dragEnd !== null && (
          <DraftItem startY={dragStart} endY={dragEnd} />
        )}

        {/* Phase 4: Selection box with resize handles */}
        {activeSelection && (
          <div
            className="selection-box"
            style={{
              position: 'absolute',
              left: '2px',
              right: '2px',
              top: `${Math.min(activeSelection.startY, activeSelection.endY)}px`,
              height: `${Math.abs(activeSelection.endY - activeSelection.startY)}px`,
              background: 'rgba(52, 152, 219, 0.1)',
              border: '2px solid #3498db',
              borderRadius: '6px',
              cursor: 'pointer',
              zIndex: 10,
              pointerEvents: 'none', // Let clicks pass through to container (handlers are on container)
            }}
          >
            {/* Top Handle (Circle) */}
            <div
              className="resize-handle top"
              style={{
                position: 'absolute',
                top: '-5px',
                left: '-5px',
                width: '10px',
                height: '10px',
                background: '#3498db',
                borderRadius: '50%',
                cursor: 'nwse-resize',
                pointerEvents: 'auto',
                touchAction: 'none', // Critical: Prevent browser gesture (pull-to-refresh) during resize
                boxShadow: '0 0 2px white'
              }}
            />

            {/* Bottom Handle (Circle) */}
            <div
              className="resize-handle bottom"
              style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                width: '10px',
                height: '10px',
                background: '#3498db',
                borderRadius: '50%',
                cursor: 'nwse-resize',
                pointerEvents: 'auto',
                touchAction: 'none', // Critical: Prevent browser gesture (pull-to-refresh) during resize
                boxShadow: '0 0 2px white'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Hour Labels Sidebar
// ============================================
function HourLabelsSidebar() {
  const hours = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    hours.push(h);
  }

  return (
    <div className="hour-sidebar">
      <div className="hour-sidebar-header" />
      <div className="hour-sidebar-content" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET}px` }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="hour-label"
            style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET}px` }}
          >
            {formatHour(hour)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Phase 4: Floating Add Button (FAB)
// ============================================
function FloatingAddButton({ onClick }) {
  return (
    <button
      className="fab-add"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#f39c12',
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        fontSize: '32px',
        cursor: 'pointer',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s',
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      +
    </button>
  );
}

// ============================================
// Main Timeline Page
// ============================================
export default function TimelineSandbox() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [timezone] = useState(DEFAULT_TIMEZONE);
  const [weekOffset, setWeekOffset] = useState(0);

  // New: View mode state ('week' | 'day')
  const [viewMode, setViewMode] = useState('week');
  const [selectedDay, setSelectedDay] = useState(null); // For Day View
  const [isMobile, setIsMobile] = useState(false);

  // Phase 4: Tap-to-Create Selection State
  const [draftSelection, setDraftSelection] = useState(null); // { date, startY, endY }

  // Handle selection change from DayColumn
  const handleSelectionChange = useCallback((newSelection, date, isResize = false) => {
    if (newSelection === null) {
      setDraftSelection(null);
    } else {
      // If we are tapping (not resizing) and we already have a selection:
      // The user wants to "Exit" the current selection.
      if (draftSelection && !isResize) {
        setDraftSelection(null);
        return;
      }

      setDraftSelection({
        ...newSelection,
        date
      });
    }
  }, [draftSelection]);

  // Open modal from drawer
  const handleDrawerSave = useCallback(() => {
    if (!draftSelection) return;

    const startTime = getTimeFromY(draftSelection.startY);
    const endTime = getTimeFromY(draftSelection.endY);

    setPendingCreate({
      date: draftSelection.date.toISOString().split('T')[0],
      start: `${String(startTime.hours).padStart(2, '0')}:${String(startTime.minutes).padStart(2, '0')}`,
      end: `${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`,
    });
    setEditingItem(null);
    setModalOpen(true);
    setDraftSelection(null);
  }, [draftSelection]);

  // Base date for the trip (Monday Jan 19, 2026)
  const baseDate = useMemo(() => new Date(2026, 0, 19), []);

  // Phase 3: Responsive defaults - detect viewport and auto-switch on mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 600;
      setIsMobile(mobile);

      // Auto-switch to Day View on mobile if in Week View and no day selected yet
      if (mobile && viewMode === 'week' && !selectedDay) {
        // Default to first day of current week
        const start = new Date(baseDate);
        start.setDate(baseDate.getDate() + (weekOffset * 7));
        setSelectedDay(start);
        setViewMode('day');
      }
    };

    // Check on mount
    checkMobile();

    // Listen for resize - but ONLY update isMobile state, do NOT auto-switch view again
    // (This allows user to manually switch to Week View on mobile if they want)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Only run on mount (checkMobile uses initial state, which is fine for "boot" logic)

  // Generate days based on view mode
  const days = useMemo(() => {
    if (viewMode === 'day' && selectedDay) {
      return [selectedDay];
    }
    // Week view: 7 days based on week offset
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() + (weekOffset * 7));

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // 7 days total (Mon-Sun)

    return getDaysBetween(start, end);
  }, [viewMode, selectedDay, weekOffset, baseDate]);

  // Format the header title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'day' && selectedDay) {
      return selectedDay.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
    // Week view: show date range
    if (days.length > 0) {
      const start = days[0];
      const end = days[days.length - 1];
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
    return '';
  }, [viewMode, selectedDay, days]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (viewMode === 'day' && selectedDay) {
      const newDay = new Date(selectedDay);
      newDay.setDate(newDay.getDate() - 1);
      setSelectedDay(newDay);
    } else {
      setWeekOffset(prev => prev - 1);
    }
  }, [viewMode, selectedDay]);

  const handleNext = useCallback(() => {
    if (viewMode === 'day' && selectedDay) {
      const newDay = new Date(selectedDay);
      newDay.setDate(newDay.getDate() + 1);
      setSelectedDay(newDay);
    } else {
      setWeekOffset(prev => prev + 1);
    }
  }, [viewMode, selectedDay]);

  const handleToday = useCallback(() => {
    if (viewMode === 'day') {
      setSelectedDay(new Date(baseDate));
    } else {
      setWeekOffset(0);
    }
  }, [viewMode, baseDate]);

  // Zoom into Day View when tapping a day header
  const handleDaySelect = useCallback((date) => {
    setSelectedDay(new Date(date));
    setViewMode('day');
  }, []);

  // Go back to Week View
  const handleBackToWeek = useCallback(() => {
    setViewMode('week');
    // Optionally: set weekOffset to show the week containing selectedDay
    if (selectedDay) {
      const daysDiff = Math.floor((selectedDay - baseDate) / (1000 * 60 * 60 * 24));
      setWeekOffset(Math.floor(daysDiff / 7));
    }
  }, [selectedDay, baseDate]);

  // ============================================
  // Phase 2: Swipe Navigation
  // ============================================
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeThreshold = 50; // minimum px to trigger swipe

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger swipe if horizontal movement is greater than vertical
    // and exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right → go to previous
        handlePrev();
      } else {
        // Swipe left → go to next
        handleNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [handlePrev, handleNext]);

  const handleDragCreate = useCallback(({ date, startTime, endTime }) => {
    setPendingCreate({
      date: date.toISOString().split('T')[0],
      start: startTime,
      end: endTime,
    });
    setEditingItem(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setPendingCreate(null);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setModalOpen(false);
  }, []);

  const handleSave = useCallback((newItem) => {
    if (newItem.id) {
      // Update existing
      setItems((prev) => prev.map((item) =>
        item.id === newItem.id
          ? { ...item, ...newItem, startTime: `${newItem.startDate}T${newItem.startTime}:00`, endTime: `${newItem.endDate}T${newItem.endTime}:00` }
          : item
      ));
    } else {
      // Create new
      const fullItem = {
        id: `item-${Date.now()}`,
        type: newItem.type,
        title: newItem.title,
        startTime: `${newItem.startDate}T${newItem.startTime}:00`,
        endTime: `${newItem.endDate}T${newItem.endTime}:00`,
      };
      setItems((prev) => [...prev, fullItem]);
    }
    setPendingCreate(null);
    setEditingItem(null);
  }, []);

  const handleStressTest = useCallback(() => {
    const newItems = [];
    const types = ['activity', 'flight', 'stay', 'transit'];

    // Generate 50 random items
    for (let i = 0; i < 50; i++) {
      const randomDayIndex = Math.floor(Math.random() * 7);
      // Base date is Monday Jan 19 + weekOffset * 7 + randomDayIndex
      // But we can just use the 'days' array
      const dayDate = days[randomDayIndex];

      const startHour = Math.floor(Math.random() * 18); // 0-18
      const duration = 1 + Math.floor(Math.random() * 3); // 1-3 hours
      const endHour = startHour + duration;

      // Random minutes (0, 15, 30, 45)
      const startMin = Math.floor(Math.random() * 4) * 15;
      const endMin = Math.floor(Math.random() * 4) * 15;

      const type = types[Math.floor(Math.random() * types.length)];

      // Format YYYY-MM-DD
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

      newItems.push({
        id: `stress-${Date.now()}-${i}`,
        type,
        title: `${type} ${i + 1}`,
        startTime: `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`,
        endTime: `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`,
      });
    }
    setItems(newItems);
  }, [days]);

  return (
    <>
      <Head>
        <title>Timeline Sandbox | Bangin' Travel</title>
      </Head>

      <div className="timeline-sandbox">
        <header className="sandbox-header">
          <h1>🧪 Timeline Sandbox</h1>

          {/* Navigation Controls */}
          <div className="nav-controls">
            <button onClick={handlePrev}>
              &lt; {viewMode === 'day' ? 'Prev Day' : 'Prev Week'}
            </button>
            <span className="nav-title">{headerTitle}</span>
            <button onClick={handleNext}>
              {viewMode === 'day' ? 'Next Day' : 'Next Week'} &gt;
            </button>
          </div>

          {/* Back to Week button (Day View only) */}
          {viewMode === 'day' && (
            <button className="back-to-week" onClick={handleBackToWeek}>
              ↩ Back to Week
            </button>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
            <p style={{ margin: 0 }}>
              {viewMode === 'week' ? 'Tap day header to zoom. ' : ''}
              Drag to create. Click to edit.
            </p>
            <div className="timezone-display">🌍 {timezone}</div>
            <button onClick={handleStressTest} style={{ background: '#ffeaa7', border: '2px solid #2c3e50', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>⚡ stress</button>
          </div>
        </header>

        <div
          className="timeline-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <HourLabelsSidebar />
          <div className="timeline-container">
            <div
              className="timeline-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'day' ? '1fr' : 'repeat(7, 1fr)',
                width: '100%'
              }}
            >
              {days.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  date={day}
                  items={items}
                  onDragCreate={handleDragCreate}
                  onEditItem={handleEdit}
                  onDaySelect={viewMode === 'week' ? handleDaySelect : null}
                  isFullWidth={viewMode === 'day'}
                  activeSelection={
                    draftSelection &&
                      day.toISOString().split('T')[0] === draftSelection.date.toISOString().split('T')[0]
                      ? draftSelection
                      : null
                  }
                  onSelectionChange={(sel, isResize) => handleSelectionChange(sel, day, isResize)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating Add Button */}
        {draftSelection && (
          <FloatingAddButton onClick={handleDrawerSave} />
        )}

        <AddItemModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPendingCreate(null);
            setEditingItem(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          initialTime={pendingCreate}
          editingItem={editingItem}
          timezone={timezone}
        />
      </div>

      <style jsx>{`
        /* Sandbox Layout */
        .timeline-sandbox {
          min-height: 100vh;
          background: var(--warm-sand, #fdfaf5);
          padding: var(--space-lg, 24px);
        }
        
        /* Remove padding on mobile for edge-to-edge */
        @media (max-width: 600px) {
          .timeline-sandbox {
            padding: 8px 0;
          }
        }
        
        .sandbox-header {
          text-align: center;
          margin-bottom: var(--space-lg, 24px);
        }
        
        .sandbox-header h1 {
          font-family: var(--font-display, 'Bungee', cursive);
          font-size: 1.75rem;
          margin-bottom: var(--space-xs, 4px);
        }
        
        .sandbox-header p {
          color: var(--text-secondary, #5d6d7e);
          margin-bottom: var(--space-sm, 8px);
        }
        
        .nav-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }
        
        .nav-controls button {
          background: var(--white, #fff);
          border: 2px solid var(--border-color, #2c3e50);
          padding: 6px 16px;
          border-radius: 6px;
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          margin: 0 4px;
          transition: transform 0.1s;
          box-shadow: 2px 2px 0 var(--border-color, #2c3e50);
        }
        
        .nav-controls button:hover {
          transform: translateY(-1px);
          box-shadow: 3px 3px 0 var(--border-color, #2c3e50);
        }
        
        .nav-controls button:active {
          transform: translateY(1px);
          box-shadow: 1px 1px 0 var(--border-color, #2c3e50);
        }
        
        .timezone-display {
          display: inline-block;
          background: var(--cream, #f8f4eb);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          color: var(--text-secondary, #5d6d7e);
        }
        
        /* View Toggle */
        .view-toggle {
          display: inline-flex;
          background: var(--cream, #f8f4eb);
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        /* Nav Title */
        .nav-title {
          padding: 6px 20px;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary, #2c3e50);
          min-width: 180px;
          text-align: center;
        }
        
        /* Back to Week button */
        .back-to-week {
          margin-top: 8px;
          background: var(--cream, #f8f4eb);
          border: 2px solid var(--border-color, #2c3e50);
          padding: 6px 16px;
          border-radius: 20px;
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .back-to-week:hover {
          background: var(--border-color, #2c3e50);
          color: white;
        }
        
        /* Timeline Wrapper - contains sidebar + grid */
        .timeline-wrapper {
          display: flex;
          background: var(--white, #fff);
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: var(--radius-retro, 12px);
          box-shadow: 6px 6px 0 0 var(--border-color, #2c3e50);
          overflow: hidden;
          width: 100%; /* Constrain to parent */
          max-width: 100%; /* Prevent overflow */
          touch-action: pan-y; /* Allow vertical scroll */
        }
        
        /* Hour Labels Sidebar */
        :global(.hour-sidebar) {
          flex: 0 0 50px; /* Slightly narrower */
          background: var(--cream, #f8f4eb);
          border-right: 2px solid var(--border-color, #2c3e50);
        }
        
        :global(.hour-sidebar-header) {
          height: 48px; /* Match day header height on mobile */
          border-bottom: 2px solid var(--border-color, #2c3e50);
        }
        
        :global(.hour-sidebar-content) {
          position: relative;
          overflow: hidden;
        }
        
        :global(.hour-label) {
          position: absolute;
          left: 0;
          right: 0;
          padding: 0 6px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary, #5d6d7e);
          text-align: right;
          transform: translateY(-50%);
          white-space: nowrap;
        }
        
        /* Responsive hour sidebar */
        @media (max-width: 600px) {
          :global(.hour-sidebar) {
            flex: 0 0 32px; /* Narrower on mobile */
          }
          
          :global(.hour-label) {
            font-size: 0.5rem;
            padding: 0 2px;
          }
        }
        
        /* Timeline Container - must constrain grid width */
        .timeline-container {
          flex: 1;
          overflow: hidden;
          overflow-x: auto; /* Allow horizontal scroll for Week View on mobile */
          min-width: 0; 
          max-width: 100%; 
        }
        
        /* Day Column - takes full width of grid cell */
        :global(.day-column) {
          min-width: 42px; /* Compact for 7-day mobile view: (375 - 32 sidebar) / 7 ≈ 49px */
          width: 100%; /* Take full grid cell width */
          border-right: 1px solid var(--cream, #f8f4eb);
          overflow: hidden;
        }
        
        :global(.day-column:last-child) {
          border-right: none;
        }
        
        :global(.day-header) {
          height: 48px; /* Match sidebar header height */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--cream, #f8f4eb);
          border-bottom: 2px solid var(--border-color, #2c3e50);
          position: relative;
          transition: all 0.15s;
          padding: 4px 2px;
        }
        
        :global(.day-header.clickable) {
          cursor: pointer;
        }
        
        :global(.day-header.clickable:hover) {
          background: var(--border-color, #2c3e50);
          color: white;
        }
        
        :global(.day-header.clickable:hover .day-name),
        :global(.day-header.clickable:hover .day-date) {
          color: white;
        }
        
        :global(.zoom-hint) {
          position: absolute;
          right: 8px;
          font-size: 0.75rem;
          opacity: 0.5;
          transition: opacity 0.15s;
        }
        
        :global(.day-header.clickable:hover .zoom-hint) {
          opacity: 1;
          color: white;
        }
        
        :global(.day-name) {
          font-family: var(--font-heading, 'Outfit', sans-serif);
          font-weight: 700;
          font-size: 0.875rem;
        }
        
        :global(.day-date) {
          font-size: 0.75rem;
          color: var(--text-secondary, #5d6d7e);
        }
        
        /* Responsive: Compact headers on mobile */
        @media (max-width: 768px) {
          :global(.day-header) {
            height: 48px;
            padding: 4px 2px;
          }
          
          :global(.day-name) {
            font-size: 0.7rem;
          }
          
          :global(.day-date) {
            font-size: 0.6rem;
          }
          
          :global(.zoom-hint) {
            display: none; /* Hide zoom hint on mobile - tap works anyway */
          }
        }
        
        @media (max-width: 480px) {
          :global(.day-name) {
            font-size: 0.6rem;
          }
          
          :global(.day-date) {
            font-size: 0.55rem;
          }
        }
        
        /* Day Slots */
        :global(.day-slots) {
          cursor: crosshair;
          touch-action: pan-y; /* Allow vertical scroll */
          overscroll-behavior-y: none; /* Prevent pull-to-refresh on the grid itself */
          user-select: none;
          background: var(--white, #fff);
        }
        
        :global(.day-slots.dragging) {
          cursor: ns-resize;
        }
        
        /* Grid Lines */
        :global(.slot-line) {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          pointer-events: none;
        }
        
        :global(.hour-line) {
          background: var(--cream, #f8f4eb);
          height: 2px;
        }
        
        :global(.quarter-line) {
          background: rgba(248, 244, 235, 0.5);
        }
        
        /* Timeline Items */
        :global(.timeline-item) {
          position: absolute;
          border-width: 2px;
          border-style: solid;
          border-radius: 6px;
          padding: 4px 8px;
          overflow: hidden;
          box-sizing: border-box;
          cursor: pointer;
        }
        
        :global(.timeline-item-content) {
          display: flex;
          flex-direction: column;
          gap: 2px;
          height: 100%;
        }
        
        :global(.timeline-item-title) {
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        :global(.timeline-item-time) {
          font-size: 0.65rem;
          opacity: 0.8;
        }
        
        /* Draft Item */
        :global(.timeline-draft) {
          position: absolute;
          left: 4px;
          right: 4px;
          background: rgba(243, 156, 18, 0.3);
          border: 2px dashed var(--accent-orange, #f39c12);
          border-radius: 6px;
          z-index: 5;
          pointer-events: none;
        }
        
        :global(.timeline-draft-content) {
          padding: 8px;
          text-align: center;
        }
        
        :global(.timeline-draft-time) {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--accent-orange, #f39c12);
        }
        
        /* Modal */
        :global(.modal-overlay) {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        
        :global(.modal-content) {
          background: var(--white, #fff);
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 12px;
          box-shadow: 6px 6px 0 0 var(--border-color, #2c3e50);
          width: 100%;
          max-width: 420px;
        }
        
        :global(.modal-header) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 2px solid var(--cream, #f8f4eb);
        }
        
        :global(.modal-header h3) {
          font-family: var(--font-heading, 'Outfit', sans-serif);
          font-size: 1.25rem;
          margin: 0;
        }
        
        :global(.modal-close) {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-muted, #95a5a6);
          padding: 0;
          line-height: 1;
        }
        
        :global(.modal-content form) {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        :global(.type-selector) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        :global(.type-chip) {
          flex: 1;
          min-width: 80px;
          padding: 8px 12px;
          background: var(--cream, #f8f4eb);
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        :global(.type-chip:hover) {
          background: var(--white, #fff);
        }
        
        :global(.type-chip.active) {
          background: var(--chip-color);
          color: white;
          border-color: var(--chip-color);
        }
        
        :global(.datetime-row) {
          padding: 12px;
          background: var(--cream, #f8f4eb);
          border-radius: 6px;
        }
        
        :global(.datetime-field) {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        :global(.datetime-field label) {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary, #5d6d7e);
        }
        
        :global(.datetime-inputs) {
          display: flex;
          gap: 8px;
        }
        
        :global(.datetime-inputs input) {
          flex: 1;
          padding: 10px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        :global(.datetime-inputs input[type="date"]) {
          flex: 1.2;
        }
        
        :global(.datetime-inputs input[type="time"]) {
          flex: 0.8;
        }
        
        :global(.timezone-hint) {
          font-size: 0.75rem;
          color: var(--text-muted, #95a5a6);
          text-align: center;
          margin-top: -8px;
        }
        
        :global(.form-field) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        :global(.form-field label) {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary, #5d6d7e);
        }
        
        :global(.form-field input[type="text"]) {
          padding: 16px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-size: 1rem;
        }
        
        :global(.modal-actions) {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        
        :global(.btn-cancel) {
          flex: 1;
          padding: 16px;
          background: var(--white, #fff);
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        
        :global(.btn-save) {
          flex: 2;
          padding: 16px;
          background: var(--accent-orange, #f39c12);
          color: white;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 0 0 var(--border-color, #2c3e50);
          transition: all 0.15s ease;
        }
        
        :global(.btn-save:hover) {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0 0 var(--border-color, #2c3e50);
        }

        /* Bottom Creation Drawer */
        :global(.creation-drawer) {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 2px solid var(--border-color, #2c3e50);
          border-radius: 16px 16px 0 0;
          padding: 12px 16px 24px 16px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
          z-index: 100;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        :global(.drawer-handle-bar) {
          display: flex;
          justify-content: center;
          padding-bottom: 12px;
        }

        :global(.drawer-handle) {
          width: 40px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
        }

        :global(.drawer-header) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        :global(.drawer-title) {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-dark, #2c3e50);
        }

        :global(.btn-save-drawer) {
          padding: 8px 16px;
          background: var(--accent-orange, #f39c12);
          color: white;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        :global(.drawer-content) {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.drawer-row) {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary, #5d6d7e);
          font-size: 0.95rem;
        }

        :global(.drawer-icon) {
          font-size: 1.2rem;
          width: 24px;
          text-align: center;
        }

        :global(.btn-close-drawer) {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          color: #999;
          font-size: 1.2rem;
          cursor: pointer;
          display: none; /* Hide close button, use tap outside or save to close */
        }
      `}</style>
    </>
  );
}
