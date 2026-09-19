/* ==========================================================================
   GHANA GIFT CARD SHOP — SHOP PAGE
   Registers window.PageInit.shop — the router calls it on every visit.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit.shop = function () {
  'use strict';

  const GC      = window.GC;
  const CATALOG = window.CATALOG;
  if (!GC || !CATALOG) return;

  const grid         = document.getElementById('shopGrid');
  const countEl      = document.getElementById('shopCount');
  const categoriesEl = document.getElementById('shopCategories');
  const sortSelect   = document.getElementById('shopSort');
  const searchInput  = document.getElementById('shopSearch');
  const emptyEl      = document.getElementById('shopEmpty');
  const emptyText    = document.getElementById('shopEmptyText');
  const clearBtn     = document.getElementById('shopClearFilters');

  if (!grid) return;

  /* ---------- STATE ---------- */
  let activeCategory = 'all';
  let sortBy = 'featured';
  let searchQuery = '';

  /* ---------- CATEGORY LABELS (cosmetic only) ---------- */
  const CATEGORY_LABELS = {
    'all':         'All',
    'psn':         'PlayStation',
    'xbox':        'Xbox',
    'nintendo':    'Nintendo',
    'steam':       'Steam',
    'roblox':      'Roblox',
    'google-play': 'Google Play',
    'apple':       'Apple'
  };

  /* ========================================================================
     MARKUP BUILDERS (kept in sync with index.js)
     ======================================================================== */

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

  /* ========================================================================
     HELPERS
     ======================================================================== */

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

  function flashButton(btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Added ✓';
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = original;
    }, 1200);
  }

  /** Cheapest GHS price for a product (used for sorting). */
  function minGHS(product) {
    const region = CATALOG.resolveRegion(product, null);
    const min = Math.min.apply(null, product.denominations);
    return CATALOG.computeGHS(min, region.currency);
  }

  /* ========================================================================
     RENDER
     ======================================================================== */

  function buildCategories() {
    const ids = ['all'].concat(CATALOG.all().map(function (p) { return p.id; }));
    categoriesEl.innerHTML = ids.map(function (id) {
      const label  = CATEGORY_LABELS[id] || id;
      const active = id === activeCategory ? ' is-active' : '';
      const pressed = id === activeCategory ? 'true' : 'false';
      return '<button type="button" class="shop-category' + active + '" ' +
             'data-category="' + GC.escapeHtml(id) + '" ' +
             'aria-pressed="' + pressed + '">' +
             GC.escapeHtml(label) + '</button>';
    }).join('');
  }

  function getFiltered() {
    let items = CATALOG.all();

    // 1. Category filter
    if (activeCategory !== 'all') {
      items = items.filter(function (p) { return p.id === activeCategory; });
    }

    // 2. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) !== -1 ||
               p.blurb.toLowerCase().indexOf(q) !== -1;
      });
    }

    // 3. Sort (on a copy, never on the source array)
    items = items.slice();
    if (sortBy === 'price-asc') {
      items.sort(function (a, b) { return minGHS(a) - minGHS(b); });
    } else if (sortBy === 'price-desc') {
      items.sort(function (a, b) { return minGHS(b) - minGHS(a); });
    } else if (sortBy === 'name') {
      items.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    return items;
  }

  function render() {
    const items = getFiltered();
    const total = CATALOG.all().length;

    // Count text
    const isUnfiltered = activeCategory === 'all' && !searchQuery;
    if (isUnfiltered) {
      countEl.innerHTML = 'Showing all <strong>' + total + '</strong> gift cards';
    } else {
      countEl.innerHTML = 'Showing <strong>' + items.length + '</strong> of ' + total;
    }

    // Empty state
    if (!items.length) {
      grid.innerHTML = '';
      emptyEl.hidden = false;
      // Tailor the message based on why nothing matched
      if (searchQuery) {
        emptyText.textContent = 'No gift cards match "' + searchQuery + '". Try a different search.';
      } else {
        emptyText.textContent = 'No gift cards are available in this category right now.';
      }
      return;
    }

    emptyEl.hidden = true;
    grid.innerHTML = items.map(cardMarkup).join('');
  }

  /* ========================================================================
     GRID INTERACTIONS (delegated — bound once, works for every re-render)
     ======================================================================== */

  function handleGridClick(e) {
    // Denomination button
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

    // Region toggle
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

    // Add to cart
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
    // fetch('api/add-to-cart.php', { ... });

    GC.addToCart(item);
    GC.showCartPrompt(item);
    flashButton(addBtn);
  }

  /* ========================================================================
     FILTER / SORT / SEARCH
     ======================================================================== */

  function handleCategoryClick(e) {
    const btn = e.target.closest('.shop-category');
    if (!btn) return;

    activeCategory = btn.dataset.category;
    categoriesEl.querySelectorAll('.shop-category').forEach(function (b) {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    render();
  }

  function handleSortChange() {
    sortBy = sortSelect.value;
    render();
  }

  // Debounced so we don't re-render on every keystroke
  let searchTimer = null;
  function handleSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchQuery = searchInput.value.trim();
      render();
    }, 120);
  }

  function handleClearFilters() {
    activeCategory = 'all';
    searchQuery = '';
    searchInput.value = '';
    buildCategories();
    render();
  }

  /* ========================================================================
     INIT
     ======================================================================== */

  buildCategories();
  render();

  categoriesEl.addEventListener('click', handleCategoryClick);
  sortSelect.addEventListener('change', handleSortChange);
  searchInput.addEventListener('input', handleSearchInput);
  if (clearBtn) clearBtn.addEventListener('click', handleClearFilters);
  grid.addEventListener('click', handleGridClick);
};