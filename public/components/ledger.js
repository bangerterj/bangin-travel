/**
 * Ledger Component - Handles rendering of trip costs and debts
 */

export function renderLedger(container, store) {
    const ledger = store.getLedger();
    if (!ledger) return;

    const { totalCost, balances, debts, travelers } = ledger;

    const getTraveler = (id) => travelers.find(t => t.id === id);

    const balanceItems = Object.entries(balances).map(([tId, amount]) => {
        const traveler = getTraveler(tId);
        if (!traveler) return '';

        const isPositive = amount > 0.01;
        const isNegative = amount < -0.01;
        const colorClass = isPositive ? 'text-success' : (isNegative ? 'text-danger' : '');
        const prefix = isPositive ? '+' : '';

        return `
      <div class="ledger-balance-item">
        <div class="traveler-info">
          <div class="avatar avatar-md" style="background-color: ${traveler.color}">${traveler.initials}</div>
          <div>
            <div class="traveler-name">${traveler.name}</div>
            <div class="traveler-status text-muted text-small">${isPositive ? 'Owed' : (isNegative ? 'Owes' : 'Settled')}</div>
          </div>
        </div>
        <div class="balance-amount ${colorClass}">${prefix}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    `;
    }).join('');

    const debtItems = debts.length > 0 ? debts.map(debt => {
        const from = getTraveler(debt.from);
        const to = getTraveler(debt.to);

        return `
      <div class="debt-card">
        <div class="debt-from">
           <div class="avatar avatar-sm" style="background-color: ${from.color}">${from.initials}</div>
           <span>${from.name.split(' ')[0]}</span>
        </div>
        <div class="debt-arrow">
          <div class="debt-amount">$${debt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="arrow">→</div>
        </div>
        <div class="debt-to">
           <div class="avatar avatar-sm" style="background-color: ${to.color}">${to.initials}</div>
           <span>${to.name.split(' ')[0]}</span>
        </div>
      </div>
    `;
    }).join('') : '<p class="text-muted" style="text-align: center; padding: 20px;">No outstanding debts! Everyone is settled.</p>';

    container.innerHTML = `
    <div class="tab-header">
      <div class="tab-title">
        <span style="font-size: 1.5rem;">💰</span>
        <h2>Shared Cost & Ledger</h2>
      </div>
    </div>

    <div class="ledger-grid">
      <div class="ledger-main">
        <div class="summary-stat-card ledger-total-card">
            <div class="stat-label">Total Trip Cost</div>
            <div class="stat-value">$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="stat-subtext">Sum of all items with assigned payers</div>
        </div>

        <section class="ledger-section">
          <h3>Settlement Plan</h3>
          <div class="debt-list">
            ${debtItems}
          </div>
        </section>
      </div>

      <div class="ledger-sidebar">
        <section class="ledger-section">
          <h3>Individual Balances</h3>
          <div class="balance-list">
            ${balanceItems}
          </div>
        </section>

        <div class="info-card" style="margin-top: 20px; background: var(--cream);">
          <h4>How it works</h4>
          <p class="text-small text-muted">Expenses are split evenly among all travelers assigned to an item. The ledger calculates who needs to pay whom to minimize the number of transfers.</p>
        </div>
      </div>
    </div>
  `;
}
