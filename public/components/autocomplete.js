/**
 * Generic Autocomplete Setup
 * @param {HTMLInputElement} inputEl
 * @param {Function} searchFn - async (query) => returns array of items
 * @param {Function} renderItemFn - (item) => returns HTML string
 * @param {Function} onSelectFn - (item, inputEl) => void
 */
export function setupAutocomplete(inputEl, searchFn, renderItemFn, onSelectFn) {
    if (!inputEl) return;

    let debounceTimer;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 0 0 8px 8px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        display: none;
    `;
    wrapper.appendChild(dropdown);

    inputEl.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            dropdown.innerHTML = '';
            dropdown.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const results = await searchFn(query);
                if (results && results.length > 0) {
                    dropdown.innerHTML = results.map((item, index) => `
                        <div class="autocomplete-item" data-index="${index}" style="padding: 8px 12px; cursor: pointer; hover:background: var(--bg-hover);">
                            ${renderItemFn(item)}
                        </div>
                    `).join('');
                    dropdown.style.display = 'block';

                    // Bind item clicks
                    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
                        el.addEventListener('click', () => {
                            const item = results[el.dataset.index];
                            onSelectFn(item, inputEl);
                            dropdown.style.display = 'none';
                        });
                        // Add hover effect manually since inline styles are tricky with hover
                        el.addEventListener('mouseenter', () => el.style.backgroundColor = 'var(--bg-subtle)');
                        el.addEventListener('mouseleave', () => el.style.backgroundColor = 'transparent');
                    });
                } else {
                    dropdown.style.display = 'none';
                }
            } catch (err) {
                console.error('Autocomplete search error', err);
            }
        }, 300);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}
