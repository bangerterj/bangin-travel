const STORAGE_KEY = 'bangin_travel_data';
const DEFAULT_DATA = {
    trip: { name: "Japan 2026", dates: "March 18 - April 1, 2026", destination: "Tokyo & Nagano", organizer: "Alex Smith", timezone: "GMT+9", startDate: "2026-03-18", endDate: "2026-04-01" },
    itinerary: [], suggestions: [], config: { role: 'guest', activeTab: 'summary' }
};
export const store = {
    data: null,
    init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) { this.data = JSON.parse(stored); } else { this.data = JSON.parse(JSON.stringify(DEFAULT_DATA)); this.save(); }
        return this.data;
    },
    save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },
    setRole(role) { this.data.config.role = role; this.save(); },
    setActiveTab(tab) { this.data.config.activeTab = tab; this.save(); }
};