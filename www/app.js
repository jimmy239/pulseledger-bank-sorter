import { parseNotification, parseBulkNotifications } from './parser.js';

const STORAGE_KEY = 'pulseledger_transactions_v2';
const THEME_KEY = 'pulseledger_theme_v1';

const SAMPLE_ALERTS = [
  'BCELOne A/C ••4821: Money In +1,500,000 LAK received from Khamphone Vong on 2026-11-25 09:15',
  'LDB Trust ••7710: QR Pay 85,000 LAK paid to Joma Bakery Cafe on 2026-11-25 08:40',
  'APB Meporm ••3304: ເງິນເຂົ້າ 2,400,000 ກີບ ຈາກ ບໍລິສັດ ລາວເທັກ 2026-11-24 17:30',
  'BCELOne ••4821: Transfer out 250,000 LAK to Souliya Keo on 2026-11-24 14:20',
  'JDB ••1190: LAOQR Pay 120,000 LAK at Kokkok Mart on 2026-11-23 19:05',
  'LDB ••7710: ເງິນອອກ 180,000 LAK ຊຳລະ Unitel Internet on 2026-11-23 11:10',
  'APB Meporm ••3304: Received 450,000 LAK from Noy Phonekeo on 2026-11-22 16:45',
  'U-Money: Cash Out 65,000 LAK paid to LOCA Ride on 2026-11-22 10:15',
];

const state = {
  transactions: [],
  view: 'split', // 'split' | 'all' | 'received' | 'paid'
  search: '',
  category: 'all',
  bank: 'all',
  sort: 'date-desc',
};

