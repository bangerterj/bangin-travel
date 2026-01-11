/**
 * Database Module - Postgres
 * Handles database initialization, schema, and queries
 */

const { Pool } = require('pg');

let pool;

if (!process.env.POSTGRES_URL) {
    // We can't query without a DB URL, but we don't want to crash at build time
    // if env vars aren't present yet (e.g. during Vercel build step if not set up).
    console.warn('⚠️ POSTGRES_URL environment variable is not set. Database operations will fail.');
}

// Singleton pool initialization
function getPool() {
    if (!pool) {
        if (!process.env.POSTGRES_URL) {
            throw new Error('POSTGRES_URL environment variable is missing');
        }
        pool = new Pool({
            connectionString: process.env.POSTGRES_URL,
            // Vercel/Supabase usually require SSL
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
    }
    return pool;
}

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
  is_organizer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_travelers_trip ON travelers(trip_id);

-- Items table
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
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_items_trip ON items(trip_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(trip_id, type);

-- Item-Traveler assignments
CREATE TABLE IF NOT EXISTS item_travelers (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  traveler_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, traveler_id)
);
CREATE INDEX IF NOT EXISTS idx_item_travelers_item ON item_travelers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_travelers_traveler ON item_travelers(traveler_id);
`;

async function initDatabase() {
    const db = getPool();
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query(SCHEMA);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to initialize database schema:', e);
        throw e;
    } finally {
        client.release();
    }
    return db;
}

// No-op for compatibility, logic now handled by persistent DB
function saveDatabase() { }

function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Queries
const trips = {
    create: async (name, passcodeHash, destination = '', startDate = '', endDate = '', timezone = 'UTC') => {
        const id = generateId('trip');
        const query = `
            INSERT INTO trips (id, name, destination, start_date, end_date, timezone, passcode_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [id, name, destination, startDate, endDate, timezone, passcodeHash];
        const { rows } = await getPool().query(query, values);
        return rows[0];
    },

    list: async () => {
        try {
            // Ensure DB is init before list (mostly for first run)
            await initDatabase();
            const result = await getPool().query('SELECT id, name, destination, start_date AS "startDate", end_date AS "endDate" FROM trips ORDER BY created_at DESC');
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                destination: row.destination,
                startDate: row.startDate,
                endDate: row.endDate
            }));
        } catch (error) {
            console.error('Error listing trips:', error);
            // Fallback for empty DB connection issues if env vars aren't set yet
            return [];
        }
    },

    getById: async (id) => {
        const result = await getPool().query('SELECT * FROM trips WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;

        // Convert to camelCase where needed by frontend if direct mapping isn't precise
        // But frontend likely expects snake_case for DB columns if they were blindly passed before?
        // Let's check the previous implementation.
        // Previous sql.js return: trip[col] = row[i].
        // So it returned exact DB column names (snake_case).
        // Frontend likely adapts or uses snake_case?
        // Let's keep it snake_case for "raw" fields, but match previous object structure carefully.
        return result.rows[0];
    },

    getPasscodeHash: async (id) => {
        const result = await getPool().query('SELECT passcode_hash FROM trips WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return result.rows[0].passcode_hash;
    }
};

const travelers = {
    create: async (tripId, displayName, email = '', initials = '', color = '', notes = '', isOrganizer = false) => {
        const id = generateId('t');
        const query = `
            INSERT INTO travelers (id, trip_id, display_name, email, initials, color, notes, is_organizer)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [id, tripId, displayName, email, initials, color, notes, isOrganizer];
        const { rows } = await getPool().query(query, values);

        // Map back to camelCase to match previous return value
        const row = rows[0];
        return {
            id: row.id,
            tripId: row.trip_id,
            displayName: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            createdAt: row.created_at
        };
    },

    listByTrip: async (tripId) => {
        const query = `
            SELECT id, display_name, email, initials, color, notes, is_organizer, created_at 
            FROM travelers 
            WHERE trip_id = $1 
            ORDER BY created_at ASC
        `;
        const result = await getPool().query(query, [tripId]);

        return result.rows.map(row => ({
            id: row.id,
            displayName: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            createdAt: row.created_at
        }));
    },

    getById: async (id) => {
        const result = await getPool().query('SELECT * FROM travelers WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            id: row.id,
            tripId: row.trip_id,
            displayName: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    },

    update: async (id, updates) => {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.displayName !== undefined) { fields.push(`display_name = $${idx++}`); values.push(updates.displayName); }
        if (updates.email !== undefined) { fields.push(`email = $${idx++}`); values.push(updates.email); }
        if (updates.initials !== undefined) { fields.push(`initials = $${idx++}`); values.push(updates.initials); }
        if (updates.color !== undefined) { fields.push(`color = $${idx++}`); values.push(updates.color); }
        if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(updates.notes); }
        if (updates.isOrganizer !== undefined) { fields.push(`is_organizer = $${idx++}`); values.push(updates.isOrganizer); } // pg handles boolean

        if (fields.length === 0) return false;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE travelers SET ${fields.join(', ')} WHERE id = $${idx}`;
        await getPool().query(query, values);
        return true;
    },

    delete: async (id) => {
        await getPool().query('DELETE FROM travelers WHERE id = $1', [id]);
        return true;
    }
};

const items = {
    create: async (tripId, type, title, options = {}) => {
        const id = generateId(type.charAt(0));
        const { notes = '', linkUrl = '', startAt = '', endAt = '', status = 'idea', metadata = {} } = options;

        const query = `
            INSERT INTO items (id, trip_id, type, status, title, notes, link_url, start_at, end_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const values = [id, tripId, type, status, title, notes, linkUrl, startAt, endAt, JSON.stringify(metadata)];
        const { rows } = await getPool().query(query, values);
        const row = rows[0];

        return {
            id: row.id,
            tripId: row.trip_id,
            type: row.type,
            status: row.status,
            title: row.title,
            notes: row.notes,
            linkUrl: row.link_url,
            startAt: row.start_at,
            endAt: row.end_at,
            metadata: row.metadata,
            createdAt: row.created_at,
            travelers: []
        };
    },

    listByTrip: async (tripId, type = null) => {
        let query = 'SELECT * FROM items WHERE trip_id = $1';
        const params = [tripId];

        if (type) {
            query += ' AND type = $2';
            params.push(type);
        }

        query += ' ORDER BY start_at ASC, created_at ASC';

        const result = await getPool().query(query, params);

        return result.rows.map(row => ({
            id: row.id,
            tripId: row.trip_id,
            type: row.type,
            status: row.status,
            title: row.title,
            notes: row.notes,
            linkUrl: row.link_url,
            startAt: row.start_at,
            endAt: row.end_at,
            metadata: row.metadata, // pg auto-parses JSONB
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    },

    getById: async (id) => {
        const result = await getPool().query('SELECT * FROM items WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            id: row.id,
            tripId: row.trip_id,
            type: row.type,
            status: row.status,
            title: row.title,
            notes: row.notes,
            linkUrl: row.link_url,
            startAt: row.start_at,
            endAt: row.end_at,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    },

    update: async (id, updates) => {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
        if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(updates.notes); }
        if (updates.linkUrl !== undefined) { fields.push(`link_url = $${idx++}`); values.push(updates.linkUrl); }
        if (updates.startAt !== undefined) { fields.push(`start_at = $${idx++}`); values.push(updates.startAt); }
        if (updates.endAt !== undefined) { fields.push(`end_at = $${idx++}`); values.push(updates.endAt); }
        if (updates.status !== undefined) { fields.push(`status = $${idx++}`); values.push(updates.status); }
        if (updates.metadata !== undefined) { fields.push(`metadata = $${idx++}`); values.push(JSON.stringify(updates.metadata)); }

        if (fields.length === 0) return false;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE items SET ${fields.join(', ')} WHERE id = $${idx}`;
        await getPool().query(query, values);
        return true;
    },

    delete: async (id) => {
        await getPool().query('DELETE FROM items WHERE id = $1', [id]);
        return true;
    }
};

const assignments = {
    assign: async (itemId, travelerId, role = null) => {
        try {
            await getPool().query(
                'INSERT INTO item_travelers (item_id, traveler_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [itemId, travelerId, role]
            );
            return { itemId, travelerId, role, created: true };
        } catch (e) {
            console.error('Assign error:', e);
            return { itemId, travelerId, role, created: false };
        }
    },

    unassign: async (itemId, travelerId) => {
        await getPool().query('DELETE FROM item_travelers WHERE item_id = $1 AND traveler_id = $2', [itemId, travelerId]);
        return true;
    },

    getByItem: async (itemId) => {
        const result = await getPool().query(
            'SELECT traveler_id, role FROM item_travelers WHERE item_id = $1',
            [itemId]
        );
        return result.rows.map(row => ({
            travelerId: row.traveler_id,
            role: row.role
        }));
    },

    getByTraveler: async (travelerId) => {
        const result = await getPool().query(
            'SELECT item_id, role FROM item_travelers WHERE traveler_id = $1',
            [travelerId]
        );
        return result.rows.map(row => ({
            itemId: row.item_id,
            role: row.role
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

