/* ==========================================================================
   GHANA GIFT CARD SHOP — FOOTER
   --------------------------------------------------------------------------
   Same pattern as the header: rendered once, lives outside <main>, so it
   never reloads during SPA navigation.
   ========================================================================== */

(function () {
  'use strict';

  function renderFooter() {
    const el = document.getElementById('siteFooter');
    if (!el) return;

    const year = new Date().getFullYear();

    el.innerHTML =
      '<div class="container footer-inner">' +
        '<span>&copy; ' + year + ' Ghana Gift Card Shop</span>' +
        '<nav class="footer-links" aria-label="Footer">' +
          '<a href="terms.html">Terms</a>' +
          '<a href="#">Privacy</a>' +
          '<a href="terms.html#contact">Support</a>' +
        '</nav>' +
      '</div>';
  }

  renderFooter();
})();