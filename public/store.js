/**
 * Bangin' Travel - Data Store
 * Manages application state and data persistence with multi-trip support
 */

const STORAGE_KEY = 'bangin_travel_data';

// Default empty trip template
const EMPTY_TRIP = {
  id: '',
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  password: 'travel', // Default trip password
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
    organizerPassword: 'travel',  // Global/Creation password
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
    return this.data;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data;
  },

  // Password methods
  verifyPassword(password) {
    return password === this.data.config.organizerPassword;
  },

  setUnlocked(unlocked) {
    // This is mainly for the "Global" unlock to allow creation
    this.data.config.isGlobalUnlocked = unlocked;
    this.save();
  },

  isGlobalUnlocked() {
    return this.data.config.isGlobalUnlocked;
  },

  verifyTripPassword(tripId, password) {
    const trip = this.data.trips.find(t => t.id === tripId);
    return trip && trip.password === password;
  },

  unlockTrip(tripId) {
    if (!this.data.config.unlockedTripIds) this.data.config.unlockedTripIds = [];
    if (!this.data.config.unlockedTripIds.includes(tripId)) {
      this.data.config.unlockedTripIds.push(tripId);
      this.save();
    }
  },

  isTripUnlocked(tripId) {
    if (!this.data.config.unlockedTripIds) return false;
    return this.data.config.unlockedTripIds.includes(tripId);
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

  createTrip(tripData) {
    const newTrip = {
      ...JSON.parse(JSON.stringify(EMPTY_TRIP)),
      id: this.generateId(),
      name: tripData.name,
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      password: tripData.password || this.data.config.organizerPassword,
      timezone: tripData.timezone || 'UTC'
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
  addItem(type, item) {
    const trip = this.getActiveTrip();
    if (!trip) return null;

    if (!trip[type]) trip[type] = [];

    const newItem = {
      ...item,
      id: type + '-' + Date.now().toString(36)
    };

    trip[type].push(newItem);
    this.save();
    return newItem;
  },

  updateItem(type, item) {
    const trip = this.getActiveTrip();
    if (!trip) return false;

    if (!trip[type]) return false;

    const index = trip[type].findIndex(i => i.id === item.id);
    if (index === -1) return false;

    trip[type][index] = { ...item };
    this.save();
    return true;
  },

  deleteItem(type, itemId) {
    const trip = this.getActiveTrip();
    if (!trip) return false;

    if (!trip[type]) return false;

    const index = trip[type].findIndex(i => i.id === itemId);
    if (index === -1) return false;

    trip[type].splice(index, 1);
    this.save();
    return true;
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