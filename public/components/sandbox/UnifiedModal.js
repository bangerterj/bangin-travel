import { useState, useEffect } from 'react';
import { LocationSearch, TYPE_CONFIG } from './Map';

export default function UnifiedModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialData,
    timezone
}) {
    const [type, setType] = useState('activity');
    const [title, setTitle] = useState('');

    // Date/Time state
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');

    // Location state
    const [location, setLocation] = useState(null);

    // Initialize state from initialData
    useEffect(() => {
        if (initialData) {
            setType(initialData.type || 'activity');
            setTitle(initialData.title || '');

            // Parse dates if present (only if ISO format with 'T')
            const isISO = (str) => str && typeof str === 'string' && str.includes('T');
            const start = isISO(initialData.startTime) ? new Date(initialData.startTime) : null;
            const end = isISO(initialData.endTime) ? new Date(initialData.endTime) : null;

            const formatDate = (d) => {
                if (!d || isNaN(d.getTime())) return '';
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const formatTime = (d) => {
                if (!d || isNaN(d.getTime())) return '09:00';
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            };

            if (start && !isNaN(start.getTime())) {
                setStartDate(formatDate(start));
                setStartTime(formatTime(start));
            } else if (initialData.startDate) {
                setStartDate(initialData.startDate);
                setStartTime(initialData.startTime || '09:00');
            }

            if (end && !isNaN(end.getTime())) {
                setEndDate(formatDate(end));
                setEndTime(formatTime(end));
            } else if (initialData.endDate) {
                setEndDate(initialData.endDate);
                setEndTime(initialData.endTime || '10:00');
            }

            // Location
            if (initialData.location) {
                setLocation(initialData.location);
                if (!initialData.title) setTitle(initialData.location.displayName);
            } else {
                setLocation(null);
            }
        } else {
            // Defaults
            setType('activity');
            setTitle('');
            setLocation(null);
            // Dates should probably be passed in initialData if creating from timeline
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: initialData?.id, // Preserve ID if editing
            type,
            title: title || (location ? location.displayName : `New ${type}`),
            location,
            startDate,
            startTime,
            endDate,
            endTime,
            // Helper to construct ISO strings? 
            // Parent might reasonably expect separated fields or ISO strings.
            // Let's pass typical separated fields and let parent construct ISO.
        });
        onClose();
    };

    const handleLocationSelect = (loc) => {
        setLocation(loc);
        if (!title) setTitle(loc.displayName);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{initialData?.id ? 'Edit Item' : 'Add to Trip'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Type Selector */}
                    <div className="type-selector">
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                type="button"
                                className={`type-chip ${type === key ? 'active' : ''}`}
                                style={{ '--chip-color': config.color }}
                                onClick={() => setType(key)}
                            >
                                {config.icon} {config.label}
                            </button>
                        ))}
                    </div>

                    <div className="form-group">
                        <div className="form-field">
                            <label>Start</label>
                            <div className="datetime-inputs">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-field">
                            <label>End</label>
                            <div className="datetime-inputs">
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    <div className="timezone-hint">🌍 {timezone}</div>

                    {/* Location Search */}
                    <div className="form-field">
                        <label>Location</label>
                        {location ? (
                            <div className="selected-location">
                                <span className="loc-icon">📍</span>
                                <span className="loc-name">{location.displayName}</span>
                                <button type="button" className="btn-clear-loc" onClick={() => setLocation(null)}>✕</button>
                            </div>
                        ) : (
                            <LocationSearch onSelect={handleLocationSelect} placeholder="Search places..." />
                        )}
                    </div>

                    <div className="form-field">
                        <label>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Event name"
                            className="title-input"
                        />
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        {initialData?.id && onDelete && (
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={() => {
                                    if (confirm('Delete this item?')) {
                                        onDelete(initialData.id);
                                        onClose();
                                    }
                                }}
                            >
                                Delete
                            </button>
                        )}
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-save">
                            Save Item
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .modal-content {
          background: white;
          border: 3px solid var(--border-color, #2c3e50);
          border-radius: 12px;
          box-shadow: 8px 8px 0 var(--border-color, #2c3e50);
          width: 500px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 2px solid var(--cream, #f8f4eb);
          background: var(--cream, #f8f4eb);
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        form { padding: 20px; }
        
        .type-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .type-chip {
          padding: 6px 12px;
          border: 2px solid var(--border-color, #2c3e50);
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.1s;
        }
        
        .type-chip:hover { transform: translateY(-1px); }
        .type-chip.active {
          background: var(--chip-color);
          color: white;
          border-color: var(--chip-color);
        }

        .grid-2 {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 16px;
        }
        
        .form-field { margin-bottom: 16px; }
        .form-field label {
           display: block;
           font-size: 0.8rem;
           font-weight: 700;
           color: var(--text-secondary, #5d6d7e);
           margin-bottom: 6px;
        }
        
        .datetime-inputs {
           display: flex;
           gap: 8px;
        }
        
        .datetime-inputs input {
           width: 100%;
           padding: 8px;
           border: 2px solid var(--cream, #f8f4eb);
           border-radius: 6px;
        }
        
        .title-input {
           width: 100%;
           padding: 10px;
           font-size: 1rem;
           border: 2px solid var(--cream, #f8f4eb);
           border-radius: 6px;
           font-weight: 600;
        }
        
        .selected-location {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 8px 12px;
           background: var(--cream, #f8f4eb);
           border-radius: 6px;
           border: 1px solid var(--border-color, #2c3e50);
        }
        .loc-name { flex: 1; font-weight: 500; }
        .btn-clear-loc {
           background: none;
           border: none;
           cursor: pointer;
           font-weight: bold;
        }
        
        .modal-actions {
           display: flex;
           justify-content: flex-end;
           gap: 12px;
           margin-top: 24px;
           border-top: 2px solid var(--cream, #f8f4eb);
           padding-top: 16px;
        }
        
        .btn-cancel {
           padding: 10px 20px;
           border: 2px solid transparent;
           background: transparent;
           font-weight: 600;
           cursor: pointer;
        }
        
        .btn-save {
           padding: 10px 24px;
           background: var(--border-color, #2c3e50);
           color: white;
           border: none;
           border-radius: 6px;
           font-weight: 600;
           cursor: pointer;
           box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
        }
        .btn-save:active {
           transform: translate(2px, 2px);
           box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }
        
        .btn-delete {
           margin-right: auto;
           color: #e74c3c;
           background: none;
           border: none;
           font-weight: 600;
           cursor: pointer;
        }
        .timezone-hint {
            font-size: 0.75rem;
            color: #7f8c8d;
            margin-top: -12px;
            margin-bottom: 12px;
            text-align: right;
        }
      `}</style>
        </div>
    );
}
