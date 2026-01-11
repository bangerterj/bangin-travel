/**
 * Database Module - SQLite with sql.js (pure JavaScript)
 * Handles database initialization, schema, and queries
 */

// Dynamic require to avoid top-level issues in Next.js
// const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'bangin-travel.db');

let db = null;
let SQL = null;

const SCHEMA = `
-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT,
  start_date TEXT,
  end_date TEXT,
  timezone TEXT DEFAULT 'UTC',
  cover_image TEXT,
  passcode_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Travelers table
CREATE TABLE IF NOT EXISTS travelers (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  initials TEXT,
  color TEXT,
  notes TEXT,
  is_organizer INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_travelers_trip ON travelers(trip_id);

-- Items table (unified for all item types)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'transit', 'stay', 'activity')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'pending', 'booked', 'dropped')),
  title TEXT NOT NULL,
  notes TEXT,
  link_url TEXT,
  start_at TEXT,
  end_at TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_items_trip ON items(trip_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(trip_id, type);

-- Item-Traveler assignments (many-to-many)
CREATE TABLE IF NOT EXISTS item_travelers (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  traveler_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
  role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, traveler_id)
);
CREATE INDEX IF NOT EXISTS idx_item_travelers_item ON item_travelers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_travelers_traveler ON item_travelers(traveler_id);
`;

async function initDatabase() {
    if (db) return db;

    if (!SQL) {
        const initSqlJs = require('sql.js');
        SQL = await initSqlJs();
    }

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
        // Run schema
        db.run(SCHEMA);
        saveDatabase();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Trip queries
const trips = {
    create: async (name, passcodeHash, destination = '', startDate = '', endDate = '', timezone = 'UTC') => {
        await initDatabase();
        const id = generateId('trip');
        const createdAt = new Date().toISOString();
        db.run(
            `INSERT INTO trips (id, name, destination, start_date, end_date, timezone, passcode_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, destination, startDate, endDate, timezone, passcodeHash, createdAt, createdAt]
        );
        saveDatabase();
        return { id, name, destination, startDate, endDate, timezone, createdAt };
    },

    list: async () => {
        await initDatabase();
        const result = db.exec('SELECT id, name, destination, start_date, end_date FROM trips ORDER BY created_at DESC');
        if (!result.length) return [];
        return result[0].values.map(row => ({
            id: row[0],
            name: row[1],
            destination: row[2],
            startDate: row[3],
            endDate: row[4]
        }));
    },

    getById: async (id) => {
        await initDatabase();
        const result = db.exec('SELECT * FROM trips WHERE id = ?', [id]);
        if (!result.length || !result[0].values.length) return null;
        const row = result[0].values[0];
        const columns = result[0].columns;
        const trip = {};
        columns.forEach((col, i) => {
            trip[col] = row[i];
        });
        return trip;
    },

    getPasscodeHash: async (id) => {
        await initDatabase();
        const result = db.exec('SELECT passcode_hash FROM trips WHERE id = ?', [id]);
        if (!result.length || !result[0].values.length) return null;
        return result[0].values[0][0];
    }
};

// Traveler queries
const travelers = {
    create: async (tripId, displayName, email = '', initials = '', color = '', notes = '', isOrganizer = false) => {
        await initDatabase();
        const id = generateId('t');
        const createdAt = new Date().toISOString();
        db.run(
            `INSERT INTO travelers (id, trip_id, display_name, email, initials, color, notes, is_organizer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, tripId, displayName, email, initials, color, notes, isOrganizer ? 1 : 0, createdAt, createdAt]
        );
        saveDatabase();
        return { id, tripId, displayName, email, initials, color, notes, isOrganizer, createdAt };
    },

    listByTrip: async (tripId) => {
        await initDatabase();
        const result = db.exec(
            'SELECT id, display_name, email, initials, color, notes, is_organizer, created_at FROM travelers WHERE trip_id = ? ORDER BY created_at ASC',
            [tripId]
        );
        if (!result.length) return [];
        return result[0].values.map(row => ({
            id: row[0],
            displayName: row[1],
            email: row[2],
            initials: row[3],
            color: row[4],
            notes: row[5],
            isOrganizer: row[6] === 1,
            createdAt: row[7]
        }));
    },

    getById: async (id) => {
        await initDatabase();
        const result = db.exec('SELECT * FROM travelers WHERE id = ?', [id]);
        if (!result.length || !result[0].values.length) return null;
        const row = result[0].values[0];
        return {
            id: row[0],
            tripId: row[1],
            displayName: row[2],
            email: row[3],
            initials: row[4],
            color: row[5],
            notes: row[6],
            isOrganizer: row[7] === 1,
            createdAt: row[8],
            updatedAt: row[9]
        };
    },

    update: async (id, updates) => {
        await initDatabase();
        const fields = [];
        const values = [];

        if (updates.displayName !== undefined) { fields.push('display_name = ?'); values.push(updates.displayName); }
        if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.initials !== undefined) { fields.push('initials = ?'); values.push(updates.initials); }
        if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
        if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
        if (updates.isOrganizer !== undefined) { fields.push('is_organizer = ?'); values.push(updates.isOrganizer ? 1 : 0); }

        if (fields.length === 0) return false;

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.run(`UPDATE travelers SET ${fields.join(', ')} WHERE id = ?`, values);
        saveDatabase();
        return true;
    },

    delete: async (id) => {
        await initDatabase();
        db.run('DELETE FROM travelers WHERE id = ?', [id]);
        saveDatabase();
        return true;
    }
};

