/**
 * Bangin' Travel - Data Store
 * Manages application state and data persistence with multi-trip support
 */

import { TripService } from './services/TripService.js';

const STORAGE_KEY = 'bangin_travel_data';

// Default empty trip template
const EMPTY_TRIP = {
  id: '',
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  timezone: 'UTC',
  coverImage: null,
  travelers: [],
  flights: [],
  stays: [],
  transit: [],
  activities: []
};

// Sample trip data for new installations
const SAMPLE_TRIP = {
  id: 'japan-2026',
  name: 'Japan 2026',
  destination: 'Tokyo & Nagano',
  startDate: '2026-03-18',
  endDate: '2026-04-01',
  timezone: 'Asia/Tokyo',
  coverImage: null,
  travelers: [
    { id: 't1', name: 'Alex Smith', email: 'alex@email.com', initials: 'AS', color: '#3498db', isOrganizer: true },
    { id: 't2', name: 'Sam Johnson', email: 'sam@email.com', initials: 'SJ', color: '#e74c3c', isOrganizer: false },
    { id: 't3', name: 'Jake Williams', email: 'jake@email.com', initials: 'JW', color: '#2ecc71', isOrganizer: false },
    { id: 't4', name: 'Maya Chen', email: 'maya@email.com', initials: 'MC', color: '#9b59b6', isOrganizer: false }
  ],
  flights: [
    { id: 'f1', type: 'departure', airline: 'United Airlines', flightNumber: 'UA 837', departureAirport: 'SLC', departureCity: 'Salt Lake City', arrivalAirport: 'NRT', arrivalCity: 'Tokyo Narita', departureTime: '2026-03-18T06:30:00', arrivalTime: '2026-03-19T15:15:00', travelers: ['t1', 't2', 't3', 't4'], confirmationCode: 'ABC123XY', notes: '' },
    { id: 'f2', type: 'return', airline: 'Delta', flightNumber: 'DL 295', departureAirport: 'NRT', departureCity: 'Tokyo Narita', arrivalAirport: 'SLC', arrivalCity: 'Salt Lake City', departureTime: '2026-04-01T17:30:00', arrivalTime: '2026-04-01T14:45:00', travelers: ['t1', 't2', 't3', 't4'], confirmationCode: 'DL789012', notes: '' }
  ],
  stays: [
    { id: 's1', type: 'hotel', name: 'Shinjuku Granbell Hotel', address: '2-14-5 Kabukicho, Shinjuku, Tokyo', coordinates: { lat: 35.6938, lng: 139.7034 }, checkIn: '2026-03-19T15:00:00', checkOut: '2026-03-25T11:00:00', travelers: ['t1', 't2', 't3', 't4'], confirmationCode: 'GRAN-2026-1234', amenities: ['wifi', 'breakfast'], cost: { amount: 720, currency: 'USD', perNight: 120 }, notes: '' },
    { id: 's2', type: 'hotel', name: 'Park Hyatt Tokyo', address: '3-7-1-2 Nishi-Shinjuku, Tokyo', coordinates: { lat: 35.6867, lng: 139.6912 }, checkIn: '2026-03-25T15:00:00', checkOut: '2026-04-01T12:00:00', travelers: ['t1', 't2', 't3', 't4'], confirmationCode: 'HYATT-2026-7890', amenities: ['wifi', 'pool', 'spa'], cost: { amount: 2800, currency: 'USD', perNight: 400 }, notes: '' }
  ],
  transit: [
    { id: 'tr1', type: 'train', name: 'Narita Express to Shinjuku', route: 'Narita Airport → Shinjuku Station', departureLocation: 'Narita Airport', departureCoordinates: { lat: 35.7720, lng: 140.3929 }, arrivalLocation: 'Shinjuku Station', arrivalCoordinates: { lat: 35.6896, lng: 139.7006 }, departureTime: '2026-03-19T16:00:00', arrivalTime: '2026-03-19T17:30:00', travelers: ['t1', 't2', 't3', 't4'], reservationRequired: true, confirmationCode: '', ticketType: 'JR Pass', cost: { amount: 0, currency: 'JPY' }, notes: '' }
  ],
  activities: [
    { id: 'a1', type: 'sightseeing', name: 'Senso-ji Temple', location: 'Asakusa, Tokyo', coordinates: { lat: 35.7148, lng: 139.7967 }, startTime: '2026-03-20T10:00:00', endTime: '2026-03-20T12:00:00', travelers: ['t1', 't2', 't3', 't4'], reservationRequired: false, confirmationCode: '', cost: { amount: 0, currency: 'JPY' }, priority: 'must-do', notes: '', links: [] },
    { id: 'a2', type: 'tour', name: 'TeamLab Borderless', location: 'Azabudai Hills, Tokyo', coordinates: { lat: 35.6617, lng: 139.7413 }, startTime: '2026-03-21T10:00:00', endTime: '2026-03-21T14:00:00', travelers: ['t1', 't2', 't3', 't4'], reservationRequired: true, confirmationCode: 'TL-2026-5678', cost: { amount: 4600, currency: 'JPY' }, priority: 'must-do', notes: '', links: [] }
  ],
  password: 'travel'
};

