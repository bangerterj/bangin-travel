/**
 * Database Module - Postgres
 * Handles database initialization, schema, and queries
 */

const { Pool } = require('pg');

let pool;

if (!process.env.POSTGRES_URL) {
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
  is_archived BOOLEAN DEFAULT FALSE,
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
  user_id TEXT,
  couple_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_travelers_trip ON travelers(trip_id);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'transit', 'stay', 'activity')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'planned', 'pending', 'booked', 'dropped')),
  title TEXT NOT NULL,
  notes TEXT,
  link_url TEXT,
  start_at TEXT,
  end_at TEXT,
  metadata JSONB,
  paid_by TEXT REFERENCES travelers(id) ON DELETE SET NULL,
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

-- NextAuth Users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  image TEXT,
  password_hash TEXT
);

-- NextAuth Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

-- NextAuth Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL
);

-- NextAuth Verification Tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'CONTRIBUTOR',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_trip ON invitations(trip_id);

-- Migration logic for existing tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='user_id') THEN
        ALTER TABLE travelers ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travelers' AND column_name='couple_id') THEN
        ALTER TABLE travelers ADD COLUMN couple_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='paid_by') THEN
        ALTER TABLE items ADD COLUMN paid_by TEXT REFERENCES travelers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='is_archived') THEN
        ALTER TABLE trips ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- Airports table
CREATE TABLE IF NOT EXISTS airports (
  id SERIAL PRIMARY KEY,
  name TEXT,
  city TEXT,
  country TEXT,
  iata TEXT,
  icao TEXT,
  latitude FLOAT,
  longitude FLOAT,
  timezone_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata);
CREATE INDEX IF NOT EXISTS idx_airports_search ON airports(name, city, iata);
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

function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

const mapTripRow = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        timezone: row.timezone,
        isArchived: !!row.is_archived,
        role: row.is_organizer !== undefined ? (row.is_organizer ? 'ORGANIZER' : 'CONTRIBUTOR') : undefined
    };
};

const trips = {
    create: async (name, destination = '', startDate = '', endDate = '', timezone = 'UTC') => {
        const id = generateId('trip');
        const query = `
            INSERT INTO trips (id, name, destination, start_date, end_date, timezone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const { rows } = await getPool().query(query, [id, name, destination, startDate, endDate, timezone]);
        return mapTripRow(rows[0]);
    },

    list: async () => {
        try {
            await initDatabase();
            const result = await getPool().query('SELECT id, name, destination, start_date AS "startDate", end_date AS "endDate", is_archived as "isArchived" FROM trips ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Error listing trips:', error);
            return [];
        }
    },

    getById: async (id) => {
        const result = await getPool().query('SELECT * FROM trips WHERE id = $1', [id]);
        return mapTripRow(result.rows[0]);
    },



    getByUserId: async (userId, includeArchived = false) => {
        const query = `
            SELECT t.*, tr.is_organizer 
            FROM trips t
            JOIN travelers tr ON t.id = tr.trip_id
            WHERE tr.user_id = $1 ${includeArchived ? '' : 'AND t.is_archived = FALSE'}
            ORDER BY t.created_at DESC
        `;
        const { rows } = await getPool().query(query, [userId]);
        return rows.map(mapTripRow);
    },

    update: async (id, updates) => {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
        if (updates.destination !== undefined) { fields.push(`destination = $${idx++}`); values.push(updates.destination); }
        if (updates.startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(updates.startDate); }
        if (updates.endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(updates.endDate); }
        if (updates.timezone !== undefined) { fields.push(`timezone = $${idx++}`); values.push(updates.timezone); }

        if (updates.isArchived !== undefined) { fields.push(`is_archived = $${idx++}`); values.push(updates.isArchived); }

        if (fields.length === 0) return false;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE trips SET ${fields.join(', ')} WHERE id = $${idx}`;
        await getPool().query(query, values);
        return true;
    },

    delete: async (id) => {
        // Cascade should handle the rest
        await getPool().query('DELETE FROM trips WHERE id = $1', [id]);
        return true;
    }
};