const els = {
  quickForm: document.getElementById('quickForm'),
  quickInput: document.getElementById('quickInput'),
  livePreview: document.getElementById('livePreview'),
  kpiReceived: document.getElementById('kpiReceived'),
  kpiReceivedCount: document.getElementById('kpiReceivedCount'),
  kpiPaid: document.getElementById('kpiPaid'),
  kpiPaidCount: document.getElementById('kpiPaidCount'),
  kpiNet: document.getElementById('kpiNet'),
  netBadge: document.getElementById('netBadge'),
  kpiTotalCount: document.getElementById('kpiTotalCount'),
  ratioPercent: document.getElementById('ratioPercent'),
  ratioBarReceived: document.getElementById('ratioBarReceived'),
  ratioBarPaid: document.getElementById('ratioBarPaid'),
  ledgerContainer: document.getElementById('ledgerContainer'),
  receivedBreakdown: document.getElementById('receivedBreakdown'),
  paidBreakdown: document.getElementById('paidBreakdown'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  bankFilter: document.getElementById('bankFilter'),
  sortSelect: document.getElementById('sortSelect'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  btnSample: document.getElementById('btnSample'),
  btnExport: document.getElementById('btnExport'),
  btnClear: document.getElementById('btnClear'),
  btnTheme: document.getElementById('btnTheme'),
  themeIcon: document.getElementById('themeIcon'),
  btnOpenBulk: document.getElementById('btnOpenBulk'),
  bulkModal: document.getElementById('bulkModal'),
  bulkTextarea: document.getElementById('bulkTextarea'),
  bulkStatus: document.getElementById('bulkStatus'),
  btnParseBulk: document.getElementById('btnParseBulk'),
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editForm'),
  editId: document.getElementById('editId'),
  editDirection: document.getElementById('editDirection'),
  editCounterparty: document.getElementById('editCounterparty'),
  editAmount: document.getElementById('editAmount'),
  editBank: document.getElementById('editBank'),
  editCategory: document.getElementById('editCategory'),
  editRawText: document.getElementById('editRawText'),
  btnDeleteTx: document.getElementById('btnDeleteTx'),
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount, currency = 'LAK') {
  if (currency === 'LAK') {
    return `${Math.round(amount).toLocaleString('en-US')} ₭`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' || currency === 'VND' || currency === 'IDR' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getPrimaryCurrency(items) {
  if (!items.length) return 'LAK';
  const counts = {};
  for (const t of items) {
    counts[t.currency] = (counts[t.currency] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function formatDate(isoStr) {
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        state.transactions = parsed;
        return;
      }
    } catch {
      // ignore corrupted storage
    }
  }
  loadSampleData(false);
}

function loadSampleData(append = false) {
  const { parsed } = parseBulkNotifications(SAMPLE_ALERTS.join('\n'));
  if (append) {
    state.transactions = [...parsed, ...state.transactions];
  } else {
    state.transactions = parsed;
  }
  saveTransactions();
  render();
}

function getFilteredAndSorted() {
  const query = state.search.trim().toLowerCase();

  const filtered = state.transactions.filter((tx) => {
    if (state.category !== 'all' && tx.category !== state.category) return false;
    if (state.bank !== 'all' && tx.bank !== state.bank) return false;
    if (query) {
      const hay = `${tx.counterparty} ${tx.bank} ${tx.category} ${tx.rawText} ${tx.amount}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (state.sort) {
      case 'date-asc':
        return new Date(a.timestamp) - new Date(b.timestamp);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'name-asc':
        return a.counterparty.localeCompare(b.counterparty);
      case 'date-desc':
      default:
        return new Date(b.timestamp) - new Date(a.timestamp);
    }
  });

  return sorted;
}

function renderFilterOptions() {
  const categories = [...new Set(state.transactions.map((t) => t.category))].sort();
  const banks = [...new Set(state.transactions.map((t) => t.bank))].sort();

  const currentCat = state.category;
  els.categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  els.categoryFilter.value = categories.includes(currentCat) ? currentCat : 'all';
  state.category = els.categoryFilter.value;

  const currentBank = state.bank;
  els.bankFilter.innerHTML = '<option value="all">All Banks</option>' +
    banks.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  els.bankFilter.value = banks.includes(currentBank) ? currentBank : 'all';
  state.bank = els.bankFilter.value;
}

function renderKPIs(items) {
  const primaryCurrency = getPrimaryCurrency(items);
  const receivedItems = items.filter((t) => t.direction === 'received');
  const paidItems = items.filter((t) => t.direction === 'paid');

  const totalReceived = receivedItems.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = paidItems.reduce((sum, t) => sum + t.amount, 0);
  const net = totalReceived - totalPaid;

  els.kpiReceived.textContent = formatMoney(totalReceived, primaryCurrency);
  els.kpiReceivedCount.textContent = `${receivedItems.length} notification${receivedItems.length === 1 ? '' : 's'}`;

  els.kpiPaid.textContent = formatMoney(totalPaid, primaryCurrency);
  els.kpiPaidCount.textContent = `${paidItems.length} notification${paidItems.length === 1 ? '' : 's'}`;

  els.kpiNet.textContent = `${net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net), primaryCurrency)}`;
  els.kpiNet.style.color = net > 0 ? 'var(--received)' : net < 0 ? 'var(--paid)' : 'var(--text)';
  els.netBadge.textContent = net > 0 ? 'Surplus' : net < 0 ? 'Deficit' : 'Balanced';
  els.netBadge.className = `kpi-badge ${net > 0 ? 'badge-received' : net < 0 ? 'badge-paid' : ''}`;
  els.kpiTotalCount.textContent = `${items.length} total sorted`;

  const totalVolume = totalReceived + totalPaid;
  const recPct = totalVolume > 0 ? Math.round((totalReceived / totalVolume) * 100) : 50;
  const paidPct = totalVolume > 0 ? 100 - recPct : 50;
  els.ratioPercent.textContent = totalVolume > 0 ? `${recPct}% / ${paidPct}%` : '0% / 0%';
  els.ratioBarReceived.style.width = `${recPct}%`;
  els.ratioBarPaid.style.width = `${paidPct}%`;
}

function renderTransactionItem(tx) {
  const isRec = tx.direction === 'received';
  const sign = isRec ? '+' : '-';
  const arrow = isRec ? '↓' : '↑';

  return `
    <div class="tx-item" data-id="${escapeHtml(tx.id)}" role="button" tabindex="0">
      <div class="tx-left">
        <div class="tx-icon ${tx.direction}" aria-hidden="true">${arrow}</div>
        <div class="tx-info">
          <div class="tx-title">${escapeHtml(tx.counterparty)}</div>
          <div class="tx-sub">
            <span class="pill">${escapeHtml(tx.category)}</span>
            <span>${escapeHtml(tx.bank)}</span>
          </div>
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${tx.direction}">${sign}${formatMoney(tx.amount, tx.currency)}</div>
        <div class="tx-date">${formatDate(tx.timestamp)}</div>
      </div>
    </div>
  `;
}

function renderColumn(title, badgeClass, items, emptyMsg) {
  const primaryCurrency = getPrimaryCurrency(items);
  const total = items.reduce((s, t) => s + t.amount, 0);
  return `
    <div class="card column-card">
      <div class="column-header">
        <h2>
          <span>${escapeHtml(title)}</span>
          <span class="pill">${items.length}</span>
        </h2>
        <span class="column-total ${badgeClass}">
          ${badgeClass === 'received' ? '+' : '-'}${formatMoney(total, primaryCurrency)}
        </span>
      </div>
      <div class="tx-list">
        ${items.length ? items.map(renderTransactionItem).join('') : `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`}
      </div>
    </div>
  `;
}

function renderLedger(items) {
  const received = items.filter((t) => t.direction === 'received');
  const paid = items.filter((t) => t.direction === 'paid');

  if (state.view === 'split') {
    els.ledgerContainer.innerHTML = `
      <div class="split-grid">
        ${renderColumn('Money Received', 'received', received, 'No incoming bank alerts match your filters.')}
        ${renderColumn('Money Paid', 'paid', paid, 'No outgoing payment alerts match your filters.')}
      </div>
    `;
  } else if (state.view === 'received') {
    els.ledgerContainer.innerHTML = renderColumn(
      'Money Received (Sorted)',
      'received',
      received,
      'No incoming bank alerts match your filters.'
    );
  } else if (state.view === 'paid') {
    els.ledgerContainer.innerHTML = renderColumn(
      'Money Paid (Sorted)',
      'paid',
      paid,
      'No outgoing payment alerts match your filters.'
    );
  } else {
    els.ledgerContainer.innerHTML = `
      <div class="card column-card">
        <div class="column-header">
          <h2><span>All Sorted Notifications</span> <span class="pill">${items.length}</span></h2>
        </div>
        <div class="tx-list">
          ${items.length ? items.map(renderTransactionItem).join('') : '<div class="empty-state">No bank notifications yet. Paste one above!</div>'}
        </div>
      </div>
    `;
  }
}

function renderBreakdown(container, items, direction) {
  const subset = items.filter((t) => t.direction === direction);
  const primaryCurrency = getPrimaryCurrency(subset);
  const total = subset.reduce((s, t) => s + t.amount, 0);

  if (!subset.length || total === 0) {
    container.innerHTML = '<p class="empty-state" style="padding: 16px 0;">No data to display.</p>';
    return;
  }

  const byCat = {};
  for (const tx of subset) {
    byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount;
  }

  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

  container.innerHTML = sortedCats
    .map(([cat, amt]) => {
      const pct = Math.round((amt / total) * 100);
      return `
        <div class="breakdown-row">
          <div class="breakdown-label-row">
            <span>${escapeHtml(cat)}</span>
            <strong>${formatMoney(amt, primaryCurrency)} (${pct}%)</strong>
          </div>
          <div class="breakdown-track">
            <div class="breakdown-fill ${direction}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function render() {
  renderFilterOptions();
  const items = getFilteredAndSorted();
  renderKPIs(items);
  renderLedger(items);
  renderBreakdown(els.receivedBreakdown, items, 'received');
  renderBreakdown(els.paidBreakdown, items, 'paid');
}

function updateLivePreview() {
  const val = els.quickInput.value.trim();
  if (!val) {
    els.livePreview.classList.add('hidden');
    els.livePreview.innerHTML = '';
    return;
  }

  const parsed = parseNotification(val);
  els.livePreview.classList.remove('hidden');

  if (!parsed) {
    els.livePreview.innerHTML = '<span class="pill">Waiting for an amount (e.g. $25.00)...</span>';
    return;
  }

  const badgeClass = parsed.direction === 'received' ? 'badge-received' : 'badge-paid';
  const label = parsed.direction === 'received' ? 'RECEIVED' : 'PAID';
  els.livePreview.innerHTML = `
    <span class="kpi-badge ${badgeClass}">${label}</span>
    <strong>${formatMoney(parsed.amount, parsed.currency)}</strong>
    <span>• ${escapeHtml(parsed.counterparty)}</span>
    <span class="pill">${escapeHtml(parsed.bank)}</span>
    <span class="pill">${escapeHtml(parsed.category)}</span>
  `;
}

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function openEditModal(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;

  els.editId.value = tx.id;
  els.editDirection.value = tx.direction;
  els.editCounterparty.value = tx.counterparty;
  els.editAmount.value = tx.amount;
  els.editBank.value = tx.bank;
  els.editCategory.value = tx.category;
  els.editRawText.textContent = tx.rawText;
  openModal(els.editModal);
}

function exportCSV() {
  const items = getFilteredAndSorted();
  if (!items.length) return;

  const headers = ['Direction', 'Amount', 'Currency', 'Counterparty', 'Bank', 'Category', 'Date', 'Raw Notification'];
  const rows = items.map((t) => [
    t.direction === 'received' ? 'Money Received' : 'Money Paid',
    t.amount.toFixed(2),
    t.currency,
    `"${t.counterparty.replace(/"/g, '""')}"`,
    `"${t.bank.replace(/"/g, '""')}"`,
    `"${t.category.replace(/"/g, '""')}"`,
    t.timestamp,
    `"${t.rawText.replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pulseledger-sorted-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  els.themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function bindEvents() {
  els.quickInput.addEventListener('input', updateLivePreview);

  els.quickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tx = parseNotification(els.quickInput.value);
    if (!tx) return;
    state.transactions.unshift(tx);
    saveTransactions();
    els.quickInput.value = '';
    updateLivePreview();
    render();
  });

  els.tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.view = btn.dataset.view;
      render();
    });
  });

  els.searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });

  els.categoryFilter.addEventListener('change', (e) => {
    state.category = e.target.value;
    render();
  });

  els.bankFilter.addEventListener('change', (e) => {
    state.bank = e.target.value;
    render();
  });

  els.sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  els.ledgerContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.tx-item');
    if (item) openEditModal(item.dataset.id);
  });

  els.btnSample.addEventListener('click', () => loadSampleData(false));
  els.btnExport.addEventListener('click', exportCSV);
  els.btnClear.addEventListener('click', () => {
    state.transactions = [];
    saveTransactions();
    render();
  });

  els.btnTheme.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    els.themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  els.btnOpenBulk.addEventListener('click', () => {
    els.bulkStatus.textContent = '';
    openModal(els.bulkModal);
  });

  els.btnParseBulk.addEventListener('click', () => {
    const { parsed, failed } = parseBulkNotifications(els.bulkTextarea.value);
    if (!parsed.length) {
      els.bulkStatus.textContent = 'No valid bank notifications found. Make sure each line contains an amount.';
      return;
    }
    state.transactions = [...parsed, ...state.transactions];
    saveTransactions();
    render();
    els.bulkTextarea.value = '';
    els.bulkStatus.textContent = `Sorted ${parsed.length} alert(s)${failed.length ? `, skipped ${failed.length} line(s) without amounts` : ''}.`;
    setTimeout(() => closeModal(els.bulkModal), 700);
  });

  els.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = els.editId.value;
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return;

    state.transactions[idx] = {
      ...state.transactions[idx],
      direction: els.editDirection.value,
      counterparty: els.editCounterparty.value.trim(),
      amount: parseFloat(els.editAmount.value) || state.transactions[idx].amount,
      bank: els.editBank.value.trim(),
      category: els.editCategory.value.trim(),
    };
    saveTransactions();
    closeModal(els.editModal);
    render();
  });

  els.btnDeleteTx.addEventListener('click', () => {
    const id = els.editId.value;
    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveTransactions();
    closeModal(els.editModal);
    render();
  });

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = document.getElementById(el.dataset.close);
      if (target) closeModal(target);
    });
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ignore registration failures in unsupported environments
    });
  }
}

initTheme();
loadTransactions();
bindEvents();
render();
registerServiceWorker();
