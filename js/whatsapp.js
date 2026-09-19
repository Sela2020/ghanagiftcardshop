/* ==========================================================================
   GHANA GIFT CARD SHOP — WHATSAPP WIDGET
   --------------------------------------------------------------------------
   Self-contained. Injects a floating WhatsApp bubble and a chat panel,
   then wires up open/close and the wa.me deep link.

   Include on every page:
     <script src="js/whatsapp.js"></script>
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     CONFIG — change values here, not in the markup below.
     ======================================================================== */
  const CONFIG = {
    // WhatsApp number in international format: no +, no leading zero.
    //   0245332299 in Ghana  →  233245332299
    whatsappNumber: '233245332299',

    // Shown as text in the panel and used for the tel: link
    phoneDisplay: '024 533 2299',
    phoneDial:    '+233245332299',

    email: 'ghanagiftcardshop@gmail.com',

    // Prefilled WhatsApp message (URL-encoded automatically)
    prefilledMessage: "Hello Ghana Gift Card Shop, I'd like to ask about a gift card.",

    // Shown in the panel header
    name: 'Ghana Gift Card Shop'
  };

  /* ========================================================================
     ICONS (inline SVG — no icon library needed)
     ======================================================================== */
  const ICON = {
    whatsapp:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>' +
      '</svg>',

    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<line x1="18" y1="6" x2="6" y2="18"/>' +
        '<line x1="6" y1="6" x2="18" y2="18"/>' +
      '</svg>',

    mail:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true">' +
        '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
        '<path d="m22 6-10 7L2 6"/>' +
      '</svg>',

    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true">' +
        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 ' +
                '19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 ' +
                '4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1 ' +
                '-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 ' +
                '2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' +
      '</svg>'
  };

  /* ========================================================================
     BUILD — inject markup into <body>
     ======================================================================== */
  function buildWidget() {
    // Guard against double-injection
    if (document.getElementById('waBubble')) return;

    const waURL = 'https://wa.me/' + CONFIG.whatsappNumber +
                  '?text=' + encodeURIComponent(CONFIG.prefilledMessage);

    // ---- Floating bubble ----
    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'wa-bubble';
    bubble.id = 'waBubble';
    bubble.setAttribute('aria-label', 'Chat on WhatsApp');
    bubble.setAttribute('aria-expanded', 'false');
    bubble.setAttribute('aria-controls', 'waPanel');
    bubble.innerHTML = ICON.whatsapp + '<span class="wa-bubble__ping"></span>';

    // ---- Chat panel ----
    const panel = document.createElement('div');
    panel.className = 'wa-panel';
    panel.id = 'waPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', CONFIG.name + ' WhatsApp chat');
    panel.hidden = true;

    panel.innerHTML =
      '<div class="wa-panel__header">' +
        '<div class="wa-panel__avatar" aria-hidden="true">GG</div>' +
        '<div class="wa-panel__info">' +
          '<span class="wa-panel__name">' + CONFIG.name + '</span>' +
          '<span class="wa-panel__status">' +
            '<span class="wa-panel__dot"></span> Usually replies in minutes' +
          '</span>' +
        '</div>' +
        '<button type="button" class="wa-panel__close" id="waClose" ' +
                'aria-label="Close chat">' +
          ICON.close +
        '</button>' +
      '</div>' +

      '<div class="wa-panel__body">' +
        '<div class="wa-panel__intro">' +
          '<strong>Welcome to ' + CONFIG.name + '</strong>' +
          '<p>Need help with a gift card, payment, or your order? ' +
             'We\'re here — tap Start Chat below.</p>' +
        '</div>' +

        '<div class="wa-msg wa-msg--in">Hi there 👋 How can we help you today?</div>' +

        '<div class="wa-contact">' +
          '<a class="wa-contact__item" href="mailto:' + CONFIG.email + '">' +
            ICON.mail + '<span>' + CONFIG.email + '</span>' +
          '</a>' +
          '<a class="wa-contact__item" href="tel:' + CONFIG.phoneDial + '">' +
            ICON.phone + '<span>' + CONFIG.phoneDisplay + '</span>' +
          '</a>' +
        '</div>' +
      '</div>' +

      '<div class="wa-panel__footer">' +
        '<a class="wa-start" href="' + waURL + '" target="_blank" ' +
           'rel="noopener noreferrer">' +
          ICON.whatsapp + '<span>Start Chat</span>' +
        '</a>' +
      '</div>';

    document.body.appendChild(bubble);
    document.body.appendChild(panel);
  }

  /* ========================================================================
     BEHAVIOUR
     ======================================================================== */
  function bindWidget() {
    const bubble = document.getElementById('waBubble');
    const panel  = document.getElementById('waPanel');
    const close  = document.getElementById('waClose');
    if (!bubble || !panel || !close) return;

    function open() {
      panel.hidden = false;
      panel.classList.remove('is-closing');
      bubble.setAttribute('aria-expanded', 'true');
      // Kill the "new message" dot once the user opens it
      const ping = bubble.querySelector('.wa-bubble__ping');
      if (ping) ping.remove();
    }

    function closePanel() {
      panel.classList.add('is-closing');
      bubble.setAttribute('aria-expanded', 'false');
      panel.addEventListener('animationend', function () {
        panel.hidden = true;
        panel.classList.remove('is-closing');
      }, { once: true });
    }

    function toggle() {
      if (panel.hidden) open();
      else closePanel();
    }

    bubble.addEventListener('click', toggle);
    close.addEventListener('click', closePanel);

    // Escape closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) closePanel();
    });

    // Click outside closes
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target)) return;
      if (bubble.contains(e.target)) return;
      closePanel();
    });
  }

  /* ========================================================================
     INIT
     ======================================================================== */
  function init() {
    buildWidget();
    bindWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();