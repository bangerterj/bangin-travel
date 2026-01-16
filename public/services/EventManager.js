/**
 * EventManager
 * Simple Pub/Sub pattern for decoupling components
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).delete(callback);
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in listener for event ${event}:`, error);
            }
        });
    }
}

export const events = new EventManager();
