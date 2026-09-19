/* ==========================================================================
   GHANA GIFT CARD SHOP — ORDER CONFIRMATION PAGE
   Registers window.PageInit['order-confirmation'].
   --------------------------------------------------------------------------
   Reads the just-placed order from sessionStorage (written by checkout.js)
   and renders a thank-you page with the order summary, timeline, and the
   delivery method chosen at checkout.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit['order-confirmation'] = function () {
  'use strict';

  const GC = window.GC;
  if (!GC) return;

  const root = document.getElementById('ocRoot');
  if (!root) return;

  const LAST_ORDER_KEY = 'ggcs_last_order';

  /* ========================================================================
     HELPERS
     ======================================================================== */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initials(text) {
    if (!text) return '??';
    return String(text).trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function brandFor(name) {
    if (!window.CATALOG) return '';
    const match = window.CATALOG.all().find(function (p) {
      return p.name.toLowerCase() === String(name).toLowerCase();
    });
    return match ? match.brand : '';
  }

  function formatDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

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
    } catch (err) { return false; }
  }

  /* ========================================================================
     LOAD ORDER
     ======================================================================== */
  function loadOrder() {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.id) return null;
      return parsed;
    } catch (err) {
      console.warn('[Confirmation] Could not read order:', err);
      return null;
    }
  }

  /* ========================================================================
     EMPTY STATE
     ------------------------------------------------------------------------
     Shown when the page is loaded without a recent order (e.g. after a
     hard refresh in a new tab, or if the user navigates here directly).
     ======================================================================== */
  function renderEmpty() {
    root.innerHTML =
      '<div class="oc-empty">' +
        '<div class="oc-empty__icon" aria-hidden="true">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" ' +
               'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
               'stroke-linejoin="round">' +
            '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>' +
            '<line x1="3" y1="6" x2="21" y2="6"></line>' +
            '<path d="M16 10a4 4 0 0 1-8 0"></path>' +
          '</svg>' +
        '</div>' +
        '<h1 class="oc-empty__title">No recent order</h1>' +
        '<p class="oc-empty__text">' +
          'We don\'t have a recent order to show on this page. ' +
          'If you just placed one, you can find it on your dashboard.' +
        '</p>' +
        '<div class="oc-actions">' +
          '<a href="dashboard.html" class="btn btn--primary">View my dashboard</a>' +
          '<a href="shop.html" class="btn btn--secondary">Browse gift cards</a>' +
        '</div>' +
      '</div>';
  }

  /* ========================================================================
     SUCCESS RENDER
     ======================================================================== */

  function itemsMarkup(items) {
    return (items || []).map(function (item) {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = Number(item.price) || 0;
      const subtotal = price * qty;
      const brand = brandFor(item.name);
      const brandAttr = brand ? ' style="--brand:' + esc(brand) + '"' : '';

      const thumb = item.image
        ? '<img class="oc-item__img" src="' + esc(item.image) + '" alt="">'
        : '<span>' + esc(initials(item.name)) + '</span>';

      return (
        '<div class="oc-item">' +
          '<div class="oc-item__thumb"' + brandAttr + '>' + thumb + '</div>' +
          '<div class="oc-item__info">' +
            '<div class="oc-item__name">' + esc(item.name) + '</div>' +
            '<div class="oc-item__meta">' +
              esc(item.denomination) + ' · Qty ' + qty +
            '</div>' +
          '</div>' +
          '<div class="oc-item__price">' + GC.formatCurrency(subtotal) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /** Wording for step 3 depends on the delivery method the user chose. */
  function deliveryLine(method) {
    if (method === 'WhatsApp') {
      return 'Your codes arrive on WhatsApp at the number you gave us.';
    }
    return 'Your codes arrive by email at the address you gave us.';
  }

  function contactLabel(order) {
    if (order.deliveryMethod === 'WhatsApp') {
      return (order.customer && order.customer.phone) || '—';
    }
    return (order.customer && order.customer.email) || '—';
  }

  function render(order) {
    const total = Number(order.total) || 0;
    const items = order.items || [];

    root.innerHTML =
      // ---- Success hero ----
      '<div class="oc-hero">' +
        '<div class="oc-hero__icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
          '</svg>' +
        '</div>' +

        '<h1 class="oc-hero__title">Thank you for your order</h1>' +
        '<p class="oc-hero__sub">' +
          'We\'ve received your order. You\'ll get a confirmation on your ' +
          'chosen channel, and your codes will arrive within 3 hours.' +
        '</p>' +

        '<div class="oc-order-id">' +
          '<span class="oc-order-id__label">Order</span>' +
          '<span class="oc-order-id__value">' + esc(order.id) + '</span>' +
          '<button type="button" class="oc-order-id__copy" id="ocCopyId">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
              '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
            '</svg>' +
            '<span>Copy</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // ---- Two-column content ----
      '<div class="oc-grid">' +

        // ----- Left column -----
        '<div class="oc-main">' +

          // What happens next
          '<section class="oc-card" aria-labelledby="ocNextHeading">' +
            '<h2 class="oc-card__title" id="ocNextHeading">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                   'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"></circle>' +
                '<polyline points="12 6 12 12 16 14"></polyline>' +
              '</svg>' +
              'What happens next' +
            '</h2>' +
            '<ol class="oc-timeline">' +
              '<li>' +
                '<span class="oc-timeline__dot is-active" aria-hidden="true"></span>' +
                '<div class="oc-timeline__body">' +
                  '<strong>Order received</strong>' +
                  '<span>We have your order and payment details.</span>' +
                '</div>' +
              '</li>' +
              '<li>' +
                '<span class="oc-timeline__dot" aria-hidden="true"></span>' +
                '<div class="oc-timeline__body">' +
                  '<strong>Payment confirmed</strong>' +
                  '<span>Paystack processes your payment and notifies us.</span>' +
                '</div>' +
              '</li>' +
              '<li>' +
                '<span class="oc-timeline__dot" aria-hidden="true"></span>' +
                '<div class="oc-timeline__body">' +
                  '<strong>Codes delivered</strong>' +
                  '<span>' + esc(deliveryLine(order.deliveryMethod)) + '</span>' +
                '</div>' +
              '</li>' +
            '</ol>' +
          '</section>' +

          // Order summary
          '<section class="oc-card" aria-labelledby="ocSummaryHeading">' +
            '<h2 class="oc-card__title" id="ocSummaryHeading">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                   'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="3" width="18" height="18" rx="2"></rect>' +
                '<line x1="9" y1="9" x2="15" y2="9"></line>' +
                '<line x1="9" y1="13" x2="15" y2="13"></line>' +
                '<line x1="9" y1="17" x2="13" y2="17"></line>' +
              '</svg>' +
              'Order summary' +
            '</h2>' +

            '<div class="oc-items">' + itemsMarkup(items) + '</div>' +

            '<dl class="oc-totals">' +
              '<div class="oc-totals__row">' +
                '<dt>Subtotal</dt>' +
                '<dd>' + GC.formatCurrency(total) + '</dd>' +
              '</div>' +
              '<div class="oc-totals__row">' +
                '<dt>Processing fee</dt>' +
                '<dd>' + GC.formatCurrency(0) + '</dd>' +
              '</div>' +
              '<div class="oc-totals__row">' +
                '<dt>Delivery</dt>' +
                '<dd>Free</dd>' +
              '</div>' +
              '<div class="oc-totals__row oc-totals__row--total">' +
                '<dt>Total</dt>' +
                '<dd>' + GC.formatCurrency(total) + '</dd>' +
              '</div>' +
            '</dl>' +
          '</section>' +
        '</div>' +

        // ----- Right column -----
        '<aside class="oc-side">' +

          // Delivery card
          '<section class="oc-card" aria-labelledby="ocDeliveryHeading">' +
            '<h2 class="oc-card__title" id="ocDeliveryHeading">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                   'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
              '</svg>' +
              'Delivery' +
            '</h2>' +
            '<dl>' +
              '<div class="oc-info-row">' +
                '<dt>Method</dt>' +
                '<dd>' + esc(order.deliveryMethod || 'Email') + '</dd>' +
              '</div>' +
              '<div class="oc-info-row">' +
                '<dt>Sent to</dt>' +
                '<dd>' + esc(contactLabel(order)) + '</dd>' +
              '</div>' +
              '<div class="oc-info-row">' +
                '<dt>Placed</dt>' +
                '<dd>' + formatDate(order.date) + '</dd>' +
              '</div>' +
            '</dl>' +
          '</section>' +

          // Need help card
          '<section class="oc-card" aria-labelledby="ocHelpHeading">' +
            '<h2 class="oc-card__title" id="ocHelpHeading">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                   'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"></circle>' +
                '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>' +
                '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
              '</svg>' +
              'Need help?' +
            '</h2>' +
            '<p class="u-text-muted u-text-sm u-mb-4">' +
              'If your codes don\'t arrive within 3 hours, message us and ' +
              'we\'ll sort it out.' +
            '</p>' +
            '<a href="https://wa.me/233245332299" target="_blank" ' +
               'rel="noopener noreferrer" class="btn btn--secondary btn--block">' +
              'Chat on WhatsApp' +
            '</a>' +
          '</section>' +

        '</aside>' +
      '</div>' +

      // ---- Actions ----
      '<div class="oc-actions">' +
        '<a href="dashboard.html" class="btn btn--primary btn--lg">' +
          'View my dashboard' +
        '</a>' +
        '<a href="shop.html" class="btn btn--secondary btn--lg">' +
          'Continue shopping' +
        '</a>' +
      '</div>';

    // Wire the copy button
    const copyBtn = document.getElementById('ocCopyId');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyToClipboard(order.id).then(function (ok) {
          if (!ok) return;
          copyBtn.classList.add('is-copied');
          const label = copyBtn.querySelector('span');
          const original = label ? label.textContent : 'Copy';
          if (label) label.textContent = 'Copied';
          setTimeout(function () {
            copyBtn.classList.remove('is-copied');
            if (label) label.textContent = original;
          }, 1600);
        });
      });
    }
  }

  /* ========================================================================
     INIT
     ======================================================================== */
  const order = loadOrder();
  if (order) render(order);
  else renderEmpty();
};