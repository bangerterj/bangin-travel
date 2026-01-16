import { useState, useRef, useMemo } from 'react';

// Time constants
const SLOT_HEIGHT = 15; // pixels per 15-minute slot
const HOUR_HEIGHT = SLOT_HEIGHT * 4; // 60px per hour
const SNAP_MINUTES = 15;
const START_HOUR = 0;  // Start at midnight
const END_HOUR = 24;   // End at midnight next day
const GRID_OFFSET = 16;   // Top spacing to prevent overlap

// Item type colors (Exported for sharing if needed, or kept local)
export const TYPE_COLORS = {
    flight: { bg: '#3498db', border: '#2980b9', text: '#fff' },
    stay: { bg: '#9b59b6', border: '#8e44ad', text: '#fff' },
    transit: { bg: '#1abc9c', border: '#16a085', text: '#fff' },
    activity: { bg: '#e67e22', border: '#d35400', text: '#fff' },
};

// Helper: Parse time string
export function parseTime(timeStr) {
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
            overlapIndex: 0,
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

    // Calculate width based on overlaps (leaving room for "sliver")
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
// Draft Item Component
// ============================================
function DraftItem({ startY, endY }) {
    const top = Math.min(startY, endY);
    const height = Math.max(Math.abs(endY - startY), SLOT_HEIGHT);

    const startTime = getTimeFromY(top);
    const endTime = getTimeFromY(top + height);

    return (
        <div className="timeline-draft"
            style={{
                top: `${top}px`,
                height: `${height}px`,
            }}
        >
            <div className="timeline-draft-content">
                <span className="timeline-draft-time">
                    {formatTime(startTime.hours, startTime.minutes)} - {formatTime(endTime.hours, endTime.minutes)}
                </span>
            </div>
        </div>
    );
}

// ============================================
// Day Column Component
// ============================================
function DayColumn({ date, items, onDragCreate, onEditItem }) {
    const columnRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayItems = useMemo(() => getItemsForDay(items, dayStart), [items, dayStart]);

    const handlePointerDown = (e) => {
        if (e.button !== 0) return;
        const rect = columnRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top + columnRef.current.scrollTop;
        setIsDragging(true);
        setDragStart(y);
        setDragEnd(y);
        if (e.pointerId) columnRef.current.setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const rect = columnRef.current.getBoundingClientRect();
        const maxY = (END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET;
        const y = Math.max(0, Math.min(e.clientY - rect.top + columnRef.current.scrollTop, maxY));
        setDragEnd(y);
    };

    const handlePointerUp = () => {
        if (!isDragging) return;
        const startTime = getTimeFromY(Math.min(dragStart, dragEnd));
        const endTime = getTimeFromY(Math.max(dragStart, dragEnd));
        const durationMinutes = (endTime.hours - startTime.hours) * 60 + (endTime.minutes - startTime.minutes);
        if (durationMinutes >= SNAP_MINUTES) {
            onDragCreate({
                date,
                startTime: `${String(startTime.hours).padStart(2, '0')}:${String(startTime.minutes).padStart(2, '0')}`,
                endTime: `${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`,
            });
        }
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
    };

    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
        for (let m = 0; m < 60; m += 15) {
            slots.push({ hour: h, minute: m, isHour: m === 0 });
        }
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    return (
        <div className="day-column">
            <div className="day-header">
                <span className="day-name">{dayName}</span>
                <span className="day-date">{monthName} {dayNum}</span>
            </div>
            <div
                ref={columnRef}
                className={`day-slots ${isDragging ? 'dragging' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => { setIsDragging(false); setDragStart(null); setDragEnd(null); }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                style={{
                    height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET}px`,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {slots.map(({ hour, minute, isHour }, idx) => (
                    <div key={idx} className={`slot-line ${isHour ? 'hour-line' : 'quarter-line'}`} style={{ top: `${getYFromTime(hour, minute)}px` }} />
                ))}
                {dayItems.map((item) => (
                    <TimelineItem key={item.id} item={{ ...item, onEdit: onEditItem }} dayStart={dayStart} />
                ))}
                {isDragging && dragStart !== null && dragEnd !== null && (
                    <DraftItem startY={dragStart} endY={dragEnd} />
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
                    <div key={hour} className="hour-label" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT + GRID_OFFSET}px` }}>
                        {formatHour(hour)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// Main Timeline Component
// ============================================
export default function Timeline({ days, items, onDragCreate, onEditItem }) {
    return (
        <div className="timeline-wrapper">
            <HourLabelsSidebar />
            <div className="timeline-container">
                <div className="timeline-grid">
                    {days.map((day) => (
                        <DayColumn
                            key={day.toISOString()}
                            date={day}
                            items={items}
                            onDragCreate={onDragCreate}
                            onEditItem={onEditItem}
                        />
                    ))}
                </div>
            </div>

            <style jsx>{`
        .timeline-wrapper {
          display: flex;
          background: var(--white, #fff);
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: var(--radius-retro, 12px);
          box-shadow: 6px 6px 0 0 var(--border-color, #2c3e50);
          overflow: hidden;
          flex: 1; /* Allow filling parent */
        }
        
        /* Hour Labels Sidebar */
        :global(.hour-sidebar) {
          flex: 0 0 60px;
          background: var(--cream, #f8f4eb);
          border-right: 2px solid var(--border-color, #2c3e50);
        }
        
        :global(.hour-sidebar-header) {
          height: 56px;
          border-bottom: 2px solid var(--border-color, #2c3e50);
        }
        
        :global(.hour-sidebar-content) {
          position: relative;
        }
        
        :global(.hour-label) {
          position: absolute;
          left: 0;
          right: 0;
          padding: 2px 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary, #5d6d7e);
          text-align: right;
          transform: translateY(-50%);
        }
        
        /* Timeline Container */
        .timeline-container {
          flex: 1;
          overflow-x: auto;
        }
        
        .timeline-grid {
          display: flex;
          width: 100%;
        }
        
        /* Day Column */
        :global(.day-column) {
          flex: 1;
          min-width: 140px;
          border-right: 1px solid var(--cream, #f8f4eb);
        }
        
        :global(.day-column:last-child) {
          border-right: none;
        }
        
        :global(.day-header) {
          height: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--cream, #f8f4eb);
          border-bottom: 2px solid var(--border-color, #2c3e50);
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
        
        /* Day Slots */
        :global(.day-slots) {
          cursor: crosshair;
          touch-action: none;
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
      `}</style>
        </div>
    );
}
