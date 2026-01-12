/**
 * Bangin' Travel - Main Application
 * Group trip coordination tool with multi-trip support
 */

import { store } from './store.js';
import { renderSummary, renderTravelerForm } from './components/summary.js';
import { renderCalendar } from './components/calendar.js';
import { renderFlights, renderFlightForm } from './components/flights.js';
import { renderStays, renderStayForm } from './components/stays.js';
import { renderTransit, renderTransitForm } from './components/transit.js';
import { renderActivities, renderActivityForm } from './components/activities.js';
import { renderTripSelector, renderPasswordModal, renderTripSetupForm, renderTripSwitcher } from './components/trips.js';

class App {
    constructor() {
        this.data = store.init();
        this.cacheDOM();
        this.bindEvents();
        this.render();
    }

    cacheDOM() {
        this.views = {
            trips: document.getElementById('trips-view'),
            dashboard: document.getElementById('dashboard-view')
        };
        this.tripsContainer = document.getElementById('trips-container');
        this.tripSwitcherContainer = document.getElementById('trip-switcher-container');
        this.tabPanes = {
            summary: document.getElementById('tab-summary'),
            calendar: document.getElementById('tab-calendar'),
            flights: document.getElementById('tab-flights'),
            stays: document.getElementById('tab-stays'),
            transit: document.getElementById('tab-transit'),
            activities: document.getElementById('tab-activities')
        };
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.modalOverlay = document.getElementById('modal-container');
        this.modalBody = document.getElementById('modal-body');
        this.modalClose = document.querySelector('.modal-close');
    }

