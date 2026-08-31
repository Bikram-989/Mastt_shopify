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

    /* Scope the lookup to this card rather than matching an id. The id was
       built from section_id + product id in two places, and any render that
       omitted quick_add produced a + with no button behind it — which then
       fell through to navigation. Asking the card for its own submit button
       cannot drift. */
    var card = proxy.closest('.card-wrapper') || proxy.closest('.card');
    var target = card && card.querySelector('.quick-add__submit');

    if (target && !target.disabled) {
      target.click();
      return;
    }

    /* Genuinely no quick-add here (sold out, or a context that renders cards
       without it). Go to the product rather than doing nothing. */
    var link = card && card.querySelector('a[href]');
    if (link) window.location.href = link.getAttribute('href');
  });
})();
