/* ==========================================================================
   GHANA GIFT CARD SHOP — SHARED APPLICATION SCRIPT
   --------------------------------------------------------------------------
   Loaded by every page. Provides:

     1. CONFIG            — storage keys, currency
     2. STORAGE           — safe localStorage wrappers
     3. FORMATTERS        — currency, initials, HTML escape
     4. THEME             — Light / Dark / System cycle with persistence
     5. CART              — localStorage cart
     6. TOASTS            — non-blocking notifications
     7. CART PROMPT       — the "Added to your cart" modal
     8. SMOOTH ANCHORS    — in-page #link scrolling with header offset
     9. CLOSE ALL MODALS  — force-cleanup, called by the router
    10. INIT              — global bindings
    11. PUBLIC API        — window.GC

   Exposes everything page scripts need via window.GC. Page-specific logic
   (rendering, form validation, etc.) lives in /js/<page>.js.

   NOTE: never write the literal closing tag of a script or style element
   inside a comment in those files — the HTML parser will end the block.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     1. CONFIG
     ======================================================================== */
  const KEYS = {
    cart:  'ggcs_cart',
    user:  'ggcs_user',
    theme: 'ggcs_theme'
  };

  const CURRENCY = { locale: 'en-GH', code: 'GHS' };

  /* ========================================================================
     2. STORAGE
     ======================================================================== */
  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      console.warn('[GGCS] read failed for', key, err);
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[GGCS] write failed for', key, err);
      return false;
    }
  }

  /* ========================================================================
     3. FORMATTERS
     ======================================================================== */
  function formatCurrency(amount) {
    return new Intl.NumberFormat(CURRENCY.locale, {
      style: 'currency',
      currency: CURRENCY.code,
      minimumFractionDigits: 2
    }).format(Number(amount) || 0);
  }

  function initials(text) {
    if (!text) return '??';
    return String(text).trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ========================================================================
     4. THEME CONTROLLER (Light -> Dark -> System)
     ======================================================================== */
  const THEME_CYCLE = ['dark', 'light', 'system'];
  let currentThemeIndex = 0;

  const THEME_ICONS = {
    dark:   '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
    light:  '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
    system: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>'
  };

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function applyTheme(themeName) {
    const effective = themeName === 'system' ? systemTheme() : themeName;
    document.documentElement.setAttribute('data-theme', effective);

    // Swap the icon
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = THEME_ICONS[themeName] || THEME_ICONS.dark;

    // Update the tooltip
    const tip = document.getElementById('themeTooltipText');
    if (tip) {
      const next = THEME_CYCLE[(THEME_CYCLE.indexOf(themeName) + 1) % THEME_CYCLE.length];
      tip.textContent = 'Theme: ' + themeName + ' (click for ' + next + ')';
    }

    // Keep <meta name="theme-color"> in sync with the browser chrome
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', effective === 'light' ? '#FAFAFA' : '#0B0B0E');
  }

  function setTheme(themeName) {
    if (THEME_CYCLE.indexOf(themeName) === -1) themeName = 'dark';
    currentThemeIndex = THEME_CYCLE.indexOf(themeName);
    writeStore(KEYS.theme, themeName);
    applyTheme(themeName);
  }

  function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[currentThemeIndex]);
  }

  function initTheme() {
    const saved = readStore(KEYS.theme, 'dark');
    setTheme(saved);

    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', cycleTheme);

    // Follow OS theme when the user has chosen "system"
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (readStore(KEYS.theme, 'dark') === 'system') applyTheme('system');
      });
    }
  }

  /* ========================================================================
     5. CART
     ------------------------------------------------------------------------
     Line item shape (mirrors the future DB row):
       { id, productId, name, denomination, price, quantity, image }
     `price` is always in GHS. `denomination` is the face-value label
     (e.g. "US Region · $25") for display in the cart.
     ======================================================================== */
  function getCart() {
    const cart = readStore(KEYS.cart, []);
    return Array.isArray(cart) ? cart : [];
  }

  function saveCart(cart) {
    writeStore(KEYS.cart, cart);
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('ggcs:cart-updated', { detail: { cart: cart } }));
  }

  function addToCart(item) {
    const cart = getCart();
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const existing = cart.find(function (l) { return l.id === item.id; });

    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id:           String(item.id),
        productId:    item.productId || null,
        name:         item.name || 'Gift Card',
        denomination: item.denomination || '',
        price:        Number(item.price) || 0,
        quantity:     qty,
        image:        item.image || ''
      });
    }
    saveCart(cart);
    return cart;
  }

  function updateCartQuantity(id, quantity) {
    const cart = getCart();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return removeFromCart(id);

    const line = cart.find(function (l) { return l.id === id; });
    if (line) line.quantity = qty;
    saveCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    const cart = getCart().filter(function (l) { return l.id !== id; });
    saveCart(cart);
    return cart;
  }

  function clearCart() { saveCart([]); return []; }

  function getCartCount() {
    return getCart().reduce(function (sum, l) {
      return sum + (parseInt(l.quantity, 10) || 0);
    }, 0);
  }

  function getCartTotal() {
    return getCart().reduce(function (sum, l) {
      return sum + (Number(l.price) || 0) * (parseInt(l.quantity, 10) || 0);
    }, 0);
  }

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('#cartCount').forEach(function (el) {
      el.textContent = count;
      el.dataset.count = String(count);
    });
  }

  /* ========================================================================
     6. TOASTS
     ======================================================================== */
  function showToast(message, type) {
    const kind = type === 'error' ? 'error' : 'success';

    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast--' + kind;
    toast.textContent = message;
    stack.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, { once: true });
    }, 2800);
  }

  /* ========================================================================
     7. CART PROMPT (modal)
     ------------------------------------------------------------------------
     After adding to cart, the page blurs and this dialog appears. It:
       • captures keyboard focus (Tab cycles inside the dialog)
       • locks background scrolling
       • closes on Escape, backdrop click, or "Continue shopping"
       • returns focus to whatever the user was on when it closes
     ======================================================================== */

  /** Currently open prompt backdrop (only one at a time). */
  let activePrompt = null;

  /** Element to restore focus to when the modal closes. */
  let promptReturnFocus = null;

  /**
   * Build a natural-reading label like:
   *   "USA Region $100 PlayStation Store Gift Card"
   * from a cart item shaped like:
   *   { name: 'PlayStation Store', denomination: 'US Region · $100' }
   */
  function buildItemLabel(item) {
    let region = '';
    let amount = item.denomination || '';

    // Items with a region use a "·" separator, e.g. "US Region · $100"
    if (amount.indexOf('·') !== -1) {
      const parts = amount.split('·').map(function (s) { return s.trim(); });
      region = parts[0].replace('Region', '').trim();
      amount = parts[1];
    }
    if (region === 'US') region = 'USA';

    const regionPart = region ? region + ' Region ' : '';
    return regionPart + amount + ' ' + item.name + ' Gift Card';
  }

  /** Close the current modal (if any): restore scroll, focus, and cleanup. */
  function dismissCartPrompt() {
    const backdrop = activePrompt;
    if (!backdrop) return;

    activePrompt = null;
    document.body.classList.remove('is-modal-open');
    document.removeEventListener('keydown', onPromptKeydown);

    // Animate out, then remove from the DOM
    backdrop.classList.add('is-leaving');
    backdrop.addEventListener('animationend', function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, { once: true });

    // Return focus to whatever was focused before the modal opened
    if (promptReturnFocus && typeof promptReturnFocus.focus === 'function') {
      try { promptReturnFocus.focus(); } catch (err) { /* element gone */ }
    }
    promptReturnFocus = null;
  }

  /** Keyboard handler: Escape closes; Tab cycles within the dialog. */
  function onPromptKeydown(e) {
    if (!activePrompt) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      dismissCartPrompt();
      return;
    }

    // Focus trap — keep Tab inside the dialog
    if (e.key !== 'Tab') return;

    const focusables = activePrompt.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first  = focusables[0];
    const last   = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * Show the "Added to your cart" modal.
   * @param {Object} item — the same object passed to addToCart()
   */
  function showCartPrompt(item) {
    // Only one modal at a time
    if (activePrompt) dismissCartPrompt();

    // Remember what had focus so we can restore it on close
    promptReturnFocus = document.activeElement;

    const label = buildItemLabel(item);

    const backdrop = document.createElement('div');
    backdrop.className = 'cart-prompt-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'cartPromptTitle');

    backdrop.innerHTML =
      '<div class="cart-prompt">' +
        '<div class="cart-prompt__icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
          '</svg>' +
        '</div>' +
        '<h2 class="cart-prompt__title" id="cartPromptTitle">Added to your cart</h2>' +
        '<p class="cart-prompt__text">&ldquo;<strong>' + escapeHtml(label) +
          '</strong>&rdquo; is waiting. What would you like to do next?</p>' +
        '<div class="cart-prompt__actions">' +
          '<button type="button" class="btn btn--secondary" ' +
                  'data-action="dismiss">Continue shopping</button>' +
          '<a href="cart.html" class="btn btn--primary">Go to cart</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.classList.add('is-modal-open'); // locks page scroll
    activePrompt = backdrop;

    // "Continue shopping" closes the modal
    backdrop.querySelector('[data-action="dismiss"]')
      .addEventListener('click', dismissCartPrompt);

    // "Go to cart" closes the modal first, then lets the link navigate.
    // Without this, the backdrop would linger on the next page because the
    // router only swaps <main> and the backdrop lives on <body>.
    const goToCart = backdrop.querySelector('a[href="cart.html"]');
    if (goToCart) {
      goToCart.addEventListener('click', function () {
        dismissCartPrompt();
      });
    }

    // Click outside the dialog (on the blurred backdrop) also closes it
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) dismissCartPrompt();
    });

    // Escape key + focus trap
    document.addEventListener('keydown', onPromptKeydown);

    // Move focus into the dialog so screen readers announce it
    const firstBtn = backdrop.querySelector('[data-action="dismiss"]');
    if (firstBtn) firstBtn.focus();
  }

  /* ========================================================================
     8. SMOOTH ANCHOR SCROLL
     ------------------------------------------------------------------------
     Handles clicks on in-page anchors (href="#section"). Scrolls to the
     target with an offset for the fixed header. Runs on every page.
     ======================================================================== */
  function bindSmoothAnchors() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      e.preventDefault();

      // Compute the top of the target, then subtract the header height + gap
      const headerH = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h')
      , 10) || 64;

      const top = target.getBoundingClientRect().top
                + window.pageYOffset
                - headerH
                - 16;

      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

      // Update the URL without triggering a jump
      if (history.replaceState) {
        history.replaceState(null, '', hash);
      }
    });
  }

  /* ========================================================================
     9. CLOSE ALL MODALS
     ------------------------------------------------------------------------
     Force-removes any open modal backdrop. Called by the router before
     navigation so a lingering overlay never sits on top of the new page.
     Also exposed as GC.closeAllModals() for page scripts.
     ======================================================================== */
  function closeAllModals() {
    // Cart prompt (uses module state, so clean up properly)
    if (activePrompt) {
      if (activePrompt.parentNode) activePrompt.parentNode.removeChild(activePrompt);
      activePrompt = null;
      document.removeEventListener('keydown', onPromptKeydown);
      promptReturnFocus = null;
    }

    // Any other modal backdrops that might be lingering
    document.querySelectorAll(
      '.cart-prompt-backdrop, .codes-modal-backdrop, .checkout-processing'
    ).forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    document.body.classList.remove('is-modal-open');
  }

  /* ========================================================================
     10. INIT (global bindings only — page scripts handle the rest)
     ======================================================================== */
  function bindNav() {
    const toggle = document.getElementById('navToggle');
    const nav    = document.getElementById('primaryNav');
    if (!toggle || !nav) return;

    function closeNav() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openNav() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    // Toggle on button click
    toggle.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeNav();
      else openNav();
    });

    // Close when a link inside the nav is tapped (mobile only)
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.innerWidth <= 960) {
        closeNav();
      }
    });

    // Close when the user scrolls the page
    window.addEventListener('scroll', function () {
      if (nav.classList.contains('is-open')) closeNav();
    }, { passive: true });

    // Close when the user taps outside the nav panel
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target)) return;
      if (toggle.contains(e.target)) return;
      closeNav();
    });

    // Close when the viewport is resized to desktop width
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960 && nav.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  function setFooterYear() {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    initTheme();
    bindNav();
    setFooterYear();
    updateCartBadge();
    bindSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ========================================================================
     11. PUBLIC API
     ======================================================================== */
  window.GC = {
    KEYS: KEYS,
    CURRENCY: CURRENCY,

    // Auth (placeholder until PHP)
    getCurrentUser: function () { return readStore(KEYS.user, null); },

    // Cart
    getCart: getCart,
    saveCart: saveCart,
    addToCart: addToCart,
    updateCartQuantity: updateCartQuantity,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    getCartCount: getCartCount,
    getCartTotal: getCartTotal,
    updateCartBadge: updateCartBadge,

    // Formatters
    formatCurrency: formatCurrency,
    initials: initials,
    escapeHtml: escapeHtml,

    // UI
    showToast: showToast,
    showCartPrompt: showCartPrompt,
    closeAllModals: closeAllModals,

    // Theme
    setTheme: setTheme,
    cycleTheme: cycleTheme
  };
})();
