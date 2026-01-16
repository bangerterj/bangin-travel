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
import { renderLedger } from './components/ledger.js';
import { renderTripSelector, renderTripSetupForm, renderTripSwitcher, renderSetPasswordModal, renderInviteModal, renderTripEditForm, renderAccountSettings } from './components/trips.js';
import { setupAutocomplete } from './components/autocomplete.js';
import { TripService } from './services/TripService.js';

class App {
    constructor() {
        this.data = store.init();
        this.modalHasChanges = false;
        // Check session and re-render when done
        store.checkSession().then(() => {
            this.render();
        });
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
            activities: document.getElementById('tab-activities'),
            ledger: document.getElementById('tab-ledger')
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
                if (target) {
                    if (this.modalHasChanges) {
                        if (confirm('You have unsaved changes. Save them before switching tabs?')) {
                            // Try to submit the form
                            const form = this.modalBody.querySelector('form');
                            if (form) {
                                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                return; // handleSave will switch tab if successful? No, handleSave doesn't know about the tab switch request.
                            }
                        } else {
                            this.modalHasChanges = false;
                            this.closeModal();
                            this.switchTab(target);
                        }
                    } else {
                        this.closeModal();
                        this.switchTab(target);
                    }
                }
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

    showLoading(message = 'Loading...') {
        const existing = document.querySelector('.loading-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
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

    // ... (previous code)

    async handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('Please use an image file (screenshot).');
            return;
        }

        const trip = store.getActiveTrip();
        if (!trip) {
            console.log('No trip active, but proceeding with parse for demo purposes.');
        }

        this.showLoading('✨ Analyzing screenshot with Gemini...');

        try {
            const base64 = await this.processImage(file);
            const result = await this.uploadImage(base64);

            if (result.error) throw new Error(result.details || result.error);

            // Check if result is an array (multi-item parse, e.g. roundtrip)
            const rawData = result.data;
            const items = Array.isArray(rawData) ? rawData : [rawData];

            if (items.length > 1) {
                // Multi-item flow (Roundtrip)
                let successCount = 0;
                for (const item of items) {
                    try {
                        const mapped = this.mapScannedData(item);

                        let storeType = 'flights';
                        if (item.type === 'stay') storeType = 'stays';
                        if (item.type === 'activity') storeType = 'activities';
                        if (item.type === 'transit') storeType = 'transit';

                        // Save item using store
                        // store.addItem returns the new item on success
                        const saved = await store.addItem(storeType, mapped);
                        if (saved) successCount++;
                    } catch (err) {
                        console.error('Failed to auto-save item', item, err);
                    }
                }
                this.hideLoading();
                this.showToast(`✅ Imported ${successCount} items!`);
                this.render();

            } else {
                // Single item flow - Open Modal
                const data = items[0];
                this.hideLoading();
                this.showToast(`Found ${data.type}: ${data.title}`);

                // Smart Switch Logic
                let targetTab = 'summary';
                if (data.type === 'flight') targetTab = 'flights';
                if (data.type === 'stay') targetTab = 'stays';
                if (data.type === 'transit') targetTab = 'transit';
                if (data.type === 'activity') targetTab = 'activities';

                if (targetTab !== store.data.config.activeTab) {
                    this.switchTab(targetTab);
                }

                const mappedData = this.mapScannedData(data);
                this.openEntityModal(targetTab, mappedData);
            }

        } catch (error) {
            console.error(error);
            this.hideLoading();
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

    async processImage(file) {
        // Just convert to base64 for now. 
        // We could add client-side compression here later if needed.
        return await this.fileToBase64(file);
    }

    async uploadImage(base64Image) {
        const response = await fetch('/api/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { error: errorData.error || 'Upload failed', details: errorData.details };
        }

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
            endAt: data.endAt,
            // Generic fallback for mismatched types:
            description: data.summary || ''
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
                arrivalAirport: meta.arrivalAirport || '',
                departureTime: data.startAt,
                arrivalTime: data.endAt,
                duration: meta.duration || '', // Let the API calculate it unless Gemini found it explicitly
            };
        }


        if (data.type === 'stay') {
            const meta = data.metadata || {};

            // Auto-detect subtype (hotel, airbnb, etc)
            let stayType = 'hotel';
            const textContent = (data.title + ' ' + (data.notes || '')).toLowerCase();
            if (textContent.includes('airbnb')) stayType = 'airbnb';
            else if (textContent.includes('hostel')) stayType = 'hostel';
            // ryokan removed/merged

            return {
                ...base,
                type: stayType,
                address: meta.address || '',
                checkIn: data.startAt,
                checkOut: data.endAt,
                cost: { amount: meta.cost || 0, currency: 'USD' } // Try to map cost
                // confirmationCode removed
            };
        }

        // Add mapping for activities/transit if needed for completeness
        if (data.type === 'activity') {
            return {
                ...base,
                type: 'sightseeing',
                location: data.location || '',
                startTime: data.startAt,
                endTime: data.endAt
            };
        }

        if (data.type === 'transit') {
            const meta = data.metadata || {};
            return {
                ...base,
                type: 'train', // default
                departureLocation: meta.departureLocation || '',
                arrivalLocation: meta.arrivalLocation || '',
                departureTime: data.startAt,
                arrivalTime: data.endAt
            };
        }

        return base;
    }

    render() {
        const session = store.getSession();

        // If not logged in, show login prompt
        if (!session) {
            this.showView('trips'); // Use trips container for login prompt
            this.tripsContainer.innerHTML = `
                <div class="login-prompt">
                    <h2>🚐 Welcome to Bangin' Travel</h2>
                    <p>Sign in to view and manage your trips.</p>
                    <a href="/api/auth/signin" class="btn btn-primary">
                        Log In / Sign Up
                    </a>
                </div>
            `;
            return;
        }

        // Check if user needs to set their name
        if (store.needsName()) {
            this.showView('trips');
            this.tripsContainer.innerHTML = `
                <div class="login-prompt">
                    <h2>👋 Almost there!</h2>
                    <p>What should we call you? This will be your name on travel profiles.</p>
                    <form id="name-capture-form" style="display: flex; flex-direction: column; gap: 16px; max-width: 300px; margin: 20px auto;">
                        <input type="text" id="user-name-input" placeholder="Your Name" required autofocus style="padding: 12px; border-radius: 8px; border: 2px solid var(--border-color);">
                        <button type="submit" class="btn btn-primary">Save & Continue</button>
                    </form>
                </div>
            `;
            const form = document.getElementById('name-capture-form');
            form?.addEventListener('submit', (e) => this.handleUpdateName(e));
            return;
        }

        // Logged in - show trips or dashboard
        if (store.data.config.activeTripId) {
            this.showView('dashboard');
            this.renderHeaderProfile();

            this.renderTabs();
            this.renderTabContent();
            this.updateTripSwitcher();
        } else {
            this.showView('trips');
            document.getElementById('trip-hero')?.classList.add('hidden'); // Hide hero on list view
            renderTripSelector(this.tripsContainer, store, {
                onSelectTrip: (id) => this.handleTripSelect(id),
                onCreateNew: () => this.handleTripCreate(),
                onAccountSettings: () => this.handleAccountSettings()
            });

            // Bind Set Password button if it exists
            const setPasswordBtn = document.getElementById('set-password-btn');
            if (setPasswordBtn) {
                setPasswordBtn.addEventListener('click', () => this.handleSetPassword());
            }
        }
    }

    renderHeaderProfile() {
        const container = document.getElementById('header-right');
        const session = store.getSession();
        if (!container || !session) return;

        container.innerHTML = `
            <button class="account-btn" id="header-account-btn" title="Account Settings">
                <span>👤</span>
                <span>${session.user.name || 'Account'}</span>
            </button>
        `;

        document.getElementById('header-account-btn')?.addEventListener('click', () => {
            this.handleAccountSettings();
        });
    }

    async handleUpdateName(e) {
        e.preventDefault();
        const name = document.getElementById('user-name-input')?.value;
        if (!name) return;

        const submitBtn = e.target.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const res = await fetch('/api/auth/update-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                this.showToast('✅ Profile updated!');
                await store.checkSession();
                this.render();
            } else {
                const data = await res.json();
                alert(data.message || 'Error updating profile.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save & Continue';
            }
        } catch (err) {
            alert('Server error. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save & Continue';
        }
    }

    handleSetPassword() {
        this.openModal(renderSetPasswordModal());

        const form = document.getElementById('set-password-form');
        const errorEl = document.getElementById('set-password-error');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('new-password')?.value;
            const confirm = document.getElementById('confirm-password')?.value;

            if (password !== confirm) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl?.classList.remove('hidden');
                return;
            }

            try {
                const res = await fetch('/api/auth/set-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                if (res.ok) {
                    this.showToast('✅ Password set successfully!');
                    this.closeModal();
                    // Update session/store state
                    await store.checkSession();
                    this.render();
                } else {
                    const data = await res.json();
                    errorEl.textContent = data.message || 'Error setting password.';
                    errorEl?.classList.remove('hidden');
                }
            } catch (err) {
                errorEl.textContent = 'Server error. Please try again.';
                errorEl?.classList.remove('hidden');
            }
        });
    }

    showView(viewName) {
        Object.keys(this.views).forEach(key => {
            if (key === viewName) {
                this.views[key].classList.remove('hidden');
            } else {
                this.views[key].classList.add('hidden');
            }
        });
    }

    switchTab(tabName) {
        store.setActiveTab(tabName);
        this.renderTabs();
        this.renderTabContent();
    }

    renderTabs() {
        const activeTab = store.data.config.activeTab || 'summary';
        this.navTabs.forEach(tab => {
            if (tab.dataset.tab === activeTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    renderTabContent() {
        const activeTab = store.data.config.activeTab || 'summary';

        // Hide all panes
        Object.values(this.tabPanes).forEach(pane => {
            if (pane) pane.classList.remove('active');
        });

        // Show active pane
        const activePane = this.tabPanes[activeTab];
        if (activePane) {
            activePane.classList.add('active');
            activePane.innerHTML = ''; // Clear current

            // Render content based on tab
            const callbacks = {
                onAdd: (type) => this.openEntityModal(type, null),
                onEdit: (type, item) => this.openEntityModal(type, item),
                onInvite: () => this.handleInvite(),
                onEditTrip: () => this.handleTripEdit()
            };

            switch (activeTab) {
                case 'summary':
                    renderSummary(activePane, store, callbacks);
                    break;
                case 'calendar':
                    renderCalendar(activePane, store);
                    break;
                case 'flights':
                    renderFlights(activePane, store, callbacks);
                    break;
                case 'stays':
                    renderStays(activePane, store, callbacks);
                    break;
                case 'transit':
                    renderTransit(activePane, store, callbacks);
                    break;
                case 'activities':
                    renderActivities(activePane, store, callbacks);
                    break;
                case 'ledger':
                    renderLedger(activePane, store);
                    break;
            }
        }
    }
    updateTripSwitcher() {
        const container = this.tripSwitcherContainer;
        if (container) {
            if (typeof store.getTrips !== 'function') {
                console.error('CRITICAL: store.getTrips is not a function!', store);
                return;
            }

            container.innerHTML = renderTripSwitcher(store);

            // Bind events after rendering
            const toggleBtn = document.getElementById('trip-switcher-toggle');
            const dropdown = document.getElementById('trip-switcher-dropdown');
            const tripOptions = document.querySelectorAll('.trip-switcher-option[data-trip-id]');
            const goToAllTrips = document.getElementById('go-to-all-trips');

            if (toggleBtn && dropdown) {
                toggleBtn.addEventListener('click', () => {
                    dropdown.classList.toggle('hidden');
                });
            }

            tripOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const tripId = option.dataset.tripId;
                    store.setActiveTrip(tripId);
                    dropdown?.classList.add('hidden');
                    this.render();
                });
            });

            if (goToAllTrips) {
                goToAllTrips.addEventListener('click', () => {
                    store.setActiveTrip(null);
                    dropdown?.classList.add('hidden');
                    this.render();
                });
            }
        }
    }











    handleTripSelect(id) {
        // Simplified selection - Auth is handled by session/backend
        const trip = store.getTrips().find(t => t.id === id);
        if (trip) {
            store.setActiveTrip(trip.id);
            this.render();
        }
    }

    handleTripCreate() {
        this.openModal(renderTripSetupForm());

        const form = document.getElementById('trip-setup-form');
        const cancelBtn = document.getElementById('cancel-trip-btn');
        const errorEl = document.getElementById('trip-form-error');

        cancelBtn?.addEventListener('click', () => this.closeModal());

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newTrip = {
                name: document.getElementById('trip-name').value,
                destination: document.getElementById('trip-destination').value,
                startDate: document.getElementById('trip-start-date').value,
                endDate: document.getElementById('trip-end-date').value
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '🚀 Creating...';

            try {
                await store.createTrip(newTrip);
                this.closeModal();
                this.render();
                this.showToast('✅ Trip created successfully!');
            } catch (err) {
                errorEl.textContent = 'Failed to create trip. Please try again.';
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Create Trip';
            }
        });
    }

    // ... (renderTripSelector, renderTripSwitcher, bindTripSwitcher, bindPasswordForm, bindTripSetupForm, renderTabs, renderTabContent remain unchanged)

    openEntityModal(type, item) {
        // Pass store to render functions to ensuring data access
        // This fixes issues where window.store might be undefined or stale
        let content = '';
        const currentStore = store || window.store;

        switch (type) {
            case 'flights': content = renderFlightForm(item, currentStore); break;
            case 'stays': content = renderStayForm(item, currentStore); break;
            case 'transit': content = renderTransitForm(item, currentStore); break;
            case 'activities': content = renderActivityForm(item, currentStore); break;
            case 'travelers': content = renderTravelerForm(item, currentStore); break;
        }

        this.currentItem = item;
        this.openModal(content);
        this.bindEntityForm(type, item);
    }

    bindEntityForm(type, item) {
        console.log('[TRACE] bindEntityForm START:', type);
        const form = document.getElementById(`${type}-form`);
        console.log('[TRACE] Form element:', form);
        const deleteBtn = document.getElementById('delete-btn');

        // Bind Import Zone File Input
        const importInput = document.getElementById('import-file-input');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageFile(e.target.files[0]);
                }
            });
        }

        // Bind Drag/Drop specifically for Import Zone visual feedback
        const importZone = document.getElementById('import-zone');
        if (importZone) {
            importZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                importZone.classList.add('drag-active');
            });
            importZone.addEventListener('dragleave', () => {
                importZone.classList.remove('drag-active');
            });
            importZone.addEventListener('drop', (e) => {
                e.preventDefault();
                importZone.classList.remove('drag-active');
                if (e.dataTransfer.files.length > 0) {
                    this.handleImageFile(e.dataTransfer.files[0]);
                }
            });
        }
        if (deleteBtn) {
            const newBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
            newBtn.addEventListener('click', async () => {
                await this.handleDelete(type, item.id);
            });
        } else {
            console.warn('Delete button not found in DOM');
        }

        const durationInput = form.querySelector('input[name="duration"]');
        const depInput = form.querySelector('input[name="departureAirport"]');
        const arrInput = form.querySelector('input[name="arrivalAirport"]');
        const depTimeInput = form.querySelector('input[name="departureTime"]');
        const arrTimeInput = form.querySelector('input[name="arrivalTime"]');

        // FLIGHT-SPECIFIC LOGIC: Only run if this is actually a flight form
        if (depInput && arrInput) {
            const searchAirports = async (q) => {
                const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                return await res.json();
            };

            const renderAirportItem = (item) => `
                <div style="font-weight: bold;">${item.iata} - ${item.name}</div>
                <div style="font-size: 0.8em; color: gray;">${item.city}, ${item.country}</div>
            `;

            const onSelectAirport = (item, input) => {
                input.value = item.iata;
                input.dispatchEvent(new Event('input')); // Trigger change for duration calc
                this.modalHasChanges = true;
            };

            setupAutocomplete(depInput, searchAirports, renderAirportItem, onSelectAirport);
            setupAutocomplete(arrInput, searchAirports, renderAirportItem, onSelectAirport);

            // Duration Calculation
            const calculateDuration = async () => {
                const depIata = depInput?.value;
                const arrIata = arrInput?.value;
                const depTime = depTimeInput?.value;
                const arrTime = arrTimeInput?.value;

                if (depIata && arrIata && depTime && arrTime && durationInput) {
                    // Check if looks like IATA (3 chars) before spamming api
                    if (depIata.length !== 3 || arrIata.length !== 3) return;

                    try {
                        const res = await fetch('/api/flights/calculate-duration', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ depIata, arrIata, depTime, arrTime })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.durationText) {
                                durationInput.value = data.durationText;
                            }
                        }
                    } catch (e) {
                        console.error('Duration calc failed', e);
                    }
                }
            };

            // Bind calculation to changes
            [depInput, arrInput, depTimeInput, arrTimeInput].forEach(el => {
                if (el) el.addEventListener('blur', calculateDuration);
            });

            // Initial calculation if data is present
            if (depInput && arrInput && depTimeInput && arrTimeInput) {
                if (depInput.value && arrInput.value && depTimeInput.value && arrTimeInput.value) {
                    calculateDuration();
                }
            }
        }


        // Duplicate logic removed from here (moved to top of function)

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // transform data if needed (e.g. arrays)
                if (type === 'flights' || type === 'stays' || type === 'activities' || type === 'transit') {
                    // Travelers checkboxes
                    const travelerCheckboxes = form.querySelectorAll('input[name="travelers"]:checked');
                    data.travelers = Array.from(travelerCheckboxes).map(cb => cb.value);

                    // Map name to title if present (for stays)
                    if (data.name && !data.title) {
                        data.title = data.name;
                    }

                    // Metadata handling
                    // Start with existing metadata if editing to avoid data loss
                    const baseMetadata = (this.currentItem && this.currentItem.metadata) ? { ...this.currentItem.metadata } : {};

                    const metadata = baseMetadata;
                    if (data.address) metadata.address = data.address;
                    if (data.type) metadata.type = data.type; // e.g. hotel/airbnb

                    // Cost structure
                    if (data['cost.amount'] !== undefined) {
                        const amount = data['cost.amount'] === '' ? 0 : parseFloat(data['cost.amount']);
                        const perNight = data['cost.perNight'] === '' ? 0 : parseFloat(data['cost.perNight']);

                        metadata.cost = {
                            ...(metadata.cost || {}),
                            amount: isNaN(amount) ? 0 : amount,
                            currency: data['cost.currency'] || 'USD',
                            perNight: isNaN(perNight) ? 0 : perNight
                        };
                    }
                    data.metadata = metadata;

                    // Cleanup flattened keys
                    delete data['cost.amount'];
                    delete data['cost.currency'];
                    delete data['cost.perNight'];
                    delete data.address;
                }

                if (type === 'travelers') {
                    // Handle traveler specific transformations
                    // Backend expects displayName, UI uses name
                    data.displayName = data.name;
                    // Ensure isOrganizer is boolean
                    data.isOrganizer = data.isOrganizer === 'true' || data.isOrganizer === true;
                    // ensuring color has a value
                    if (!data.color) data.color = '#3498db';
                }

                let saveType = type;

                // Specific transformations
                if (type === 'flights') {
                    saveType = 'flight'; // Singular for API/Store

                    // Construct title if missing
                    if (!data.title) {
                        data.title = `${data.airline || ''} ${data.flightNumber || ''}`.trim() || 'Flight';
                    }

                    // Move specific fields to metadata that aren't top-level in API
                    const meta = data.metadata || {};
                    meta.airline = data.airline;
                    meta.flightNumber = data.flightNumber;
                    meta.departureAirport = data.departureAirport;
                    meta.arrivalAirport = data.arrivalAirport;
                    meta.duration = data.duration;
                    meta.departureTime = data.departureTime;
                    meta.arrivalTime = data.arrivalTime;

                    // Map to generic startAt/endAt for sorting/display
                    data.startAt = data.departureTime;
                    data.endAt = data.arrivalTime;

                    // data.type is usually 'departure'/'return' from the form
                    // The API expects 'flight' as the main type.
                    // We moved form type to metadata.type in the generic block above (line 789)
                    // But we must ensure the main type sent to API is 'flight'
                    // store.addItem(type, data) -> sends { type: type, ...data }
                    // So we pass 'flight' as saveType.

                    // Cleanup moved fields from top level to avoid clutter (optional but clean)
                    delete data.airline;
                    delete data.flightNumber;
                    delete data.departureAirport;
                    delete data.arrivalAirport;
                    delete data.duration;

                    data.metadata = meta;
                } else if (type === 'stays') {
                    saveType = 'stay';
                    data.startAt = data.checkIn;
                    data.endAt = data.checkOut;

                    const meta = data.metadata || {};
                    meta.checkIn = data.checkIn;
                    meta.checkOut = data.checkOut;
                    data.metadata = meta;

                } else if (type === 'activities') {
                    saveType = 'activity';
                    data.startAt = data.startTime;
                    data.endAt = data.endTime;

                    // Handle checkbox status
                    data.status = data.status === 'booked' ? 'booked' : 'planned';

                    const meta = data.metadata || {};
                    meta.location = data.location;
                    meta.startTime = data.startTime;
                    meta.endTime = data.endTime;
                    meta.links = data.links ? data.links.split(',').map(s => s.trim()) : [];
                    // Note: form inputs might come as string or array? 
                    // activities.js input name='links' value="...". likely string. 
                    // But app.js line 817 handles checkboxes. links input is text? 
                    // activities.js line 306: input type="text". So split is needed if it's comma separated.
                    // However, previous code assumed it might be array? 
                    // safely handle it.
                    if (typeof data.links === 'string') {
                        meta.links = data.links.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    data.metadata = meta;

                } else if (type === 'transit') {
                    saveType = 'transit';
                    data.startAt = data.departureTime;
                    data.endAt = data.arrivalTime;

                    const meta = data.metadata || {};
                    meta.departureLocation = data.departureLocation;
                    meta.arrivalLocation = data.arrivalLocation;
                    meta.departureTime = data.departureTime;
                    meta.arrivalTime = data.arrivalTime;
                    // name is mapped to title generically, but transit might want 'name' in metadata too?
                    // transit.js uses item.name. generic map uses data.name -> data.title.
                    // Metadata name might be redundant but safe.
                    meta.name = data.name;
                    data.metadata = meta;
                }

                // Ensure data.type is removed so it doesn't override the main saveType in store.addItem
                // store.addItem(saveType, data) -> { type: saveType, ...data }
                // If data.type exists (e.g. 'hotel' for stays), it overrides 'stay'.
                if (data.type) {
                    // Ensure it's in metadata before deleting, if not already
                    if (!data.metadata) data.metadata = {};
                    if (!data.metadata.type) data.metadata.type = data.type;
                    delete data.type;
                }

                await this.handleSave(saveType, data, item ? item.id : null);

            });

            // Global Currency Formatting for this form
            form.querySelectorAll('.currency-input').forEach(input => {
                input.addEventListener('blur', (e) => {
                    if (e.target.value) {
                        e.target.value = parseFloat(e.target.value).toFixed(2);
                    }
                });
            });

            // Track changes
            form.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('input', () => {
                    this.modalHasChanges = true;
                });
            });
        }
    }

    // ... (rest of file)

    async handleSave(type, data, id) {
        try {
            if (type === 'travelers') {
                // Travelers have their own API endpoints
                if (id) {
                    await store.updateTraveler({ ...data, id });
                    this.showToast('Traveler updated successfully');
                } else {
                    await store.addTraveler(data);
                    this.showToast('Traveler added successfully');
                }
            } else {
                // Regular items (flights, stays, activities, transit)
                if (id) {
                    await store.updateItem(type, { ...data, id });
                    this.showToast('Item updated successfully');
                } else {
                    await store.addItem(type, data);
                    this.showToast('Item added successfully');
                }
            }
            this.modalHasChanges = false;
            this.closeModal();
            this.render();
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Error saving: ' + (error.message || 'Unknown error'), 5000);
        }
    }

    async handleDelete(type, id) {
        try {
            console.log('App.handleDelete', type, id);
            let success = false;

            if (type === 'travelers') {
                success = await store.deleteTraveler(id);
                if (success) this.showToast('Traveler deleted successfully');
            } else {
                success = await store.deleteItem(type, id);
                if (success) this.showToast('Item deleted successfully');
            }

            if (success) {
                this.modalHasChanges = false;
                this.closeModal();
                this.render();
            } else {
                this.showToast('Failed to delete ' + (type === 'travelers' ? 'traveler' : 'item'), 5000);
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Error deleting: ' + (error.message || 'Unknown error'), 5000);
        }
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

    closeModal(force = false) {
        if (this.modalHasChanges && !force) {
            if (!confirm('Discard unsaved changes?')) return;
        }
        if (this.modalOverlay) {
            this.modalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
            this.modalHasChanges = false;
        }
    }

    handleInvite() {
        const trip = store.getActiveTrip();
        if (!trip) return;

        this.openModal(renderInviteModal(trip));

        const form = document.getElementById('email-invite-form');
        const successEl = document.getElementById('invite-email-success');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('invite-email')?.value;
            const submitBtn = form.querySelector('button');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                const res = await fetch('/api/invites/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tripId: trip.id, email }),
                });

                if (res.ok) {
                    successEl?.classList.remove('hidden');
                    setTimeout(() => {
                        this.closeModal();
                    }, 2000);
                } else {
                    const data = await res.json();
                    alert(data.message || 'Error sending invite.');
                }
            } catch (err) {
                alert('Server error. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Invitation';
            }
        });
    }

    handleTripEdit() {
        const trip = store.getActiveTrip();
        if (!trip) return;

        console.log('[DEBUG] Opening Edit Trip modal for:', trip.id);
        this.openModal(renderTripEditForm(trip));

        const bindEvents = () => {
            const form = document.getElementById('trip-edit-form');
            const deleteBtn = document.getElementById('delete-trip-btn');
            const archiveBtn = document.getElementById('archive-trip-btn');
            const cancelBtn = document.getElementById('cancel-edit-btn');

            if (!form) {
                setTimeout(bindEvents, 50);
                return;
            }

            console.log('[DEBUG] Events bound for trip:', trip.id, '(v3)');

            cancelBtn?.addEventListener('click', () => this.closeModal());

            // Delete Trip Handler
            deleteBtn?.addEventListener('click', async () => {
                console.log('[DEBUG] Delete Clicked');
                if (!window.confirm('PERMANENTLY delete this trip?')) return;

                try {
                    this.showLoading('🗑️ Deleting...');
                    await TripService.deleteTrip(trip.id);
                    this.hideLoading();
                    this.closeModal();
                    store.setActiveTrip(null);
                    await store.fetchTrips();
                    this.render();
                    this.showToast('🗑️ Trip deleted');
                } catch (err) {
                    this.hideLoading();
                    alert('Error: ' + err.message);
                }
            });

            // Archive Trip Handler - No confirm for archive to avoid browser blocks
            archiveBtn?.addEventListener('click', async () => {
                const isArchiving = !trip.isArchived;
                console.log('[DEBUG] Archive Clicked. Target state:', isArchiving);

                try {
                    this.showLoading(isArchiving ? '📦 Archiving...' : '📥 Reviving...');
                    const res = await fetch(`/api/trips/${trip.id}/update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isArchived: isArchiving }),
                    });

                    this.hideLoading();
                    if (res.ok) {
                        await store.fetchTrips();
                        this.closeModal();
                        this.render();
                        this.showToast(isArchiving ? '📦 Archived' : '📥 Revived');
                    } else {
                        const data = await res.json();
                        alert('Error: ' + (data.error || 'Unknown'));
                    }
                } catch (err) {
                    this.hideLoading();
                    alert('Request failed');
                }
            });

            // Form Submit Handler
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('[DEBUG] Form Submit');

                const updateData = {
                    name: document.getElementById('edit-trip-name').value,
                    destination: document.getElementById('edit-trip-destination').value,
                    startDate: document.getElementById('edit-trip-start-date').value,
                    endDate: document.getElementById('edit-trip-end-date').value
                };

                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;

                try {
                    const res = await fetch(`/api/trips/${trip.id}/update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData),
                    });

                    if (res.ok) {
                        await store.fetchTrips();
                        this.closeModal();
                        this.render();
                        this.showToast('✅ Updated');
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Update failed');
                    }
                } catch (err) {
                    alert('Server error');
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        };

        bindEvents();
    }

    async handleAccountSettings() {
        await store.fetchTrips(true); // Fetch all trips including archived
        const archivedTrips = (store.data.trips || []).filter(t => t.isArchived);
        this.openModal(renderAccountSettings(store.session?.user, archivedTrips));

        const form = document.getElementById('account-settings-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('settings-name').value;
            const submitBtn = form.querySelector('button');
            submitBtn.disabled = true;

            try {
                const res = await fetch('/api/auth/update-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName }),
                });

                if (res.ok) {
                    await store.checkSession();
                    this.render();
                    this.showToast('✅ Profile updated!');
                    this.closeModal();
                }
            } catch (err) {
                alert('Error updating profile.');
            } finally {
                submitBtn.disabled = false;
            }
        });

        // Revive buttons in settings
        document.querySelectorAll('.revive-trip-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tripId = btn.dataset.id;
                try {
                    const res = await fetch(`/api/trips/${tripId}/update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isArchived: false }),
                    });

                    if (res.ok) {
                        await store.fetchTrips();
                        this.handleAccountSettings(); // Re-render settings modal
                        this.render(); // Re-render main dashboard
                        this.showToast('📥 Trip revived!');
                    }
                } catch (err) {
                    alert('Error reviving trip.');
                }
            });
        });
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