    bindEvents() {
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                if (target) this.switchTab(target);
            });
        });
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeModal());
        }
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) this.closeModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Drag and Drop for Screenshots
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.modalOverlay.style.border = '4px dashed var(--accent-blue)';
        });
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.modalOverlay.style.border = 'none';
        });
        document.addEventListener('drop', (e) => this.handleDrop(e));

        // Paste support for Screenshots
        document.addEventListener('paste', (e) => this.handlePaste(e));

        // Logo click navigation
        const logo = document.querySelector('.brand');
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', () => {
                store.setActiveTrip(null);
                this.render();
            });
        }
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('trip-switcher-dropdown');
            const toggle = document.getElementById('trip-switcher-toggle');
            if (dropdown && !dropdown.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    async handleDrop(e) {
        e.preventDefault();
        this.modalOverlay.style.border = 'none';

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        this.handleImageFile(files[0]);
    }

    async handlePaste(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                this.handleImageFile(file);
                // Prevent pasting the image into inputs if any are focused (optional, but good)
                // e.preventDefault(); 
                return;
            }
        }
    }

    async handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('Please use an image file (screenshot).');
            return;
        }

        // Allow parsing even without a trip (for testing)
        const trip = store.getActiveTrip();
        if (!trip) {
            console.log('No trip active, but proceeding with parse for demo purposes.');
        }

        this.showToast('✨ Analyzing screenshot with Gemini...');

        try {
            const base64 = await this.fileToBase64(file);
            const result = await this.uploadImage(base64);

            if (result.error) throw new Error(result.details || result.error);

            const data = result.data;
            this.showToast(`Found ${data.type}: ${data.title}`);

            // Map API response to our internal format
            const mappedData = this.mapScannedData(data);

            // Switch to relevant tab and open modal
            const typeMap = {
                'flight': 'flights',
                'stay': 'stays',
                'transit': 'transit',
                'activity': 'activities'
            };
            const tab = typeMap[data.type] || 'summary';

            // Force tab switch if needed (only if we have a trip context to switch tabs in)
            if (trip && this.tabPanes[tab]) {
                this.switchTab(tab);
            }

            // Open modal with pre-filled data
            this.openEntityModal(typeMap[data.type], mappedData);

        } catch (error) {
            console.error(error);
            this.showToast(`Error: ${error.message || 'Failed to parse image'}`, 5000);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async uploadImage(base64Image) {
        const response = await fetch('/api/parse/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        return await response.json();
    }

    mapScannedData(data) {
        // Transform Gemini response to match our component schemas
        const base = {
            name: data.title, // 'title' from AI -> 'name' in most internal schemas
            title: data.title, // Fallback
            notes: data.notes || '',
            // Try to map times
            startAt: data.startAt,
            endAt: data.endAt
        };

        // Type specific mapping
        if (data.type === 'flight') {
            const meta = data.metadata || {};
            return {
                ...base,
                type: 'departure', // default to outbound
                airline: meta.airline || data.title, // fallback
                flightNumber: meta.flightNumber || '',
                departureAirport: meta.departureAirport || '',
                departureCity: '', // AI often misses city vs airport
                arrivalAirport: meta.arrivalAirport || '',
                arrivalCity: '',
                departureTime: data.startAt,
                arrivalTime: data.endAt,
                confirmationCode: meta.confirmationCode || ''
            };
        }

        if (data.type === 'stay') {
            const meta = data.metadata || {};

            // Auto-detect subtype (hotel, airbnb, etc)
            let stayType = 'hotel';
            const textContent = (data.title + ' ' + (data.notes || '')).toLowerCase();
            if (textContent.includes('airbnb')) stayType = 'airbnb';
            else if (textContent.includes('hostel')) stayType = 'hostel';
            else if (textContent.includes('ryokan')) stayType = 'ryokan';

            return {
                ...base,
                type: stayType,
                address: meta.address || '',
                checkIn: data.startAt,
                checkOut: data.endAt,
                confirmationCode: meta.confirmationCode || ''
            };
        }

        return base;
    }

    switchTab(tabId) {
        store.setActiveTab(tabId);
        this.renderTabs();
    }

    render() {
        const activeTrip = store.getActiveTrip();

        if (!activeTrip) {
            // Show trip selector
            this.showView('trips');
            this.renderTripSelector();
        } else {
            // Show dashboard
            this.showView('dashboard');
            this.updatePageTitle();
            this.renderTripSwitcher();
            this.renderTabs();
        }
    }

    showView(viewName) {
        Object.keys(this.views).forEach(v => {
            if (this.views[v]) {
                this.views[v].classList.toggle('hidden', v !== viewName);
            }
        });
    }

    updatePageTitle() {
        const trip = store.getActiveTrip();
        if (trip) {
            document.title = `Bangin' Travel | ${trip.name}`;
        } else {
            document.title = `Bangin' Travel`;
        }
    }

    renderTripSelector() {
        renderTripSelector(this.tripsContainer, store, {
            onSelectTrip: (tripId) => {
                if (store.isTripUnlocked(tripId)) {
                    store.setActiveTrip(tripId);
                    this.render();
                } else {
                    const trip = store.getTrips().find(t => t.id === tripId);
                    this.openModal(renderPasswordModal(trip.name));
                    this.bindPasswordForm(tripId);
                }
            },
            onCreateNew: () => {
                this.openModal(renderPasswordModal());
                this.bindPasswordForm(null); // null means global/admin unlock
            }
        });
    }

    renderTripSwitcher() {
        if (this.tripSwitcherContainer) {
            this.tripSwitcherContainer.innerHTML = renderTripSwitcher(store);
            this.bindTripSwitcher();
        }
    }

    bindTripSwitcher() {
        const toggle = document.getElementById('trip-switcher-toggle');
        const dropdown = document.getElementById('trip-switcher-dropdown');

        if (toggle && dropdown) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            dropdown.querySelectorAll('.trip-switcher-option[data-trip-id]').forEach(option => {
                option.addEventListener('click', () => {
                    const tripId = option.dataset.tripId;
                    store.setActiveTrip(tripId);
                    dropdown.classList.add('hidden');
                    this.render();
                });
            });

            const allTripsBtn = document.getElementById('go-to-all-trips');
            if (allTripsBtn) {
                allTripsBtn.addEventListener('click', () => {
                    store.setActiveTrip(null);
                    dropdown.classList.add('hidden');
                    this.render();
                });
            }
        }
    }

    bindPasswordForm(targetTripId) {
        const form = document.getElementById('password-form');
        const input = document.getElementById('password-input');
        const error = document.getElementById('password-error');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const password = input.value;

                if (targetTripId) {
                    // Verifying trip-specific password
                    if (store.verifyTripPassword(targetTripId, password)) {
                        store.unlockTrip(targetTripId);
                        store.setActiveTrip(targetTripId);
                        this.closeModal();
                        this.render();
                    } else {
                        error.classList.remove('hidden');
                        input.value = '';
                        input.focus();
                    }
                } else {
                    // Global unlock for creation
                    if (store.verifyPassword(password)) {
                        store.setUnlocked(true);
                        // Show trip setup form
                        this.modalBody.innerHTML = renderTripSetupForm();
                        this.bindTripSetupForm();
                    } else {
                        error.classList.remove('hidden');
                        input.value = '';
                        input.focus();
                    }
                }
            });
        }
    }

    bindTripSetupForm() {
        const form = document.getElementById('trip-setup-form');
        const cancelBtn = document.getElementById('cancel-trip-btn');
        const error = document.getElementById('trip-form-error');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const name = document.getElementById('trip-name').value.trim();
                const destination = document.getElementById('trip-destination').value.trim();
                const startDate = document.getElementById('trip-start-date').value;
                const endDate = document.getElementById('trip-end-date').value;
                const password = document.getElementById('trip-password').value;

                if (!name || !destination || !startDate || !endDate || !password) {
                    error.classList.remove('hidden');
                    return;
                }

                if (new Date(endDate) < new Date(startDate)) {
                    error.textContent = 'End date must be after start date.';
                    error.classList.remove('hidden');
                    return;
                }

                // Create the trip
                const newTrip = store.createTrip({
                    name,
                    destination,
                    startDate,
                    endDate,
                    password
                });

                store.unlockTrip(newTrip.id);
                this.closeModal();
                this.showToast(`Created "${newTrip.name}"! 🎉`);
                this.render();
            });
        }
    }

    renderTabs() {
        const activeTab = store.data.config.activeTab || 'summary';

        // Update nav
        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab);
        });

        // Update pane visibility
        Object.keys(this.tabPanes).forEach(key => {
            const pane = this.tabPanes[key];
            if (pane) {
                pane.classList.toggle('active', key === activeTab);
            }
        });

        // Render active tab content
        this.renderTabContent(activeTab);
    }

    renderTabContent(tabId) {
        const pane = this.tabPanes[tabId];
        const trip = store.getActiveTrip();

        if (!pane || !trip) return;

        const callbacks = {
            onAdd: (type) => this.openEntityModal(type, null),
            onEdit: (type, item) => this.openEntityModal(type, item),
            onDelete: (type, id) => this.handleDelete(type, id)
        };

        switch (tabId) {
            case 'summary':
                renderSummary(pane, store, callbacks);
                break;
            case 'calendar':
                renderCalendar(pane, store, (content) => this.openModal(content));
                break;
            case 'flights':
                renderFlights(pane, store, callbacks);
                break;
            case 'stays':
                renderStays(pane, store, callbacks);
                break;
            case 'transit':
                renderTransit(pane, store, callbacks);
                break;
            case 'activities':
                renderActivities(pane, store, callbacks);
                break;
        }
    }

    openEntityModal(type, item) {
        // Import form renderers dynamically or assume they are available
        // For simplicity, we'll assume they are exported from component files and available globally or we import them
        // distinct render functions for forms might be better placed in a forms.js or similar
        // BUT per plan, they are in components. 
        // We need to import them at top of file first.
        // Let's assume we will update imports.

        let content = '';
        switch (type) {
            case 'flights': content = renderFlightForm(item); break;
            case 'stays': content = renderStayForm(item); break;
            case 'transit': content = renderTransitForm(item); break;
            case 'stays': content = renderStayForm(item); break;
            case 'transit': content = renderTransitForm(item); break;
            case 'activities': content = renderActivityForm(item); break;
            case 'travelers': content = renderTravelerForm(item); break;
        }

        this.openModal(content);
        this.bindEntityForm(type, item);
    }

    bindEntityForm(type, item) {
        const form = document.getElementById(`${type}-form`);
        const deleteBtn = document.getElementById('delete-btn');

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this item?')) {
                    this.handleDelete(type, item.id);
                    this.closeModal();
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // transform data if needed (e.g. arrays)
                if (type === 'flights' || type === 'stays' || type === 'activities' || type === 'transit') {
                    // Travelers checkboxes
                    const travelerCheckboxes = form.querySelectorAll('input[name="travelers"]:checked');
                    data.travelers = Array.from(travelerCheckboxes).map(cb => cb.value);

                    // Amenities/Links/etc if needed
                    if (data.amenities) data.amenities = data.amenities.split(',').map(s => s.trim()).filter(Boolean);
                    // Amenities/Links/etc if needed
                    if (data.amenities) data.amenities = data.amenities.split(',').map(s => s.trim()).filter(Boolean);
                    if (data.links) data.links = data.links.split(',').map(s => s.trim()).filter(Boolean);
                }

                if (type === 'travelers') {
                    // Handle traveler specific transformations if needed
                    // e.g. ensuring color has a value
                    if (!data.color) data.color = '#3498db';
                }

                this.handleSave(type, data, item ? item.id : null);
            });
        }
    }

    handleSave(type, data, id) {
        if (id) {
            store.updateItem(type, { ...data, id });
            this.showToast('Item updated successfully');
        } else {
            store.addItem(type, data);
            this.showToast('Item added successfully');
        }
        this.closeModal();
        this.render();
    }

    handleDelete(type, id) {
        store.deleteItem(type, id);
        this.showToast('Item deleted');
        this.render();
    }

    openModal(content) {
        if (this.modalBody && this.modalOverlay) {
            this.modalBody.innerHTML = content;
            this.modalOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // Focus first input if exists
            const firstInput = this.modalBody.querySelector('input');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
    }

    closeModal() {
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.getElementById('notification-toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), duration);
        }
    }
}

// Initialize app
window.app = new App();

// For debugging
window.store = store;