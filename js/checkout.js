/* ==========================================================================
   GHANA GIFT CARD SHOP — CHECKOUT PAGE
   Registers window.PageInit.checkout.
   --------------------------------------------------------------------------
   Flow:
     1. Read the cart from localStorage
     2. Show empty state if cart is empty
     3. Validate the contact + delivery form
     4. Save the order locally (until PHP + Paystack are wired up)
     5. Clear the cart, then redirect to order-confirmation.html

   BACKEND HOOK: replace saveOrder() with a POST to api/init-payment.php
   that creates a Paystack transaction. See the notes in that function.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit.checkout = function () {
  'use strict';

  const GC = window.GC;
  if (!GC) { console.warn('[Checkout] GC missing'); return; }

  /* ---------- DOM ---------- */
  const els = {
    form:        document.getElementById('checkoutForm'),
    layout:      document.getElementById('checkoutLayout'),
    empty:       document.getElementById('checkoutEmpty'),
    alert:       document.getElementById('checkoutAlert'),
    fullName:    document.getElementById('coName'),
    email:       document.getElementById('coEmail'),
    phone:       document.getElementById('coPhone'),
    submitBtn:   document.getElementById('coSubmit'),
    items:       document.getElementById('summaryItems'),
    countLabel:  document.getElementById('summaryCount'),
    subtotal:    document.getElementById('summarySubtotal'),
    total:       document.getElementById('summaryTotal')
  };

  if (!els.form) return;

  /* ========================================================================
     1. STATE
     ======================================================================== */
  const ORDERS_KEY = 'ggcs_orders';
  const LAST_ORDER_KEY = 'ggcs_last_order';

  /* ========================================================================
     2. HELPERS
     ======================================================================== */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  function brandFor(name) {
    if (!window.CATALOG) return '';
    const match = window.CATALOG.all().find(function (p) {
      return p.name.toLowerCase() === String(name).toLowerCase();
    });
    return match ? match.brand : '';
  }

  /** Generate a fresh order ID like GGCS-2026-1043. */
  function generateOrderId() {
    let max = 1042;
    try {
      const stored = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
      stored.forEach(function (o) {
        const match = String(o.id || '').match(/(\d+)$/);
        if (match) max = Math.max(max, parseInt(match[1], 10));
      });
    } catch (err) { /* ignore */ }
    return 'GGCS-' + new Date().getFullYear() + '-' + (max + 1);
  }

  /* ========================================================================
     3. RENDER SUMMARY
     ======================================================================== */
  function renderSummary() {
    const cart = GC.getCart();

    // Empty cart → show empty state
    if (!cart.length) {
      if (els.layout) els.layout.hidden = true;
      if (els.empty)  els.empty.hidden = false;
      return;
    }

    if (els.layout) els.layout.hidden = false;
    if (els.empty)  els.empty.hidden = true;

    // Item rows
    els.items.innerHTML = cart.map(function (item) {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = Number(item.price) || 0;
      const subtotal = price * qty;
      const brand = brandFor(item.name);
      const brandAttr = brand ? ' style="--brand:' + esc(brand) + '"' : '';

      const thumb = item.image
        ? '<img class="summary-item__img" src="' + esc(item.image) + '" alt="">'
        : '<span>' + esc(initials(item.name)) + '</span>';

      return (
        '<div class="summary-item">' +
          '<div class="summary-item__thumb"' + brandAttr + '>' + thumb + '</div>' +
          '<div class="summary-item__info">' +
            '<div class="summary-item__name">' + esc(item.name) + '</div>' +
            '<div class="summary-item__meta">' +
              esc(item.denomination) + ' · Qty ' + qty +
            '</div>' +
          '</div>' +
          '<div class="summary-item__price">' +
            GC.formatCurrency(subtotal) +
          '</div>' +
        '</div>'
      );
    }).join('');

    // Counts + totals
    const count = GC.getCartCount();
    const total = GC.getCartTotal();

    if (els.countLabel) {
      els.countLabel.textContent = count + ' item' + (count === 1 ? '' : 's');
    }
    if (els.subtotal) els.subtotal.textContent = GC.formatCurrency(total);
    if (els.total)    els.total.textContent = GC.formatCurrency(total);

    // Mirror the total into the mobile bar and the summary badge
    const formatted = GC.formatCurrency(total);
    const barTotal = document.getElementById('mobileBarTotal');
    if (barTotal) barTotal.textContent = formatted;
    const badge = document.getElementById('summaryTotalBadge');
    if (badge) badge.textContent = formatted;
  }

  /* ========================================================================
     4. PREFILL (if user is logged in)
     ======================================================================== */
  function prefill() {
    const user = GC.getCurrentUser && GC.getCurrentUser();
    if (!user) return;
    if (user.name && els.fullName && !els.fullName.value) {
      els.fullName.value = user.name;
    }
    if (user.email && els.email && !els.email.value) {
      els.email.value = user.email;
    }
  }

  /* ========================================================================
     5. FORM VALIDATION
     ======================================================================== */
  function setError(field, message) {
    field.classList.add('has-error');
    field.setAttribute('aria-invalid', 'true');
    const errEl = document.getElementById(field.id + 'Error');
    if (errEl) { errEl.textContent = message; errEl.classList.add('is-visible'); }
  }

  function clearError(field) {
    field.classList.remove('has-error');
    field.removeAttribute('aria-invalid');
    const errEl = document.getElementById(field.id + 'Error');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('is-visible'); }
  }

  function validate() {
    let valid = true;
    let firstInvalid = null;

    // Name
    const name = els.fullName.value.trim();
    if (name.length < 2) {
      setError(els.fullName, 'Please enter your full name.');
      valid = false; firstInvalid = firstInvalid || els.fullName;
    } else { clearError(els.fullName); }

    // Email
    const email = els.email.value.trim();
    if (!email) {
      setError(els.email, 'Email is required.');
      valid = false; firstInvalid = firstInvalid || els.email;
    } else if (!EMAIL_RE.test(email)) {
      setError(els.email, 'Please enter a valid email address.');
      valid = false; firstInvalid = firstInvalid || els.email;
    } else { clearError(els.email); }

    // Phone
    const phone = els.phone.value.replace(/\D/g, '');
    if (phone.length < 9) {
      setError(els.phone, 'Please enter a valid phone number.');
      valid = false; firstInvalid = firstInvalid || els.phone;
    } else { clearError(els.phone); }

    // Delivery method
    const delivery = els.form.querySelector('input[name="delivery"]:checked');
    if (!delivery) {
      showAlert('error', 'Please choose a delivery method.');
      valid = false;
    }

    if (firstInvalid && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
    }
    return valid;
  }

  /* ========================================================================
     6. ALERT BOX
     ======================================================================== */
  function showAlert(type, message) {
    if (!els.alert) return;
    els.alert.className = 'checkout-alert checkout-alert--' + type;
    els.alert.textContent = message;
    els.alert.hidden = false;
    els.alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideAlert() {
    if (!els.alert) return;
    els.alert.hidden = true;
    els.alert.textContent = '';
  }

  /* ========================================================================
     7. SAVE ORDER
     ------------------------------------------------------------------------
     TEMPORARY frontend-only version. Saves the order to localStorage so the
     confirmation page can display it.

     ── BACKEND HOOK ────────────────────────────────────────────────────────
     Replace the body of this function with:

       const res = await fetch('api/init-payment.php', {
         method: 'POST',
         credentials: 'same-origin',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       });
       const data = await res.json();
       if (!data.success) throw new Error(data.message);

       // data.authorization_url points to Paystack
       window.location.href = data.authorization_url;

     The PHP endpoint creates a Paystack transaction with the cart total,
     stores a pending order, and returns the authorization URL.
     ======================================================================== */
  async function saveOrder(payload) {
    // Simulate network round-trip so the "processing" state is visible
    await new Promise(function (r) { setTimeout(r, 1400); });

    // Build an order record in the same shape the dashboard expects
    const order = {
      id:             payload.id,
      date:           new Date().toISOString(),
      status:         'pending',
      paymentMethod:  'Paystack',
      deliveryMethod: payload.deliveryMethod,
      customer: {
        name:  payload.name,
        email: payload.email,
        phone: payload.phone
      },
      total:          payload.total,
      items:          payload.items.map(function (i) {
        return {
          name:         i.name,
          denomination: i.denomination,
          quantity:     i.quantity,
          price:        i.price,
          image:        i.image || ''
          // codes will arrive here once the backend marks the order completed
        };
      })
    };

    // Append to the order history (newest first)
    let all = [];
    try { all = JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
    catch (err) { all = []; }
    all.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));

    // Hand the fresh order to the confirmation page
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));

    return order;
  }

  /* ========================================================================
     8. PROCESSING OVERLAY
     ======================================================================== */
  function showProcessing() {
    const overlay = document.createElement('div');
    overlay.className = 'checkout-processing';
    overlay.id = 'checkoutProcessing';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="checkout-processing__inner">' +
        '<div class="checkout-processing__spinner"></div>' +
        '<h2 class="checkout-processing__title">Processing your order</h2>' +
        '<p class="checkout-processing__text">' +
          'Please don\'t close this tab. Once confirmed, you\'ll be ' +
          'redirected to your order details.' +
        '</p>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('is-modal-open');
  }

  function hideProcessing() {
    const overlay = document.getElementById('checkoutProcessing');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.body.classList.remove('is-modal-open');
  }

  /* ========================================================================
     9. SUBMIT
     ======================================================================== */
  async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();

    if (!validate()) return;

    const cart = GC.getCart();
    if (!cart.length) {
      showAlert('error', 'Your cart is empty.');
      return;
    }

    const deliveryInput = els.form.querySelector('input[name="delivery"]:checked');
    const deliveryMethod = deliveryInput ? deliveryInput.value : 'Email';

    const payload = {
      id:             generateOrderId(),
      name:           els.fullName.value.trim(),
      email:          els.email.value.trim().toLowerCase(),
      phone:          els.phone.value.trim(),
      deliveryMethod: deliveryMethod,
      total:          GC.getCartTotal(),
      items:          cart
    };

    els.submitBtn.disabled = true;
    syncMobileSubmit(true);
    showProcessing();

    try {
      await saveOrder(payload);

      // Clear the cart now that the order is placed
      GC.clearCart();

      // Brief pause so the user sees the "processing" state finish
      setTimeout(function () {
        if (window.Router && window.Router.navigate) {
          window.Router.navigate('order-confirmation.html');
        } else {
          window.location.href = 'order-confirmation.html';
        }
      }, 500);

    } catch (err) {
      console.error('[Checkout] Failed:', err);
      hideProcessing();
      els.submitBtn.disabled = false;
      syncMobileSubmit(false);
      showAlert('error', err.message || 'Something went wrong. Please try again.');
    }
  }

  /* ========================================================================
     10. PHONE FORMATTING (Ghana)
     ------------------------------------------------------------------------
     As the user types, reshape the number into 024 533 2299 style for
     readability. Digits only in the underlying value — the pattern is
     cosmetic.
     ======================================================================== */
  function formatPhoneInput(e) {
    const input = e.target;
    let digits = input.value.replace(/\D/g, '').slice(0, 10);

    // Local numbers are 0XXXXXXXXX (10 digits).
    // International +233XXXXXXXXX (12 digits) also accepted.
    if (digits.length <= 3) {
      input.value = digits;
    } else if (digits.length <= 6) {
      input.value = digits.slice(0, 3) + ' ' + digits.slice(3);
    } else {
      input.value =
        digits.slice(0, 3) + ' ' +
        digits.slice(3, 6) + ' ' +
        digits.slice(6);
    }
  }

  /* ========================================================================
     11. LIVE ERROR CLEARING
     ======================================================================== */
  function bindFieldCleanup() {
    [els.fullName, els.email, els.phone].forEach(function (field) {
      if (!field) return;
      field.addEventListener('input', function () {
        if (field.classList.contains('has-error')) clearError(field);
      });
    });
  }

  /* ========================================================================
     12. SUMMARY TOGGLE (mobile)
     ------------------------------------------------------------------------
     On mobile the summary collapses into a button. The button is hidden on
     desktop via CSS, so this handler is harmless there.
     ======================================================================== */
  function bindSummaryToggle() {
    const toggle = document.getElementById('checkoutSummaryToggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  /* ========================================================================
     13. MOBILE ACTION BAR
     ------------------------------------------------------------------------
     The sticky bar at the bottom shows the total and a Place Order button.
     The button lives outside the form but uses the form="checkoutForm"
     attribute to submit it. We just need to keep its disabled state in sync
     with the main submit button.
     ======================================================================== */
  function syncMobileSubmit(disabled) {
    const btn = document.getElementById('mobileSubmitBtn');
    if (btn) btn.disabled = !!disabled;
  }

  /* ========================================================================
     14. INIT
     ======================================================================== */
  renderSummary();
  prefill();
  bindSummaryToggle();

  // If cart is empty, don't wire the form
  if (!GC.getCart().length) return;

  els.form.addEventListener('submit', handleSubmit);
  if (els.phone) els.phone.addEventListener('input', formatPhoneInput);
  bindFieldCleanup();

  // Re-render if the cart changes elsewhere (unlikely on this page, but safe)
  document.addEventListener('ggcs:cart-updated', renderSummary);
};
