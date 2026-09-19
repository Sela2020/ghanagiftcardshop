/* ==========================================================================
   GHANA GIFT CARD SHOP — HEADER
   --------------------------------------------------------------------------
   Renders the fixed header ONCE, into an empty <header id="siteHeader">.
   Since the header lives OUTSIDE <main>, it never reloads during SPA
   navigation — the router only swaps <main>.
   ========================================================================== */

(function () {
  'use strict';

  function renderHeader() {
    const el = document.getElementById('siteHeader');
    if (!el) return;

    el.innerHTML =
      '<div class="container header-inner">' +

        '<a class="brand" href="index.html" aria-label="Ghana Gift Card Shop home">' +
          '<span class="brand__mark" aria-hidden="true">' +
            '<img src="images/ggcs-logo.png" alt="" width="30" height="30">' +
          '</span>' +
          '<span class="brand__name">' +
            '<span class="brand__ghana">Ghana</span>' +
            '<span class="brand__sub">Gift Card Shop</span>' +
          '</span>' +
        '</a>' +

        '<button type="button" class="nav-toggle" id="navToggle" ' +
                'aria-label="Toggle navigation" aria-expanded="false" ' +
                'aria-controls="primaryNav">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
               'stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<line x1="3" y1="6"  x2="21" y2="6"></line>' +
            '<line x1="3" y1="12" x2="21" y2="12"></line>' +
            '<line x1="3" y1="18" x2="21" y2="18"></line>' +
          '</svg>' +
        '</button>' +

        '<nav class="primary-nav" id="primaryNav" aria-label="Primary">' +
          '<ul class="nav-list">' +
            '<li><a href="index.html">Home</a></li>' +
            '<li><a href="shop.html">Shop</a></li>' +
            '<li><a href="dashboard.html">Dashboard</a></li>' +
          '</ul>' +

          '<div class="nav-actions">' +
            '<button type="button" class="theme-toggle-btn" id="themeToggleBtn" ' +
                    'aria-label="Toggle visual theme">' +
              '<svg id="themeIcon" viewBox="0 0 24 24" fill="none" ' +
                   'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                   'stroke-linejoin="round">' +
                '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
              '</svg>' +
              '<span class="theme-tooltip" id="themeTooltipText">Theme: dark</span>' +
            '</button>' +

            '<a href="cart.html" class="cart-link" id="cartButton" ' +
               'aria-label="Shopping cart">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
                   'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                   'stroke-linejoin="round" aria-hidden="true">' +
                '<circle cx="9" cy="21" r="1"></circle>' +
                '<circle cx="20" cy="21" r="1"></circle>' +
                '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 ' +
                        '2-1.61L23 6H6"></path>' +
              '</svg>' +
              '<span class="cart-count tabular" id="cartCount" data-count="0">0</span>' +
            '</a>' +

            '<a href="login.html" class="btn btn--ghost btn--sm">Login</a>' +
            '<a href="register.html" class="btn btn--primary btn--sm">Register</a>' +
          '</div>' +
        '</nav>' +
      '</div>';
  }

  // Script is at the bottom of <body>, so <header id="siteHeader"> is
  // already parsed and in the DOM when this runs.
  renderHeader();
})();