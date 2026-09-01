/*
 * The "+" on a product card.
 *
 * Posts straight to /cart/add.js with the variant id rendered onto the button.
 * An earlier version hunted for Dawn's hidden quick-add submit and clicked it;
 * that depended on both living under the same .card-wrapper, which is a DOM
 * assumption that kept being wrong. Carrying the id removes the dependency
 * entirely.
 *
 * Products with more than one variant go to the product page instead — a
 * silent add would pick a variant on the customer's behalf.
 */
(function () {
  'use strict';

  function refreshCartCount() {
    /* Repaint Shopify's own bubble so the header count is right without a
       full reload. */
    return fetch('/?sections=cart-icon-bubble', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data['cart-icon-bubble']) return;
        var host = document.getElementById('cart-icon-bubble');
        if (!host) return;
        var parsed = new DOMParser().parseFromString(data['cart-icon-bubble'], 'text/html');
        var fresh = parsed.querySelector('#cart-icon-bubble');
        if (fresh) host.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }

  function flash(button, text, ok) {
    var original = button.textContent;
    button.textContent = text;
    button.classList.toggle('is-done', !!ok);
    button.classList.toggle('is-failed', !ok);
    button.disabled = true;
    window.setTimeout(function () {
      button.textContent = original;
      button.classList.remove('is-done', 'is-failed');
      button.disabled = false;
    }, 1400);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-mastt-add]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();     // the whole card is a link

    /* Let the customer choose when there is a choice to make. */
    if (button.dataset.hasOptions === 'true') {
      window.location.href = button.dataset.productUrl;
      return;
    }

    var id = button.dataset.variantId;
    if (!id) {
      window.location.href = button.dataset.productUrl;
      return;
    }

    button.disabled = true;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(id), quantity: 1 }] })
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        button.disabled = false;
        if (!res.ok) {
          /* Out of stock, or a rule the cart refused. Say so rather than
             looking like nothing happened. */
          flash(button, '!', false);
          return;
        }
        flash(button, '✓', true);
        document.dispatchEvent(new CustomEvent('mastt:cart:added', { detail: res.body }));
        return refreshCartCount();
      })
      .catch(function () {
        button.disabled = false;
        flash(button, '!', false);
      });
  });
})();
