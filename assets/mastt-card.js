/*
 * Proxies the visible "+" on a product card through to Dawn's real quick-add
 * submit button.
 *
 * Dawn ships two quick-add variants and two modals. Rewriting that markup to
 * move one button would mean owning it forever; clicking the original instead
 * keeps the variant modal, the product form and the bulk path exactly as
 * Dawn built them.
 */
(function () {
  'use strict';

  document.addEventListener('click', function (event) {
    var proxy = event.target.closest && event.target.closest('[data-mastt-add]');
    if (!proxy) return;

    event.preventDefault();
    event.stopPropagation();     // the card is wrapped in a link

    var target = document.getElementById(proxy.dataset.masttAdd);
    if (target) {
      target.click();
      return;
    }

    /* No submit button on the page — the card may be rendered in a context
       without quick-add. Fall through to the product page rather than
       silently doing nothing. */
    var link = proxy.closest('.card-wrapper');
    var href = link && link.querySelector('a[href]');
    if (href) window.location.href = href.getAttribute('href');
  });
})();
