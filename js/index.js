/* ==========================================================================
   GHANA GIFT CARD SHOP — HOME PAGE SCRIPT
   Registers window.PageInit.index — called by the router on every visit.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit.index = function () {
  'use strict';

  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const GC      = window.GC;
  const CATALOG = window.CATALOG;

  /* ---------- MARKUP BUILDERS ---------- */

  function denomButtonsMarkup(product, region) {
    return product.denominations.map(function (value, i) {
      const active  = i === 0 ? ' is-active' : '';
      const pressed = i === 0 ? 'true' : 'false';
      return (
        '<button type="button" class="denom-btn' + active + '" ' +
                'data-value="' + value + '" role="radio" ' +
                'aria-checked="' + pressed + '" ' +
                'aria-label="' + region.symbol + value + '">' +
          region.symbol + value +
        '</button>'
      );
    }).join('');
  }

  function regionToggleMarkup(product) {
    if (!product.regions || !product.regions.length) return '';
    const buttons = product.regions.map(function (r, i) {
      const active  = i === 0 ? ' is-active' : '';
      const pressed = i === 0 ? 'true' : 'false';
      return '<button type="button" class="region-btn' + active + '" ' +
             'data-region="' + r.code + '" aria-pressed="' + pressed + '">' +
             r.code + '</button>';
    }).join('');
    return (
      '<div class="product-card__region">' +
        '<span class="product-card__region-label">Region</span>' +
        '<div class="region-toggle" role="group" aria-label="Region">' +
          buttons +
        '</div>' +
      '</div>'
    );
  }

  function mediaMarkup(product) {
    if (product.image) {
      return '<img class="product-card__image" src="' +
        GC.escapeHtml(product.image) + '" alt="" width="54" height="54" loading="lazy">';
    }
    return '<span class="product-card__logo" aria-hidden="true">' +
      GC.escapeHtml(GC.initials(product.name)) + '</span>';
  }

  function cardMarkup(product) {
    const defaultRegion = CATALOG.resolveRegion(product, null);
    const firstValue = product.denominations[0];
    const initialPay = CATALOG.computeGHS(firstValue, defaultRegion.currency);
    const brandAttr = product.brand
      ? ' style="--brand:' + GC.escapeHtml(product.brand) + '"' : '';

    return (
      '<article class="product-card" data-product-id="' +
          GC.escapeHtml(product.id) + '"' + brandAttr + '>' +
        '<div class="product-card__media">' + mediaMarkup(product) + '</div>' +
        '<div class="product-card__body">' +
          '<div>' +
            '<h3 class="product-card__name">' + GC.escapeHtml(product.name) + '</h3>' +
            '<p class="product-card__blurb">'  + GC.escapeHtml(product.blurb) + '</p>' +
          '</div>' +
          regionToggleMarkup(product) +
          '<div class="product-card__field">' +
            '<span class="product-card__label">Choose amount</span>' +
            '<div class="denom-grid" role="radiogroup" aria-label="Denomination">' +
              denomButtonsMarkup(product, defaultRegion) +
            '</div>' +
          '</div>' +
          '<div class="product-card__pay">' +
            '<span class="product-card__pay-label">You pay</span>' +
            '<span class="product-card__pay-value tabular js-pay">' +
              GC.formatCurrency(initialPay) +
            '</span>' +
          '</div>' +
          '<button type="button" class="btn btn--primary btn--block js-add">' +
            'Add to Cart' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderFeatured() {
    grid.innerHTML = CATALOG.all().map(cardMarkup).join('');
  }

  /* ---------- HELPERS ---------- */

  function getCardProduct(card) { return CATALOG.byId(card.dataset.productId); }

  function getActiveRegionCode(card) {
    const active = card.querySelector('.region-btn.is-active');
    return active ? active.dataset.region : null;
  }

  function getActiveDenom(card) {
    const btn = card.querySelector('.denom-btn.is-active');
    return btn ? Number(btn.dataset.value) : null;
  }

  function updateCardPrice(card) {
    const product = getCardProduct(card);
    if (!product) return;
    const value = getActiveDenom(card);
    if (value == null) return;
    const region = CATALOG.resolveRegion(product, getActiveRegionCode(card));
    const ghs = CATALOG.computeGHS(value, region.currency);
    const payEl = card.querySelector('.js-pay');
    if (payEl) payEl.textContent = GC.formatCurrency(ghs);
  }

  function flashButton(btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Added ✓';
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = original;
    }, 1200);
  }

  function applyRegionToCard(card, regionCode) {
    const product = getCardProduct(card);
    if (!product || !product.regions) return;
    const region = CATALOG.resolveRegion(product, regionCode);
    card.querySelectorAll('.denom-btn').forEach(function (btn) {
      const value = Number(btn.dataset.value);
      btn.textContent = region.symbol + value;
      btn.setAttribute('aria-label', region.symbol + value);
    });
    updateCardPrice(card);
  }

  /* ---------- INTERACTIONS ---------- */

  function bindGrid() {
    grid.addEventListener('click', function (e) {
      const denomBtn = e.target.closest('.denom-btn');
      if (denomBtn) {
        const card = denomBtn.closest('.product-card');
        card.querySelectorAll('.denom-btn').forEach(function (b) {
          const on = b === denomBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
        updateCardPrice(card);
        return;
      }

      const regionBtn = e.target.closest('.region-btn');
      if (regionBtn) {
        const card = regionBtn.closest('.product-card');
        card.querySelectorAll('.region-btn').forEach(function (b) {
          const on = b === regionBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        applyRegionToCard(card, regionBtn.dataset.region);
        return;
      }

      const addBtn = e.target.closest('.js-add');
      if (!addBtn) return;

      const card = addBtn.closest('.product-card');
      const product = getCardProduct(card);
      if (!product) return;

      const regionCode = getActiveRegionCode(card);
      const value = getActiveDenom(card);
      if (value == null) return;

      const item = CATALOG.toCartItem(product, regionCode, value, 1);

      // BACKEND HOOK: mirror this when api/add-to-cart.php exists.
      // fetch('api/add-to-cart.php', {
      //   method: 'POST',
      //   credentials: 'same-origin',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(item)
      // });

      GC.addToCart(item);
      GC.showCartPrompt(item);
      flashButton(addBtn);
    });
  }

  renderFeatured();
  bindGrid();
};