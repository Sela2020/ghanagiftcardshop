/* ==========================================================================
   GHANA GIFT CARD SHOP — DASHBOARD PAGE
   Registers window.PageInit.dashboard.
   --------------------------------------------------------------------------
   Order shape (mirrors the future SQL columns):
     {
       id, date, status, paymentMethod, deliveryMethod, total,
       items: [
         { name, denomination, quantity, price, image, codes: ['...', '...'] }
       ]
     }
   `codes` is present for completed orders only.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit.dashboard = function () {
  'use strict';

  const GC = window.GC;
  if (!GC) { console.warn('[Dashboard] GC missing'); return; }

  const main = document.getElementById('main');
  if (!main) return;

  /* ---------- DOM ---------- */
  const els = {
    greeting:    document.getElementById('dashGreeting'),
    sub:         document.getElementById('dashSub'),
    statTotal:   document.getElementById('statTotal'),
    statSpent:   document.getElementById('statSpent'),
    statPending: document.getElementById('statPending'),
    statDone:    document.getElementById('statDone'),
    loader:      document.getElementById('dashLoader'),
    wrap:        document.getElementById('ordersWrap'),
    tbody:       document.getElementById('ordersBody'),
    empty:       document.getElementById('dashEmpty'),
    emptyText:   document.getElementById('dashEmptyText'),
    chips:       document.getElementById('dashFilters'),
    refresh:     document.getElementById('dashRefresh'),
    clearBtn:    document.getElementById('dashClearDemo')
  };

  /* ---------- STATE ---------- */
  const ORDERS_KEY = 'ggcs_orders';
  let activeFilter = 'all';
  let orders = [];

  /* ========================================================================
     1. DEMO DATA
     ------------------------------------------------------------------------
     Completed orders have a `codes` array on each item. Pending and
     cancelled orders do not. Delete this whole function (and its call in
     init) once api/orders.php returns real data.
     ======================================================================== */
  function seedDemoOrders() {
    if (localStorage.getItem(ORDERS_KEY)) return;

    const demo = [
      {
        id: 'GGCS-2026-1042',
        date: '2026-09-12T10:24:00Z',
        status: 'completed',
        paymentMethod: 'Mobile Money',
        deliveryMethod: 'WhatsApp',
        total: 990.00,
        items: [
          {
            name: 'PlayStation Store',
            denomination: 'UK Region · £50',
            quantity: 1,
            price: 990.00,
            image: 'images/psn.webp',
            codes: ['EMJJ-9QNQ-9JCD']
          }
        ]
      },
      {
        id: 'GGCS-2026-1038',
        date: '2026-09-08T16:02:00Z',
        status: 'pending',
        paymentMethod: 'Card',
        deliveryMethod: 'Email',
        total: 1550.00,
        items: [
          {
            name: 'Steam',
            denomination: '$100',
            quantity: 1,
            price: 1550.00,
            image: ''
          }
        ]
      },
      {
        id: 'GGCS-2026-1027',
        date: '2026-08-29T09:15:00Z',
        status: 'completed',
        paymentMethod: 'Card',
        deliveryMethod: 'Email',
        total: 1550.00,
        items: [
          {
            name: 'Google Play',
            denomination: '$50',
            quantity: 2,
            price: 775.00,
            image: 'images/google-play.webp',
            codes: ['GBPL-7X4K-2M8N', 'GBPL-5F9W-3R6T']
          }
        ]
      },
      {
        id: 'GGCS-2026-1019',
        date: '2026-08-21T13:47:00Z',
        status: 'cancelled',
        paymentMethod: 'Mobile Money',
        deliveryMethod: 'WhatsApp',
        total: 387.50,
        items: [
          {
            name: 'Roblox',
            denomination: '$25',
            quantity: 1,
            price: 387.50,
            image: 'images/roblox.webp'
          }
        ]
      },
      {
        id: 'GGCS-2026-1011',
        date: '2026-08-14T11:30:00Z',
        status: 'completed',
        paymentMethod: 'Card',
        deliveryMethod: 'Email',
        total: 2325.00,
        items: [
          {
            name: 'Nintendo eShop',
            denomination: '$100',
            quantity: 1,
            price: 1550.00,
            image: 'images/nintendo.webp',
            codes: ['NSHP-8K2M-5J7Q']
          },
          {
            name: 'Apple Gift Card',
            denomination: '$50',
            quantity: 1,
            price: 775.00,
            image: 'images/apple.webp',
            codes: ['APPL-3F9X-6W1V']
          }
        ]
      }
    ];

    localStorage.setItem(ORDERS_KEY, JSON.stringify(demo));
  }

  /* ========================================================================
     2. DATA LOADING
     ------------------------------------------------------------------------
     BACKEND HOOK: when api/orders.php exists, replace this with a fetch:
       const res = await fetch('api/orders.php', { credentials: 'same-origin' });
       const data = await res.json();
       return data.orders;
     ======================================================================== */
  function loadOrders() {
    return new Promise(function (resolve) {
      setTimeout(function () {
        let stored = [];
        try {
          stored = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
          if (!Array.isArray(stored)) stored = [];
        } catch (err) { stored = []; }
        resolve(stored);
      }, 400);
    });
  }

  /* ========================================================================
     3. HELPERS
     ======================================================================== */
  function formatDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(d);
  }

  function cardCount(order) {
    return (order.items || []).reduce(function (sum, i) {
      return sum + (parseInt(i.quantity, 10) || 0);
    }, 0);
  }

  function brandFor(name) {
    if (!window.CATALOG) return '';
    const match = window.CATALOG.all().find(function (p) {
      return p.name.toLowerCase() === String(name).toLowerCase();
    });
    return match ? match.brand : '';
  }

  function initials(text) {
    if (!text) return '??';
    return String(text).trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** True when an order has at least one item with a non-empty codes array. */
  function orderHasCodes(order) {
    if (order.status !== 'completed') return false;
    return (order.items || []).some(function (i) {
      return Array.isArray(i.codes) && i.codes.length;
    });
  }

  /** Collect every code across every item in an order. */
  function allCodesFor(order) {
    const out = [];
    (order.items || []).forEach(function (item) {
      (item.codes || []).forEach(function (code) {
        out.push(code);
      });
    });
    return out;
  }

  /* ========================================================================
     4. RENDER — STATS
     ======================================================================== */
  function renderStats() {
    const total = orders.length;

    // Cancelled orders don't count toward money spent
    const spent = orders.reduce(function (sum, o) {
      return o.status === 'cancelled' ? sum : sum + (Number(o.total) || 0);
    }, 0);

    const pending = orders.filter(function (o) { return o.status === 'pending'; }).length;
    const done    = orders.filter(function (o) { return o.status === 'completed'; }).length;

    if (els.statTotal)   els.statTotal.textContent = total;
    if (els.statSpent)   els.statSpent.textContent = GC.formatCurrency(spent);
    if (els.statPending) els.statPending.textContent = pending;
    if (els.statDone)    els.statDone.textContent = done;
  }

  /* ========================================================================
     5. RENDER — TABLE
     ======================================================================== */

  /** Items cell: thumbnail + first item name + "+N more" summary. */
  function itemsCell(order) {
    const items = order.items || [];
    if (!items.length) return '<span class="u-text-muted">No items</span>';

    const first = items[0];
    const extra = items.length > 1 ? ' +' + (items.length - 1) + ' more' : '';
    const brand = brandFor(first.name);
    const brandAttr = brand ? ' style="--brand:' + esc(brand) + '"' : '';
    const count = cardCount(order);

    return (
      '<div class="ord-item">' +
        '<span class="ord-thumb"' + brandAttr + '>' +
          '<span>' + esc(initials(first.name)) + '</span>' +
        '</span>' +
        '<div>' +
          '<div class="ord-item__name">' + esc(first.name) + extra + '</div>' +
          '<div class="ord-item__meta">' + count + ' card' +
            (count === 1 ? '' : 's') + ' · ' + esc(first.denomination) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function statusBadge(status) {
    const s = String(status || '').toLowerCase();
    const allowed = ['pending', 'completed', 'cancelled'];
    const modifier = allowed.indexOf(s) !== -1 ? s : 'pending';
    const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
    return '<span class="status-badge status-badge--' + modifier + '">' +
           esc(label) + '</span>';
  }

  /**
   * Codes cell: shows up to 2 codes inline with copy buttons.
   * If there are more than 2, the extras sit behind a "+N more" button
   * that opens the modal.
   */
  function codesCell(order) {
    // No codes yet
    if (!orderHasCodes(order)) {
      if (order.status === 'pending') {
        return '<span class="codes-pending">Processing</span>';
      }
      return '<span class="u-text-muted">—</span>';
    }

    const allCodes = allCodesFor(order);
    const shown = allCodes.slice(0, 2);
    const hidden = allCodes.length - shown.length;

    const codeRows = shown.map(function (code) {
      return (
        '<div class="code-inline">' +
          '<span class="code-inline__value">' + esc(code) + '</span>' +
          '<button type="button" class="code-inline__copy" ' +
                  'data-code="' + esc(code) + '" ' +
                  'aria-label="Copy code ' + esc(code) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
              '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
            '</svg>' +
          '</button>' +
        '</div>'
      );
    }).join('');

    const moreBtn = hidden > 0
      ? '<button type="button" class="code-inline__more btn-codes" ' +
        'data-order-id="' + esc(order.id) + '">+' + hidden + ' more</button>'
      : '';

    return '<div class="codes-cell">' + codeRows + moreBtn + '</div>';
  }

  function renderTable() {
    const visible = activeFilter === 'all'
      ? orders
      : orders.filter(function (o) { return o.status === activeFilter; });

    if (!visible.length) {
      if (els.wrap)  els.wrap.hidden = true;
      if (els.empty) els.empty.hidden = false;

      if (els.emptyText) {
        if (!orders.length) {
          els.emptyText.textContent =
            'Your orders will appear here as soon as you place your first one.';
        } else {
          els.emptyText.textContent =
            'No orders match the "' + activeFilter + '" filter.';
        }
      }
      return;
    }

    if (els.empty) els.empty.hidden = true;
    if (els.wrap)  els.wrap.hidden = false;

    els.tbody.innerHTML = visible.map(function (order) {
      return (
        '<tr>' +
          '<td class="is-mono">' + esc(order.id) + '</td>' +
          '<td class="u-text-muted">' + formatDate(order.date) + '</td>' +
          '<td>' + itemsCell(order) + '</td>' +
          '<td class="is-numeric">' + cardCount(order) + '</td>' +
          '<td class="is-numeric is-strong">' +
            GC.formatCurrency(order.total) + '</td>' +
          '<td>' + statusBadge(order.status) + '</td>' +
          '<td class="is-numeric">' + codesCell(order) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  /* ========================================================================
     6. RENDER — GREETING
     ======================================================================== */
  function renderGreeting() {
    const user = GC.getCurrentUser();
    if (els.greeting) {
      els.greeting.textContent = (user && user.name)
        ? 'Welcome back, ' + user.name.split(' ')[0]
        : 'Your Dashboard';
    }
    if (els.sub) {
      els.sub.textContent = 'Track your orders and view your gift card codes.';
    }
  }

  /* ========================================================================
     7. CODES MODAL
     ------------------------------------------------------------------------
     Opens when an order has more than 2 codes, or from a "+N more" button.
     Also used to redeem instructions. Codes shown inline in the table
     are the primary path; this is the fallback for larger orders.
     ======================================================================== */
  let activeModal = null;
  let modalReturnFocus = null;

  function itemBlockMarkup(item) {
    const brand = brandFor(item.name);
    const brandAttr = brand ? ' style="--brand:' + esc(brand) + '"' : '';
    const codes = Array.isArray(item.codes) ? item.codes : [];

    const codeRows = codes.map(function (code) {
      return (
        '<div class="code-row">' +
          '<span class="code-row__value">' + esc(code) + '</span>' +
          '<button type="button" class="code-row__copy" ' +
                  'data-code="' + esc(code) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
              '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
            '</svg>' +
            '<span>Copy</span>' +
          '</button>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="code-item">' +
        '<div class="code-item__head">' +
          '<span class="code-item__thumb"' + brandAttr + '>' +
            '<span>' + esc(initials(item.name)) + '</span>' +
          '</span>' +
          '<div class="code-item__info">' +
            '<div class="code-item__name">' + esc(item.name) + '</div>' +
            '<div class="code-item__denom">' +
              esc(item.denomination) + ' · ' + codes.length + ' code' +
              (codes.length === 1 ? '' : 's') +
            '</div>' +
          '</div>' +
        '</div>' +
        codeRows +
      '</div>'
    );
  }

  function dismissCodesModal() {
    const backdrop = activeModal;
    if (!backdrop) return;

    activeModal = null;
    document.body.classList.remove('is-modal-open');
    document.removeEventListener('keydown', onModalKeydown);

    backdrop.classList.add('is-leaving');
    backdrop.addEventListener('animationend', function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, { once: true });

    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') {
      try { modalReturnFocus.focus(); } catch (err) { /* element gone */ }
    }
    modalReturnFocus = null;
  }

  function onModalKeydown(e) {
    if (!activeModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      dismissCodesModal();
      return;
    }

    // Focus trap
    if (e.key !== 'Tab') return;
    const focusables = activeModal.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  function showCodesModal(order) {
    if (activeModal) dismissCodesModal();
    modalReturnFocus = document.activeElement;

    const itemsWithCodes = (order.items || []).filter(function (i) {
      return Array.isArray(i.codes) && i.codes.length;
    });

    const backdrop = document.createElement('div');
    backdrop.className = 'codes-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'codesModalTitle');

    backdrop.innerHTML =
      '<div class="codes-modal">' +
        '<div class="codes-modal__head">' +
          '<div>' +
            '<h2 class="codes-modal__title" id="codesModalTitle">' +
              'Your gift card codes' +
            '</h2>' +
            '<span class="codes-modal__sub">' + esc(order.id) + '</span>' +
          '</div>' +
          '<button type="button" class="codes-modal__close" ' +
                  'aria-label="Close">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                 'stroke-width="2" stroke-linecap="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="codes-modal__body">' +
          itemsWithCodes.map(itemBlockMarkup).join('') +
        '</div>' +
        '<div class="codes-modal__foot">' +
          'Redeem each code on the brand\'s official store or console. ' +
          'Keep these codes private. If you have any issue redeeming one, ' +
          'message us on WhatsApp and we\'ll sort it out.' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.classList.add('is-modal-open');
    activeModal = backdrop;

    backdrop.querySelector('.codes-modal__close')
      .addEventListener('click', dismissCodesModal);

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) dismissCodesModal();
    });

    // Copy buttons inside the modal
    backdrop.querySelectorAll('.code-row__copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const code = btn.getAttribute('data-code');
        copyToClipboard(code).then(function (ok) {
          if (!ok) return;
          const label = btn.querySelector('span');
          const original = label ? label.textContent : 'Copy';
          btn.classList.add('is-copied');
          if (label) label.textContent = 'Copied';
          setTimeout(function () {
            btn.classList.remove('is-copied');
            if (label) label.textContent = original;
          }, 1600);
        });
      });
    });

    document.addEventListener('keydown', onModalKeydown);

    const closeBtn = backdrop.querySelector('.codes-modal__close');
    if (closeBtn) closeBtn.focus();
  }

  /* ========================================================================
     8. CLIPBOARD
     ======================================================================== */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      console.warn('[Dashboard] Copy failed:', err);
      return false;
    }
  }

  /* ========================================================================
     9. INTERACTIONS
     ======================================================================== */
  function handleTableClick(e) {
    // Inline copy button
    const copyBtn = e.target.closest('.code-inline__copy');
    if (copyBtn) {
      const code = copyBtn.getAttribute('data-code');
      copyToClipboard(code).then(function (ok) {
        if (!ok) return;
        copyBtn.classList.add('is-copied');
        setTimeout(function () {
          copyBtn.classList.remove('is-copied');
        }, 1400);
      });
      return;
    }

    // "+N more" button opens the full modal
    const moreBtn = e.target.closest('.btn-codes');
    if (!moreBtn) return;

    const orderId = moreBtn.getAttribute('data-order-id');
    const order = orders.find(function (o) { return o.id === orderId; });
    if (!order) return;

    showCodesModal(order);
  }

  function handleFilterClick(e) {
    const chip = e.target.closest('.dash-chip');
    if (!chip) return;

    activeFilter = chip.dataset.status || 'all';

    els.chips.querySelectorAll('.dash-chip').forEach(function (c) {
      const on = c === chip;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });

    renderTable();
  }

  function showLoading() {
    if (els.loader) els.loader.hidden = false;
    if (els.wrap)   els.wrap.hidden = true;
    if (els.empty)  els.empty.hidden = true;
  }

  async function refresh() {
    showLoading();

    if (els.refresh) {
      els.refresh.disabled = true;
      els.refresh.textContent = 'Loading…';
    }

    try {
      orders = await loadOrders();
      renderStats();
      renderTable();
    } catch (err) {
      console.error('[Dashboard] Failed to load orders:', err);
      if (els.loader) els.loader.hidden = true;
      if (els.empty)  els.empty.hidden = false;
      if (els.emptyText) {
        els.emptyText.textContent = 'Could not load your orders. Please try again.';
      }
    } finally {
      if (els.loader) els.loader.hidden = true;
      if (els.refresh) {
        els.refresh.disabled = false;
        els.refresh.textContent = 'Refresh';
      }
    }
  }

  function handleClearDemo() {
    if (!confirm('Clear all demo orders? This only affects this browser.')) return;
    localStorage.removeItem(ORDERS_KEY);
    orders = [];
    renderStats();
    renderTable();
    GC.showToast('Demo orders cleared');
  }

  /* ========================================================================
     10. INIT
     ======================================================================== */
  try {
    seedDemoOrders();
    renderGreeting();

    if (els.chips)    els.chips.addEventListener('click', handleFilterClick);
    if (els.tbody)    els.tbody.addEventListener('click', handleTableClick);
    if (els.refresh)  els.refresh.addEventListener('click', refresh);
    if (els.clearBtn) els.clearBtn.addEventListener('click', handleClearDemo);

    refresh();
  } catch (err) {
    console.error('[Dashboard] Init failed:', err);
    if (els.loader) els.loader.hidden = true;
    if (els.empty)  els.empty.hidden = false;
  }
};