const travelers = {
    create: async (tripId, displayName, options = {}) => {
        const id = generateId('t');
        const { email = '', initials = '', color = '', notes = '', isOrganizer = false, userId = null, coupleId = null } = options;
        const query = `
            INSERT INTO travelers (id, trip_id, display_name, email, initials, color, notes, is_organizer, user_id, couple_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const { rows } = await getPool().query(query, [id, tripId, displayName, email, initials, color, notes, isOrganizer, userId, coupleId]);
        const row = rows[0];
        return {
            id: row.id,
            tripId: row.trip_id,
            name: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            userId: row.user_id,
            coupleId: row.couple_id,
            createdAt: row.created_at
        };
    },

    updateRoleIfOnlyOne: async (userId) => {
        try {
            await initDatabase();
            // If they are a traveler on a trip where they are the only person, promote them.
            // Or if they are jeffbangerter and have a traveler record that isn't organizer.
            const query = `
                UPDATE travelers 
                SET is_organizer = TRUE 
                WHERE user_id = $1 AND is_organizer = FALSE
            `;
            await getPool().query(query, [userId]);
        } catch (error) {
            console.error('Role fix error:', error);
        }
    },

    listByTrip: async (tripId) => {
        const query = `
            SELECT id, display_name, email, initials, color, notes, is_organizer, user_id, couple_id, created_at 
            FROM travelers 
            WHERE trip_id = $1 
            ORDER BY created_at ASC
        `;
        const result = await getPool().query(query, [tripId]);
        return result.rows.map(row => ({
            id: row.id,
            name: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            userId: row.user_id,
            coupleId: row.couple_id,
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
            name: row.display_name,
            email: row.email,
            initials: row.initials,
            color: row.color,
            notes: row.notes,
            isOrganizer: row.is_organizer,
            userId: row.user_id,
            coupleId: row.couple_id,
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
        if (updates.isOrganizer !== undefined) { fields.push(`is_organizer = $${idx++}`); values.push(updates.isOrganizer); }
        if (updates.coupleId !== undefined) { fields.push(`couple_id = $${idx++}`); values.push(updates.coupleId); }

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
    },

    isMember: async (tripId, userId) => {
        const query = 'SELECT 1 FROM travelers WHERE trip_id = $1 AND user_id = $2';
        const { rows } = await getPool().query(query, [tripId, userId]);
        return rows.length > 0;
    }
};

const items = {
    create: async (tripId, type, title, options = {}) => {
        const id = generateId(type.charAt(0));
        const { notes = '', linkUrl = '', startAt = '', endAt = '', status = 'idea', metadata = {}, paidBy = null } = options;
        const query = `
            INSERT INTO items (id, trip_id, type, status, title, notes, link_url, start_at, end_at, metadata, paid_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const { rows } = await getPool().query(query, [id, tripId, type, status, title, notes, linkUrl, startAt, endAt, JSON.stringify(metadata), paidBy]);
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
            createdAt: row.created_at,
            // Standardized Cost Object
            cost: {
                amount: row.metadata?.cost?.amount || 0,
                currency: row.metadata?.cost?.currency || 'USD',
                perNight: row.metadata?.cost?.perNight || 0,
                paidBy: row.paid_by
            },
            // Metadata (excluding cost if we want to be clean, but keeping it inside metadata is fine for now, just exposing standardized cost)
            metadata: row.metadata,
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
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            cost: {
                amount: row.metadata?.cost?.amount || 0,
                currency: row.metadata?.cost?.currency || 'USD',
                perNight: row.metadata?.cost?.perNight || 0,
                paidBy: row.paid_by
            },
            metadata: row.metadata
        }));
    },

    getById: async (id) => {
        const result = await getPool().query('SELECT * FROM items WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        const metadata = row.metadata || {};
        if (metadata.cost) {
            metadata.cost.paidBy = row.paid_by;
        }

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
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            cost: {
                amount: metadata.cost?.amount || 0,
                currency: metadata.cost?.currency || 'USD',
                perNight: metadata.cost?.perNight || 0,
                paidBy: row.paid_by
            },
            paidBy: row.paid_by,
            metadata: metadata
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
        if (updates.paidBy !== undefined) { fields.push(`paid_by = $${idx++}`); values.push(updates.paidBy); }

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
        await getPool().query(
            'INSERT INTO item_travelers (item_id, traveler_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [itemId, travelerId, role]
        );
        return { itemId, travelerId, role, created: true };
    },

    unassign: async (itemId, travelerId) => {
        await getPool().query('DELETE FROM item_travelers WHERE item_id = $1 AND traveler_id = $2', [itemId, travelerId]);
        return true;
    },

    getByItem: async (itemId) => {
        const result = await getPool().query('SELECT traveler_id, role FROM item_travelers WHERE item_id = $1', [itemId]);
        return result.rows.map(row => ({ travelerId: row.traveler_id, role: row.role }));
    },

    updateForItem: async (itemId, travelerIds) => {
        const client = await getPool().connect();
        try {
            await client.query('BEGIN');
            // Remove existing assignments
            await client.query('DELETE FROM item_travelers WHERE item_id = $1', [itemId]);
            // Add new assignments
            if (travelerIds && Array.isArray(travelerIds)) {
                for (const travelerId of travelerIds) {
                    await client.query(
                        'INSERT INTO item_travelers (item_id, traveler_id) VALUES ($1, $2)',
                        [itemId, travelerId]
                    );
                }
            }
            await client.query('COMMIT');
            return true;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
};

const invitations = {
    create: async (tripId, email, role = 'CONTRIBUTOR') => {
        const secureToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const query = `
            INSERT INTO invitations (trip_id, email, token, role, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
            RETURNING *
        `;
        const { rows } = await getPool().query(query, [tripId, email, secureToken, role]);
        return rows[0];
    },

    getByToken: async (token) => {
        const { rows } = await getPool().query('SELECT * FROM invitations WHERE token = $1 AND expires_at > NOW()', [token]);
        return rows[0];
    },

    updateStatus: async (token, status) => {
        const { rows } = await getPool().query('UPDATE invitations SET status = $1 WHERE token = $2 RETURNING *', [status, token]);
        return rows[0];
    }
};

const users = {
    getByEmail: async (email) => {
        const { rows } = await getPool().query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        return rows[0];
    },
    getById: async (id) => {
        const { rows } = await getPool().query('SELECT * FROM users WHERE id = $1', [id]);
        return rows[0];
    },
    setPassword: async (userId, passwordHash) => {
        await getPool().query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
        return true;
    }
};

module.exports = {
    getPool,
    initDatabase,
    generateId,
    trips,
    travelers,
    items,
    assignments,
    invitations,
    users,
    airports: {
        search: async (query) => {
            if (!query || query.length < 2) return [];
            const term = `%${query}%`;
            // Prioritize IATA match
            const sql = `
                SELECT * FROM airports 
                WHERE iata ILIKE $1 OR city ILIKE $1 OR name ILIKE $1
                ORDER BY 
                  CASE WHEN iata ILIKE $1 THEN 0 ELSE 1 END,
                  LENGTH(name) ASC
                LIMIT 10
            `;
            const { rows } = await getPool().query(sql, [term]);
            return rows;
        },
        getByIata: async (iata) => {
            const { rows } = await getPool().query('SELECT * FROM airports WHERE iata = $1', [iata.toUpperCase()]);
            return rows[0];
        }
    },
    query: (text, params) => getPool().query(text, params)
};
