/* ==========================================================================
   GHANA GIFT CARD SHOP — PRODUCT CATALOGUE
   --------------------------------------------------------------------------
   Single source of truth for what we sell. Loaded by index.html, shop.html,
   and product.html.

   All products are priced in their native face currency ($ USD, £ GBP).
   Prices shown to customers are converted to GHS using RATES_TO_GHS.

   ── BACKEND HOOK ─────────────────────────────────────────────────────────
   When api/products.php exists, replace the static PRODUCTS array below
   with a fetch. Keep the same shape so nothing downstream changes.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     EXCHANGE RATES — update these to match your pricing.
     Used to convert the gift card's face value to the amount you charge
     in Ghana Cedis. These are placeholders.
     ======================================================================== */
  const RATES_TO_GHS = {
    USD: 15.50,   // 1 USD ≈ 15.50 GHS
    GBP: 19.80,   // 1 GBP ≈ 19.80 GHS
    GHS: 1
  };

  /* ========================================================================
     PRODUCTS
     ------------------------------------------------------------------------
     Fields:
       id             — slug used in cart IDs
       productId      — future FK to the products table
       name           — full display name
       blurb          — short description
       brand          — hex colour for the media-tile glow
       currency       — face currency when there's no region selector
       symbol         — symbol for the face currency (no regions)
       regions        — optional array of { code, name, currency, symbol }
                        when present, the card shows a region toggle and
                        uses the selected region's currency
       denominations  — array of face-value numbers
       image          — path to a product image ('' → initials fallback)
     ======================================================================== */
  const PRODUCTS = [
    {
      id: 'psn',
      productId: 1,
      name: 'PlayStation Store',
      blurb: 'Games, DLC and PlayStation Plus — pick your region.',
      brand: '#0070D1',
      regions: [
        { code: 'US', name: 'US Region', currency: 'USD', symbol: '$' },
        { code: 'UK', name: 'UK Region', currency: 'GBP', symbol: '£' }
      ],
      denominations: [10, 25, 50, 75, 100],
      image: 'images/psn.webp'
    },
    {
      id: 'xbox',
      productId: 2,
      name: 'Xbox',
      blurb: 'Games, Game Pass and in-game content on Xbox.',
      brand: '#107C10',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: 'images/xbox.webp'
    },
    {
      id: 'nintendo',
      productId: 3,
      name: 'Nintendo eShop',
      blurb: 'Games and add-ons for Nintendo Switch.',
      brand: '#E60012',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: 'images/nintendo.webp'
    },
    {
      id: 'steam',
      productId: 4,
      name: 'Steam',
      blurb: 'PC games, DLC and in-game items on Steam.',
      brand: '#66C0F4',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: ''
    },
    {
      id: 'roblox',
      productId: 5,
      name: 'Roblox',
      blurb: 'Robux and in-game purchases on Roblox.',
      brand: '#E2231A',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: 'images/roblox.webp'
    },
    {
      id: 'google-play',
      productId: 6,
      name: 'Google Play',
      blurb: 'Apps, games, movies and books on Android.',
      brand: '#01875F',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: 'images/google-play.webp'
    },
    {
      id: 'apple',
      productId: 7,
      name: 'Apple Gift Card',
      blurb: 'Apps, music, iCloud storage and Apple Store purchases.',
      brand: '#A1A1A6',
      currency: 'USD',
      symbol: '$',
      denominations: [10, 25, 50, 75, 100],
      image: 'images/apple.webp'
    }
  ];

  /* ========================================================================
     HELPERS
     ======================================================================== */

  function all() { return PRODUCTS.slice(); }

  function byId(id) {
    return PRODUCTS.find(function (p) { return p.id === id; }) || null;
  }

  /** Given a product and an optional region code, return its active region
      descriptor — a real region when the product has regions, otherwise a
      synthetic one built from the product's top-level currency/symbol. */
  function resolveRegion(product, regionCode) {
    if (product.regions && product.regions.length) {
      return product.regions.find(function (r) { return r.code === regionCode; })
        || product.regions[0];
    }
    return {
      code: null,
      name: null,
      currency: product.currency,
      symbol: product.symbol
    };
  }

  /** Convert a face value in `currency` to Ghana Cedis. */
  function computeGHS(faceValue, currency) {
    const rate = RATES_TO_GHS[currency] || 1;
    return Number((faceValue * rate).toFixed(2));
  }

  /**
   * Build a cart-ready line item.
   * @param {Object}  product
   * @param {string}  regionCode   e.g. 'US' or 'UK' (ignored if the product
   *                               has no regions)
   * @param {number}  denomination face value, e.g. 25
   * @param {number}  quantity
   */
  function toCartItem(product, regionCode, denomination, quantity) {
    const region = resolveRegion(product, regionCode);
    const faceLabel = region.symbol + denomination;

    const denomDisplay = region.name
      ? region.name + ' · ' + faceLabel
      : faceLabel;

    const idSuffix = region.code
      ? region.code + '-' + denomination
      : String(denomination);

    return {
      id:           product.id + '-' + idSuffix,
      productId:    product.productId,
      name:         product.name,
      denomination: denomDisplay,
      price:        computeGHS(denomination, region.currency),
      quantity:     Math.max(1, parseInt(quantity, 10) || 1),
      image:        product.image || ''
    };
  }

  /* ========================================================================
     PUBLIC API
     ======================================================================== */
  window.CATALOG = {
    RATES_TO_GHS: RATES_TO_GHS,
    all: all,
    byId: byId,
    resolveRegion: resolveRegion,
    computeGHS: computeGHS,
    toCartItem: toCartItem
  };
})();