/**
 * TripService
 * Centralized API handling
 */

export const TripService = {
    async fetchJSON(url, options = {}) {
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    ...options.headers
                }
            });

            if (res.status === 401 || res.status === 403) {
                // If unauthorized, redirect to login or handle session expiry
                console.warn('Unauthorized access', res.status);
                // In a perfect world we might trigger an auth event here
                if (!window.location.pathname.startsWith('/auth')) {
                    // window.location.href = '/api/auth/signin'; // Let app handle it gracefully
                }
            }

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`API Error ${res.status}: ${errorText}`);
            }

            // Return JSON if content-type is json, else null (for 204)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await res.json();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    async getTrip(tripId) {
        return this.fetchJSON(`/api/trips/${tripId}`);
    },

    async deleteTrip(tripId) {
        return this.fetchJSON(`/api/trips/${tripId}`, {
            method: 'DELETE'
        });
    },

    async createItem(tripId, data) {
        // Data should be: { type, title, ... }
        return this.fetchJSON(`/api/trips/${tripId}/items`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateItem(itemId, data) {
        return this.fetchJSON(`/api/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteItem(itemId) {
        return this.fetchJSON(`/api/items/${itemId}`, {
            method: 'DELETE'
        });
    },

    async createTraveler(tripId, data) {
        return this.fetchJSON(`/api/trips/${tripId}/travelers`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTraveler(travelerId, data) {
        return this.fetchJSON(`/api/travelers/${travelerId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteTraveler(travelerId) {
        return this.fetchJSON(`/api/travelers/${travelerId}`, {
            method: 'DELETE'
        });
    },

    async searchAirports(query) {
        return this.fetchJSON(`/api/airports/search?q=${encodeURIComponent(query)}`);
    },

    async calculateDuration(data) {
        return this.fetchJSON('/api/flights/calculate-duration', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async parseImage(formData) {
        // Needs custom handling for FormData (no json header)
        const res = await fetch('/api/parse/image', {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Failed to parse image');
        return await res.json();
    }
};
