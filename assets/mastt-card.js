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
  var countVersion = 0;
  var feedbackTimer;

  function feedback(message, success) {
    var box = document.querySelector('[data-mastt-cart-feedback]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'mastt-cart-feedback';
      box.dataset.masttCartFeedback = '';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.appendChild(document.createElement('span'));
      var link = document.createElement('a');
      link.href = (window.Shopify?.routes?.root || '/') + 'cart';
      link.textContent = window.masttCardStrings?.viewCart || 'View cart';
      box.appendChild(link);
      document.body.appendChild(box);
    }
    box.hidden = false;
    box.querySelector('span').textContent = message;
    box.querySelector('a').hidden = !success;
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(function () { if (!box.contains(document.activeElement)) box.hidden = true; }, success ? 6000 : 12000);
  }

  function refreshCartCount() {
    var version = ++countVersion;
    /* Repaint Shopify's own bubble so the header count is right without a
       full reload. */
    return fetch((window.Shopify?.routes?.root || '/') + '?sections=cart-icon-bubble', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (version !== countVersion || !data || !data['cart-icon-bubble']) return;
        var host = document.getElementById('cart-icon-bubble');
        if (!host) return;
        var parsed = new DOMParser().parseFromString(data['cart-icon-bubble'], 'text/html');
        var fresh = parsed.querySelector('#cart-icon-bubble') || parsed.querySelector('.shopify-section');
        if (fresh) host.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }

  function flash(button, text, ok) {
    var original = button.dataset.originalText || '+';
    button.removeAttribute('aria-busy');
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
    if (!button || button.disabled) return;

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

    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = '…';

    fetch((window.Shopify?.routes?.root || '/') + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(id), quantity: Math.max(1, parseInt(button.dataset.quantity, 10) || 1) }] })
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        button.disabled = false;
        if (!res.ok) {
          /* Out of stock, or a rule the cart refused. Say so rather than
             looking like nothing happened. */
          flash(button, '!', false);
          feedback(res.body.description || window.masttCardStrings?.error || 'This piece could not be added. Please try again.', false);
          return;
        }
        flash(button, '✓', true);
        feedback(window.masttCardStrings?.added || 'Added to your cart', true);
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'mastt-card', cartData: res.body });
        }
        document.dispatchEvent(new CustomEvent('mastt:cart:added', { detail: res.body }));
        return refreshCartCount();
      })
      .catch(function () {
        button.disabled = false;
        flash(button, '!', false);
        feedback(window.masttCardStrings?.error || 'This piece could not be added. Please try again.', false);
      });
  });
})();