// Item queries
const items = {
    create: async (tripId, type, title, options = {}) => {
        await initDatabase();
        const id = generateId(type.charAt(0));
        const createdAt = new Date().toISOString();
        const { notes = '', linkUrl = '', startAt = '', endAt = '', status = 'idea', metadata = {} } = options;

        db.run(
            `INSERT INTO items (id, trip_id, type, status, title, notes, link_url, start_at, end_at, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, tripId, type, status, title, notes, linkUrl, startAt, endAt, JSON.stringify(metadata), createdAt, createdAt]
        );
        saveDatabase();
        return { id, tripId, type, status, title, notes, linkUrl, startAt, endAt, metadata, createdAt, travelers: [] };
    },

    listByTrip: async (tripId, type = null) => {
        await initDatabase();
        let query = 'SELECT * FROM items WHERE trip_id = ?';
        const params = [tripId];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY start_at ASC, created_at ASC';

        const result = db.exec(query, params);
        if (!result.length) return [];

        const columns = result[0].columns;
        return result[0].values.map(row => {
            const item = {};
            columns.forEach((col, i) => {
                if (col === 'metadata') {
                    try {
                        item[col] = JSON.parse(row[i] || '{}');
                    } catch {
                        item[col] = {};
                    }
                } else {
                    item[col] = row[i];
                }
            });
            // Convert snake_case to camelCase
            return {
                id: item.id,
                tripId: item.trip_id,
                type: item.type,
                status: item.status,
                title: item.title,
                notes: item.notes,
                linkUrl: item.link_url,
                startAt: item.start_at,
                endAt: item.end_at,
                metadata: item.metadata,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            };
        });
    },

    getById: async (id) => {
        await initDatabase();
        const result = db.exec('SELECT * FROM items WHERE id = ?', [id]);
        if (!result.length || !result[0].values.length) return null;
        const row = result[0].values[0];
        const columns = result[0].columns;
        const item = {};
        columns.forEach((col, i) => {
            if (col === 'metadata') {
                try {
                    item[col] = JSON.parse(row[i] || '{}');
                } catch {
                    item[col] = {};
                }
            } else {
                item[col] = row[i];
            }
        });
        return {
            id: item.id,
            tripId: item.trip_id,
            type: item.type,
            status: item.status,
            title: item.title,
            notes: item.notes,
            linkUrl: item.link_url,
            startAt: item.start_at,
            endAt: item.end_at,
            metadata: item.metadata,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        };
    },

    update: async (id, updates) => {
        await initDatabase();
        const fields = [];
        const values = [];

        if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
        if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
        if (updates.linkUrl !== undefined) { fields.push('link_url = ?'); values.push(updates.linkUrl); }
        if (updates.startAt !== undefined) { fields.push('start_at = ?'); values.push(updates.startAt); }
        if (updates.endAt !== undefined) { fields.push('end_at = ?'); values.push(updates.endAt); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(updates.metadata)); }

        if (fields.length === 0) return false;

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.run(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);
        saveDatabase();
        return true;
    },

    delete: async (id) => {
        await initDatabase();
        db.run('DELETE FROM items WHERE id = ?', [id]);
        saveDatabase();
        return true;
    }
};

// Assignment queries
const assignments = {
    assign: async (itemId, travelerId, role = null) => {
        await initDatabase();
        const createdAt = new Date().toISOString();
        try {
            db.run(
                'INSERT OR IGNORE INTO item_travelers (item_id, traveler_id, role, created_at) VALUES (?, ?, ?, ?)',
                [itemId, travelerId, role, createdAt]
            );
            saveDatabase();
            return { itemId, travelerId, role, created: true };
        } catch {
            return { itemId, travelerId, role, created: false };
        }
    },

    unassign: async (itemId, travelerId) => {
        await initDatabase();
        db.run('DELETE FROM item_travelers WHERE item_id = ? AND traveler_id = ?', [itemId, travelerId]);
        saveDatabase();
        return true;
    },

    getByItem: async (itemId) => {
        await initDatabase();
        const result = db.exec(
            'SELECT traveler_id, role FROM item_travelers WHERE item_id = ?',
            [itemId]
        );
        if (!result.length) return [];
        return result[0].values.map(row => ({
            travelerId: row[0],
            role: row[1]
        }));
    },

    getByTraveler: async (travelerId) => {
        await initDatabase();
        const result = db.exec(
            'SELECT item_id, role FROM item_travelers WHERE traveler_id = ?',
            [travelerId]
        );
        if (!result.length) return [];
        return result[0].values.map(row => ({
            itemId: row[0],
            role: row[1]
        }));
    }
};

module.exports = {
    initDatabase,
    saveDatabase,
    generateId,
    trips,
    travelers,
    items,
    assignments
};
