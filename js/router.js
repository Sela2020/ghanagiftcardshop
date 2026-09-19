/* ==========================================================================
   GHANA GIFT CARD SHOP — SPA ROUTER
   --------------------------------------------------------------------------
   Intercepts clicks on internal .html links, fetches the target page,
   extracts its <main> content, and swaps it in — no full page reload.

   The header and footer live OUTSIDE <main>, so they're never touched.
   Only the loader bar and the <main> content change.

   Conventions:
     • Each page's <main> has data-page="<name>", e.g. data-page="cart"
     • Each page's script registers window.PageInit.<name> = function() {...}
     • Every HTML page loads ALL page scripts (small cost, dead simple)

   Falls back to a normal browser navigation if anything goes wrong.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     1. LOADER (top progress bar + optional centered overlay)
     ======================================================================== */
  let loaderEl = null;
  let loaderBar = null;
  let loaderOverlay = null;
  let overlayTimer = null;

  function ensureLoader() {
    if (loaderEl) return;

    loaderEl = document.createElement('div');
    loaderEl.className = 'page-loader';
    loaderEl.setAttribute('aria-hidden', 'true');
    loaderEl.innerHTML =
      '<div class="page-loader__bar" id="pageLoaderBar"></div>' +
      '<div class="page-loader__overlay" id="pageLoaderOverlay">' +
        '<div class="page-loader__spinner"></div>' +
      '</div>';
    document.body.appendChild(loaderEl);

    loaderBar = document.getElementById('pageLoaderBar');
    loaderOverlay = document.getElementById('pageLoaderOverlay');
  }

  function startLoader() {
    ensureLoader();
    loaderBar.classList.add('is-active');
    loaderBar.style.width = '0%';

    // Grow the bar in steps — feels more alive than a single linear fill
    setTimeout(function () { loaderBar.style.width = '25%'; }, 10);
    setTimeout(function () { loaderBar.style.width = '55%'; }, 220);
    setTimeout(function () { loaderBar.style.width = '80%'; }, 550);

    // After 400ms, show the centered spinner too (in case loading is slow)
    overlayTimer = setTimeout(function () {
      loaderOverlay.classList.add('is-active');
    }, 400);
  }

  function stopLoader() {
    if (!loaderBar) return;
    clearTimeout(overlayTimer);
    loaderBar.style.width = '100%';

    setTimeout(function () {
      loaderBar.classList.remove('is-active');
      loaderOverlay.classList.remove('is-active');
      setTimeout(function () { loaderBar.style.width = '0%'; }, 220);
    }, 260);
  }

  /* ========================================================================
     2. NAV ACTIVE STATE
     Marks the current page's link with .is-active
     ======================================================================== */
  function setActiveNav(targetHref) {
    document.querySelectorAll('.nav-list a').forEach(function (a) {
      const isActive = a.getAttribute('href') === targetHref;
      a.classList.toggle('is-active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ========================================================================
     3. CLOSE MOBILE NAV
     ======================================================================== */
  function closeMobileNav() {
    const nav = document.getElementById('primaryNav');
    const toggle = document.getElementById('navToggle');
    if (nav) nav.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  /* ========================================================================
     4. DYNAMIC PAGE SCRIPT LOADER
     ------------------------------------------------------------------------
     When navigating to a page whose script isn't loaded yet, inject it.
     Once loaded, PageInit.<name> is registered and stays registered for the
     rest of the session — no re-download on subsequent visits.
     ======================================================================== */
  const loadedScripts = {};

  function ensurePageScript(pageName) {
    return new Promise(function (resolve) {
      if (!pageName) return resolve();

      // Already registered?
      if (window.PageInit && typeof window.PageInit[pageName] === 'function') {
        return resolve();
      }

      // Already requested?
      if (loadedScripts[pageName]) return loadedScripts[pageName].then(resolve);

      // Try to load /js/<pageName>.js
      loadedScripts[pageName] = new Promise(function (innerResolve) {
        const script = document.createElement('script');
        script.src = 'js/' + pageName + '.js';
        script.async = false;
        script.onload  = innerResolve;
        script.onerror = function () {
          console.warn('[Router] No script found for page "' + pageName + '"');
          innerResolve();
        };
        document.head.appendChild(script);
      });

      loadedScripts[pageName].then(resolve);
    });
  }

  /* ========================================================================
     5. NAVIGATION
     ======================================================================== */
  let isNavigating = false;

  async function navigate(url, pushState) {
    if (isNavigating) return;
    isNavigating = true;
    startLoader();

    // Close any open modal (cart prompt, codes modal, etc.) so its backdrop
    // doesn't sit on top of the new page after the swap.
    if (window.GC && typeof window.GC.closeAllModals === 'function') {
      window.GC.closeAllModals();
    }

    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);

      const html = await response.text();
      const doc  = new DOMParser().parseFromString(html, 'text/html');

      const newMain     = doc.getElementById('main');
      const currentMain = document.getElementById('main');
      if (!newMain || !currentMain) throw new Error('Missing <main>');

      // Swap the content
      currentMain.innerHTML = newMain.innerHTML;
      currentMain.dataset.page = newMain.dataset.page || '';

      // Update the document title
      document.title = doc.title;

      // Update the meta description
      const newDesc = doc.querySelector('meta[name="description"]');
      const oldDesc = document.querySelector('meta[name="description"]');
      if (newDesc && oldDesc) {
        oldDesc.setAttribute('content', newDesc.getAttribute('content'));
      }

      // Update the theme-color meta
      const newTheme = doc.querySelector('meta[name="theme-color"]');
      const oldTheme = document.querySelector('meta[name="theme-color"]');
      if (newTheme && oldTheme) {
        oldTheme.setAttribute('content', newTheme.getAttribute('content'));
      }

      // Update nav active state
      setActiveNav(url);

      // Close the mobile nav
      closeMobileNav();

      // Update the URL
      if (pushState !== false) {
        history.pushState({ url: url }, '', url);
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Ensure the page's script is loaded, then run its init
      const pageName = currentMain.dataset.page;
      if (pageName) {
        await ensurePageScript(pageName);
        if (window.PageInit && typeof window.PageInit[pageName] === 'function') {
          window.PageInit[pageName]();
        }
      }

      // Make sure the cart badge is fresh
      if (window.GC && window.GC.updateCartBadge) {
        window.GC.updateCartBadge();
      }

      stopLoader();

    } catch (err) {
      console.error('[Router] Navigation failed, falling back to reload:', err);
      stopLoader();
      window.location.href = url;
    } finally {
      isNavigating = false;
    }
  }

  /* ========================================================================
     6. LINK INTERCEPTION
     Catches internal .html clicks and routes them through navigate()
     ======================================================================== */
  function isInternalLink(link) {
    if (!link) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;

    const href = link.getAttribute('href');
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('http://')) return false;
    if (href.startsWith('https://')) return false;
    if (href.startsWith('mailto:')) return false;
    if (href.startsWith('tel:')) return false;
    if (href.startsWith('//')) return false;

    // Only intercept .html links (and same-page anchors are skipped above)
    return href.endsWith('.html') || href === '/' || href === '';
  }

  document.addEventListener('click', function (e) {
    // Ignore clicks with modifier keys (let the browser handle new-tab etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;

    const link = e.target.closest('a');
    if (!link) return;
    if (!isInternalLink(link)) return;

    e.preventDefault();
    navigate(link.getAttribute('href'), true);
  });

  /* ========================================================================
     7. BACK / FORWARD BUTTONS
     ======================================================================== */
  window.addEventListener('popstate', function (e) {
    const url = (e.state && e.state.url) || window.location.pathname;
    navigate(url, false);
  });

  /* ========================================================================
     8. INITIAL PAGE LOAD
     On first load, we didn't navigate — the browser did. Load the page's
     script if needed, then run its init.
     ======================================================================== */
  async function initInitialPage() {
    const main = document.getElementById('main');
    const pageName = main && main.dataset.page;

    if (pageName) {
      await ensurePageScript(pageName);
      if (window.PageInit && typeof window.PageInit[pageName] === 'function') {
        window.PageInit[pageName]();
      }
    }

    // Set the active nav link based on the initial URL
    const path = window.location.pathname.split('/').pop() || 'index.html';
    setActiveNav(path);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInitialPage);
  } else {
    initInitialPage();
  }

  /* ========================================================================
     9. PUBLIC API
     ======================================================================== */
  window.Router = {
    navigate: navigate
  };
})();
