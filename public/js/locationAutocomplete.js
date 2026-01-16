/**
 * Location Autocomplete - Vanilla JS integration for existing forms
 * Enhances text inputs with geocoding autocomplete functionality
 * 
 * Usage:
 *   initLocationAutocomplete('address-input-id', {
 *     onSelect: (location) => { console.log(location); }
 *   });
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Helper to format address cleanly
function formatAddress(item) {
    if (!item.address) return item.display_name.split(',').slice(0, 3).join(', ');

    const addr = item.address;
    const parts = [];

    let firstPart = item.display_name.split(',')[0];
    if (/^\d+$/.test(firstPart) && addr.road) {
        firstPart = `${firstPart} ${addr.road}`;
    }
    parts.push(firstPart);

    const city = addr.city || addr.town || addr.village || addr.municipality;
    if (city && !firstPart.includes(city)) {
        parts.push(city);
    }

    if (addr.state) parts.push(addr.state);

    return parts.join(', ');
}

// Search location using Nominatim
async function searchLocation(query) {
    if (!query || query.length < 2) return [];

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'BanginTravel-Prototype/1.0' }
        });
        const data = await res.json();

        return data.map(item => ({
            displayName: formatAddress(item),
            fullAddress: item.display_name,
            coordinates: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
            }
        }));
    } catch (err) {
        console.error('Geocoding error:', err);
        return [];
    }
}

/**
 * Initialize location autocomplete on an existing text input
 * @param {string} inputId - The ID of the text input to enhance
 * @param {object} options - Configuration options
 */
export function initLocationAutocomplete(inputId, options = {}) {
    const input = document.getElementById(inputId);
    if (!input) return null;

    const { onSelect } = options;

    // Create dropdown container
    const wrapper = document.createElement('div');
    wrapper.className = 'loc-autocomplete-wrapper';
    wrapper.style.cssText = 'position: relative;';

    // Wrap the input
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Create results dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'loc-autocomplete-dropdown';
    dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #2c3e50;
    border-top: none;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 1000;
    max-height: 240px;
    overflow-y: auto;
    display: none;
  `;
    wrapper.appendChild(dropdown);

    // Hidden fields for coordinates
    const latInput = document.createElement('input');
    latInput.type = 'hidden';
    latInput.name = 'location.coordinates.lat';
    wrapper.appendChild(latInput);

    const lngInput = document.createElement('input');
    lngInput.type = 'hidden';
    lngInput.name = 'location.coordinates.lng';
    wrapper.appendChild(lngInput);

    const displayNameInput = document.createElement('input');
    displayNameInput.type = 'hidden';
    displayNameInput.name = 'location.displayName';
    wrapper.appendChild(displayNameInput);

    // Debounce timer
    let debounceTimer = null;
    let currentResults = [];

    // Handle input
    input.addEventListener('input', (e) => {
        const query = e.target.value;

        if (debounceTimer) clearTimeout(debounceTimer);

        if (query.length < 2) {
            dropdown.style.display = 'none';
            currentResults = [];
            return;
        }

        debounceTimer = setTimeout(async () => {
            currentResults = await searchLocation(query);

            if (currentResults.length === 0) {
                dropdown.style.display = 'none';
                return;
            }

            dropdown.innerHTML = currentResults.map((result, idx) => `
        <div class="loc-result-item" data-index="${idx}" style="
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid #f8f4eb;
          transition: background 0.15s;
        ">
          <div style="font-weight: 500; color: #2c3e50;">📍 ${result.displayName}</div>
          <div style="font-size: 0.75rem; color: #5d6d7e;">
            ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}
          </div>
        </div>
      `).join('');

            dropdown.style.display = 'block';

            // Add click handlers
            dropdown.querySelectorAll('.loc-result-item').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.style.background = '#f8f4eb';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'white';
                });
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const idx = parseInt(item.dataset.index);
                    const selected = currentResults[idx];

                    // Update input and hidden fields
                    input.value = selected.displayName;
                    latInput.value = selected.coordinates.lat;
                    lngInput.value = selected.coordinates.lng;
                    displayNameInput.value = selected.displayName;

                    dropdown.style.display = 'none';

                    if (onSelect) {
                        onSelect(selected);
                    }
                });
            });
        }, 300);
    });

    // Close dropdown on blur
    input.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 200);
    });

    // Focus shows results if available
    input.addEventListener('focus', () => {
        if (currentResults.length > 0) {
            dropdown.style.display = 'block';
        }
    });

    return {
        setCoordinates: (lat, lng, displayName) => {
            latInput.value = lat || '';
            lngInput.value = lng || '';
            displayNameInput.value = displayName || '';
        },
        getLocation: () => ({
            displayName: displayNameInput.value,
            coordinates: {
                lat: parseFloat(latInput.value) || null,
                lng: parseFloat(lngInput.value) || null
            }
        })
    };
}

// Convenience function to initialize after form renders
export function enhanceLocationFields() {
    // Enhance address fields in Stays form
    const staysAddress = document.querySelector('input[name="address"]');
    if (staysAddress && !staysAddress.dataset.locationEnhanced) {
        staysAddress.id = staysAddress.id || 'stays-address-input';
        staysAddress.dataset.locationEnhanced = 'true';
        initLocationAutocomplete(staysAddress.id);
    }

    // Enhance location fields in Activities form
    const activitiesLocation = document.querySelector('input[name="location"]');
    if (activitiesLocation && !activitiesLocation.dataset.locationEnhanced) {
        activitiesLocation.id = activitiesLocation.id || 'activities-location-input';
        activitiesLocation.dataset.locationEnhanced = 'true';
        initLocationAutocomplete(activitiesLocation.id);
    }
}

// Auto-enhance when DOM changes (for dynamic forms)
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
        enhanceLocationFields();
    });

    // Start observing when DOM is ready
    if (typeof document !== 'undefined' && document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
}
