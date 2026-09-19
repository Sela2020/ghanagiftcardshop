/* ==========================================================================
   GHANA GIFT CARD SHOP — CART PAGE SCRIPT
   Registers window.PageInit.cart — called by the router on every visit.
   ========================================================================== */

window.PageInit = window.PageInit || {};

window.PageInit.cart = function () {
  'use strict';

  const GC = window.GC;
  if (!GC) return;

  const els = {
    list:     document.getElementById('cartList'),
    empty:    document.getElementById('cartEmpty'),
    summary:  document.getElementById('cartSummary'),
    count:    document.getElementById('cartItemCount'),
    subtotal: document.getElementById('summarySubtotal'),
    total:    document.getElementById('summaryTotal'),
    clearBtn: document.getElementById('clearCartBtn')
  };

  if (!els.list) return;

  /* ---------- HELPERS ---------- */

  function initials(name) {
    if (!name) return '??';
    return String(name).trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function brandColorFor(item) {
    if (!window.CATALOG) return '';
    const match = window.CATALOG.all().find(function (p) {
      return p.productId === item.productId;
    });
    return match ? match.brand : '';
  }

  /* ---------- RENDER ---------- */

  function itemMarkup(item) {
    const qty      = parseInt(item.quantity, 10) || 0;
    const price    = Number(item.price) || 0;
    const subtotal = price * qty;
    const brand    = brandColorFor(item);
    const brandAttr = brand ? ' style="--brand:' + escapeHtml(brand) + '"' : '';
    const decDisabled = qty <= 1 ? ' disabled' : '';

    const media = item.image
      ? '<img class="cart-item__img" src="' + escapeHtml(item.image) + '" alt="" loading="lazy">'
      : '<span class="cart-item__logo">' + escapeHtml(initials(item.name)) + '</span>';

    return (
      '<article class="cart-item" data-id="' + escapeHtml(item.id) + '">' +
        '<div class="cart-item__media"' + brandAttr + '>' + media + '</div>' +
        '<div class="cart-item__body">' +
          '<h3 class="cart-item__name">' + escapeHtml(item.name) + ' Gift Card</h3>' +
          '<span class="cart-item__denom">' + escapeHtml(item.denomination) + '</span>' +
          '<span class="cart-item__unit">Unit price: <strong>' +
            GC.formatCurrency(price) + '</strong></span>' +
        '</div>' +
        '<div class="cart-item__actions">' +
          '<div class="qty-stepper" role="group" aria-label="Quantity">' +
            '<button type="button" class="qty-stepper__btn" ' +
                    'data-action="dec" aria-label="Decrease quantity"' +
                    decDisabled + '>&minus;</button>' +
            '<span class="qty-stepper__value" aria-live="polite">' + qty + '</span>' +
            '<button type="button" class="qty-stepper__btn" ' +
                    'data-action="inc" aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<span class="cart-item__subtotal tabular">' +
            GC.formatCurrency(subtotal) + '</span>' +
          '<button type="button" class="cart-item__remove" ' +
                  'data-action="remove" aria-label="Remove item">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
                 'stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    const cart = GC.getCart();

    if (!cart.length) {
      els.list.hidden = true;
      els.summary.hidden = true;
      els.empty.hidden = false;
      return;
    }

    els.list.hidden = false;
    els.summary.hidden = false;
    els.empty.hidden = true;

    els.list.innerHTML = cart.map(itemMarkup).join('');

    const count    = GC.getCartCount();
    const subtotal = GC.getCartTotal();

    els.count.innerHTML = '<strong>' + count + '</strong> ' +
      (count === 1 ? 'item' : 'items') + ' in your cart';
    els.subtotal.textContent = GC.formatCurrency(subtotal);
    els.total.textContent    = GC.formatCurrency(subtotal);
  }

  /* ---------- ACTIONS ---------- */

  function removeItem(id, rowEl) {
    rowEl.classList.add('is-removing');
    setTimeout(function () {
      GC.removeFromCart(id);
      GC.showToast('Item removed from cart');
      render();
    }, 200);
  }

  function handleListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = btn.closest('.cart-item');
    if (!row) return;

    const id = row.dataset.id;
    const action = btn.dataset.action;
    const cart = GC.getCart();
    const item = cart.find(function (l) { return l.id === id; });
    if (!item) return;

    if (action === 'inc') {
      GC.updateCartQuantity(id, item.quantity + 1);
      render();
    } else if (action === 'dec') {
      if (item.quantity <= 1) removeItem(id, row);
      else { GC.updateCartQuantity(id, item.quantity - 1); render(); }
    } else if (action === 'remove') {
      removeItem(id, row);
    }
  }

  function handleClear() {
    if (!window.confirm('Remove all items from your cart?')) return;
    GC.clearCart();
    GC.showToast('Cart cleared');
    render();
  }

  /* ---------- INIT ---------- */
  render();
  els.list.addEventListener('click', handleListClick);
  if (els.clearBtn) els.clearBtn.addEventListener('click', handleClear);
};