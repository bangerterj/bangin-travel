import { store } from './store.js';
class App {
    constructor() {
        this.data = store.init();
        this.cacheDOM();
        this.bindEvents();
        this.render();
    }
    cacheDOM() {
        this.views = {
            auth: document.getElementById('auth-view'),
            dashboard: document.getElementById('dashboard-view')
        };
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.flightsList = document.getElementById('flights-list');
        this.staysList = document.getElementById('stays-list');
        this.transitList = document.getElementById('transit-list');
        this.activitiesList = document.getElementById('activities-list');
        this.suggestionsList = document.getElementById('suggestions-list');
        this.tripMeta = document.getElementById('trip-meta');
        this.loginForm = document.getElementById('login-form');
        this.guestAccessBtn = document.getElementById('guest-access-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.calendarGrid = document.getElementById('calendar-grid');
        this.nextEventContainer = document.getElementById('next-event');
        this.mapPinsContainer = document.getElementById('map-pins-container');
        this.modalOverlay = document.getElementById('modal-container');
        this.modalBody = document.getElementById('modal-body');
        this.modalClose = document.querySelector('.modal-close');
    }
    bindEvents() {
        if (this.loginForm) this.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin('organizer'); });
        if (this.guestAccessBtn) this.guestAccessBtn.addEventListener('click', () => this.handleLogin('guest'));
        if (this.logoutBtn) this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.navTabs.forEach(tab => tab.addEventListener('click', (e) => { const target = e.currentTarget.dataset.tab; if (target) this.switchTab(target); }));
        if (this.modalClose) this.modalClose.addEventListener('click', () => this.closeModal());
    }
    handleLogin(role) { store.setRole(role); this.render(); }
    handleLogout() { store.setRole(null); this.render(); }
    switchTab(tabId) { store.setActiveTab(tabId); this.renderTabs(); }
    render() {
        const role = store.data.config.role;
        if (!role) { this.showView('auth'); return; }
        this.showView('dashboard');
        this.renderTabs();
    }
    showView(viewName) { Object.keys(this.views).forEach(v => { if (this.views[v]) this.views[v].classList.toggle('hidden', v !== viewName); }); }
    renderTabs() {
        const activeTab = store.data.config.activeTab || 'summary';
        this.navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === activeTab));
        this.tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `tab-${activeTab}`));
    }
    closeModal() { if (this.modalOverlay) this.modalOverlay.classList.add('hidden'); }
}
window.app = new App();