const DEFAULT_DATA = {
  config: {
    unlockedTripIds: [],          // Trips unlocked in this session
    activeTripId: null,
    activeTab: 'summary'
  },
  trips: [SAMPLE_TRIP]
};

export const store = {
  data: null,

  init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migration: check if old format (single trip) or new format (trips array)
        if (parsed.trips) {
          this.data = parsed;
        } else if (parsed.trip) {
          // Migrate old format to new format
          const oldTrip = {
            ...parsed.trip,
            travelers: parsed.travelers || [],
            flights: parsed.flights || [],
            stays: parsed.stays || [],
            transit: parsed.transit || [],
            activities: parsed.activities || []
          };
          this.data = {
            config: {
              organizerPassword: 'travel',
              isUnlocked: false,
              activeTripId: oldTrip.id,
              unlockedTripIds: [oldTrip.id],
              activeTab: parsed.config?.activeTab || 'summary'
            },
            trips: [oldTrip]
          };
          this.save();
        } else {
          // Invalid data, use defaults
          this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
          this.save();
        }
        // Ensure config exists
        if (!this.data.config) {
          this.data.config = { ...DEFAULT_DATA.config };
        }
      } catch (e) {
        console.warn('Failed to parse stored data, using defaults');
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.save();
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this.save();
    }
    // Initialize session check
    this.checkSession();
    return this.data;
  },

  async checkSession() {
    if (this._checkingSession) return this._checkingSession;

    this._checkingSession = (async () => {
      try {
        const session = await TripService.fetchJSON('/api/auth/session');
        if (session && Object.keys(session).length > 0) {
          this.session = session;
          await this.fetchTrips();
        } else {
          this.session = null;
        }
        return this.session;
      } catch (e) {
        console.error('Failed to check session', e);
        this.session = null;
      } finally {
        this._checkingSession = null;
      }
    })();

    return this._checkingSession;
  },

  async fetchTrips(includeArchived = false) {
    if (!this.session) return;
    try {
      const url = includeArchived ? '/api/trips?includeArchived=true' : '/api/trips';
      const data = await TripService.fetchJSON(url);
      if (data && data.trips) {
        // Flatten metadata for UI consumption
        this.data.trips = data.trips.map(trip => this.flattenTrip(trip));
        if (!this.data.config.activeTripId && data.trips.length > 0) {
          this.data.config.activeTripId = data.trips[0].id;
        }
        this.save();
      }
    } catch (e) {
      console.error('Failed to fetch trips', e);
    }
  },

  // Helper to flatten metadata into top-level properties for UI consumption
  flattenTrip(trip) {
    const flatten = (items) => (items || []).map(item => {
      const flattened = {
        ...item,
        ...(item.metadata || {}),
        name: item.metadata?.name || item.name || item.title // Fallback to title
      };

      // Ensure item.cost (which is fully constructed in lib/db.js) isn't 
      // overshadowed by an incomplete item.metadata.cost
      if (item.cost && item.metadata?.cost) {
        flattened.cost = { ...item.cost, ...item.metadata.cost };
      }

      return flattened;
    });

    return {
      ...trip,
      flights: flatten(trip.flights),
      stays: flatten(trip.stays),
      transit: flatten(trip.transit),
      activities: flatten(trip.activities)
    };
  },

  getSession() {
    return this.session;
  },

  needsName() {
    return this.session && this.session.user && !this.session.user.name;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data;
  },

  // Trip management
  getTrips() {
    return this.data.trips || [];
  },

  getActiveTrip() {
    const tripId = this.data.config.activeTripId;
    if (!tripId) return null;
    return this.data.trips.find(t => t.id === tripId) || null;
  },

  setActiveTrip(tripId) {
    this.data.config.activeTripId = tripId;
    this.save();
  },

  async createTrip(tripData) {
    if (this.session) {
      try {
        const newTrip = await TripService.fetchJSON('/api/trips', {
          method: 'POST',
          body: JSON.stringify({
            name: tripData.name,
            destination: tripData.destination,
            startDate: tripData.startDate,
            endDate: tripData.endDate,
            timezone: tripData.timezone || 'UTC',
            location: tripData.location || null
          })
        });
        if (newTrip) {
          await this.fetchTrips();
          this.data.config.activeTripId = newTrip.id;
          this.save();
          return newTrip;
        }
      } catch (e) {
        console.error('API create trip failed', e);
      }
    }

    const newTrip = {
      ...JSON.parse(JSON.stringify(EMPTY_TRIP)),
      id: this.generateId(),
      name: tripData.name,
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      timezone: tripData.timezone || 'UTC',
      location: tripData.location || null
    };
    this.data.trips.push(newTrip);
    this.data.config.activeTripId = newTrip.id;
    this.save();
    return newTrip;
  },

  generateId() {
    return 'trip-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  },

  // Generic CRUD
  async addItem(type, itemData) {
    const trip = this.getActiveTrip();
    if (!trip) return null;

    const collectionKey = type === 'transit' ? 'transit' : type + 's';

    if (this.session) {
      try {
        const newItem = await TripService.createItem(trip.id, { type, ...itemData });
        if (newItem) {
          // Flatten new item
          const flatItem = {
            ...newItem,
            ...(newItem.metadata || {}),
            name: newItem.metadata?.name || newItem.name || newItem.title
          };

          if (!trip[collectionKey]) trip[collectionKey] = [];
          trip[collectionKey].push(flatItem);
          this.save();
          return flatItem;
        }
      } catch (e) {
        console.error(`API addItem failed for ${type}`, e);
      }
    }

    // Fallback to local
    const newItem = {
      ...itemData,
      id: type.charAt(0) + '-' + Date.now().toString(36)
    };
    if (!trip[collectionKey]) trip[collectionKey] = [];
    trip[collectionKey].push(newItem);
    this.save();
    return newItem;
  },

  async updateItem(type, itemData) {
    const trip = this.getActiveTrip();
    if (!trip) return false;

    const collectionKey = type === 'transit' ? 'transit' : type + 's';

    if (this.session) {
      try {
        const updatedItem = await TripService.updateItem(itemData.id, itemData);
        if (updatedItem) {
          // Flatten updated item
          const flatItem = {
            ...updatedItem,
            ...(updatedItem.metadata || {}),
            name: updatedItem.metadata?.name || updatedItem.name || updatedItem.title
          };

          const items = trip[collectionKey];
          const idx = items.findIndex(i => i.id === itemData.id);
          if (idx !== -1) {
            items[idx] = flatItem;
            // Force refresh skipped to avoid stale reads; trust API response
            this.save();
            return true;
          }
        }
      } catch (e) {
        console.error(`API updateItem failed for ${type}`, e);
      }
    }

    // Local fallback
    const items = trip[collectionKey];
    if (!items) return false;
    const index = items.findIndex(i => i.id === itemData.id);
    if (index === -1) return false;

    // IMPORTANT: Flatten metadata for UI compatibility
    // itemData comes with nested metadata from app.js cleanup, but UI expects top-level keys
    // We must be careful not to lose top-level paidBy if it's explicitly passed
    const flatItem = {
      ...itemData,
      ...(itemData.metadata || {}),
      paidBy: itemData.paidBy !== undefined ? itemData.paidBy : (itemData.metadata?.cost?.paidBy || items[index].paidBy)
    };

    items[index] = flatItem;
    this.save();
    return true;
  },

  async deleteItem(type, itemId) {
    console.log('[DELETE] Starting deletion:', { type, itemId });
    const trip = this.getActiveTrip();
    if (!trip) {
      console.error('[DELETE] No active trip found');
      return false;
    }

    // Determine collection key: most types are already plural (e.g., 'flights'), but 'transit' is singular
    let collectionKey;
    if (type === 'transit') {
      collectionKey = 'transit';
    } else if (type.endsWith('s')) {
      collectionKey = type; // already plural
    } else {
      collectionKey = type + 's'; // fallback for singular types
    }
    console.log('[DELETE] Collection key:', collectionKey);

    if (this.session) {
      try {
        console.log('[DELETE] Making API call to /api/items/' + itemId);
        await TripService.deleteItem(itemId);

        // Success (no error thrown) - manually remove from local store
        const items = trip[collectionKey];
        if (items) {
          const index = items.findIndex(i => i.id === itemId);
          if (index !== -1) items.splice(index, 1);
        }

        this.save();
        return true;

      } catch (e) {
        console.error(`[DELETE] API deleteItem failed for ${type}`, e);
        return false;
      }
    } else {
      console.log('[DELETE] No session, using local fallback');
      const items = trip[collectionKey];
      if (!items) return false;
      const index = items.findIndex(i => i.id === itemId);
      if (index === -1) return false;
      items.splice(index, 1);
      this.save();
      return true;
    }
  },

  async addTraveler(travelerData) {
    const trip = this.getActiveTrip();
    if (!trip) return null;

    if (this.session) {
      try {
        const newTraveler = await TripService.createTraveler(trip.id, travelerData);
        if (newTraveler) {
          if (!trip.travelers) trip.travelers = [];
          trip.travelers.push(newTraveler);
          this.save();
          return newTraveler;
        }
      } catch (e) {
        console.error('API addTraveler failed', e);
        throw e; // Re-throw so handleSave can catch it
      }
    }

    // Fallback to local
    const newTraveler = {
      ...travelerData,
      id: 't-' + Date.now().toString(36),
      initials: travelerData.name ? travelerData.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'
    };
    if (!trip.travelers) trip.travelers = [];
    trip.travelers.push(newTraveler);
    this.save();
    return newTraveler;
  },

  async updateTraveler(travelerData) {
    const trip = this.getActiveTrip();
    if (!trip) return false;

    if (this.session) {
      try {
        const updated = await TripService.updateTraveler(travelerData.id, travelerData);
        if (updated) {
          const idx = trip.travelers.findIndex(t => t.id === travelerData.id);
          if (idx !== -1) {
            trip.travelers[idx] = updated;
            this.save();
            return true;
          }
        }
      } catch (e) {
        console.error('API updateTraveler failed', e);
        throw e; // Re-throw so handleSave can catch it
      }
    }

    const index = trip.travelers.findIndex(t => t.id === travelerData.id);
    if (index === -1) return false;
    trip.travelers[index] = { ...trip.travelers[index], ...travelerData };
    this.save();
    return true;
  },

  async deleteTraveler(travelerId) {
    const trip = this.getActiveTrip();
    if (!trip) return false;

    if (this.session) {
      try {
        await TripService.deleteTraveler(travelerId);
        trip.travelers = trip.travelers.filter(t => t.id !== travelerId);
        this.save();
        return true;
      } catch (e) {
        console.error('API deleteTraveler failed', e);
        throw e;
      }
    }

    // Local
    trip.travelers = trip.travelers.filter(t => t.id !== travelerId);
    this.save();
    return true;
  },

  getLedger() {
    const trip = this.getActiveTrip();
    if (!trip) return null;

    const travelers = trip.travelers;
    const allItems = [
      ...(trip.flights || []),
      ...(trip.stays || []),
      ...(trip.transit || []),
      ...(trip.activities || [])
    ];

    const balances = {}; // travelerId -> balance (positive means they are owed money)
    travelers.forEach(t => balances[t.id] = 0);

    let totalTripCost = 0;

    allItems.forEach(item => {
      // Handle different cost structures
      let cost = 0;
      if (typeof item.cost === 'number') cost = item.cost;
      else if (item.cost && typeof item.cost.amount === 'number') cost = item.cost.amount;
      else if (item.metadata?.cost) {
        const metacost = item.metadata.cost;
        cost = typeof metacost === 'number' ? metacost : parseFloat(metacost.amount || metacost || 0);
      }

      if (isNaN(cost) || cost <= 0) return;

      totalTripCost += cost;

      const paidBy = item.paidBy;
      const assignedTravelerIds = item.travelers || [];

      if (!paidBy || assignedTravelerIds.length === 0) return;

      if (balances[paidBy] !== undefined) {
        balances[paidBy] += cost;
      }

      const splitAmount = cost / assignedTravelerIds.length;
      assignedTravelerIds.forEach(tId => {
        if (balances[tId] !== undefined) {
          balances[tId] -= splitAmount;
        }
      });
    });

    // Simplify debts using a greedy algorithm
    const creditors = [];
    const debtors = [];

    Object.keys(balances).forEach(tId => {
      const bal = balances[tId];
      if (bal > 0.01) creditors.push({ id: tId, amount: bal });
      else if (bal < -0.01) debtors.push({ id: tId, amount: -bal });
    });

    const debts = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      debts.push({ from: debtor.id, to: creditor.id, amount });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return {
      totalCost: totalTripCost,
      balances,
      debts,
      travelers
    };
  },

  // Tab state
  setActiveTab(tab) {
    this.data.config.activeTab = tab;
    this.save();
  },

  // Helper methods for active trip
  getTravelerById(id) {
    const trip = this.getActiveTrip();
    if (!trip) return null;
    return trip.travelers.find(t => t.id === id);
  },

  getTravelersByIds(ids) {
    return ids.map(id => this.getTravelerById(id)).filter(Boolean);
  },

  getFlightsByType(type) {
    const trip = this.getActiveTrip();
    if (!trip) return [];
    return trip.flights.filter(f => f.type === type);
  },

  getEventsForDate(date) {
    const trip = this.getActiveTrip();
    if (!trip) return [];

    const dateStr = new Date(date).toDateString();
    const events = [];

    // Check flights
    trip.flights.forEach(f => {
      const depDate = new Date(f.departureTime).toDateString();
      const arrDate = new Date(f.arrivalTime).toDateString();
      if (depDate === dateStr || arrDate === dateStr) {
        events.push({ type: 'flight', data: f });
      }
    });

    // Check stays
    trip.stays.forEach(s => {
      const checkInDate = new Date(s.checkIn).toDateString();
      const checkOutDate = new Date(s.checkOut).toDateString();
      if (checkInDate === dateStr) {
        events.push({ type: 'stay-checkin', data: s });
      }
      if (checkOutDate === dateStr) {
        events.push({ type: 'stay-checkout', data: s });
      }
    });

    // Check transit
    trip.transit.forEach(t => {
      const transitDate = new Date(t.departureTime).toDateString();
      if (transitDate === dateStr) {
        events.push({ type: 'transit', data: t });
      }
    });

    // Check activities
    trip.activities.forEach(a => {
      const activityDate = new Date(a.startTime).toDateString();
      if (activityDate === dateStr) {
        events.push({ type: 'activity', data: a });
      }
    });

    // Sort by time
    events.sort((a, b) => {
      const timeA = new Date(a.data.departureTime || a.data.startTime || a.data.checkIn).getTime();
      const timeB = new Date(b.data.departureTime || b.data.startTime || b.data.checkIn).getTime();
      return timeA - timeB;
    });

    return events;
  },

  isDateInTrip(date) {
    const trip = this.getActiveTrip();
    if (!trip) return false;
    const d = new Date(date);
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return d >= start && d <= end;
  },

  getTripDuration() {
    const trip = this.getActiveTrip();
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
};