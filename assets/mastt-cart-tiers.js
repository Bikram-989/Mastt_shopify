/*
 * Tiered savings bar.
 *
 * Reads thresholds from data-tiers, tracks cart.total_price, and celebrates
 * when a tier is crossed — once per tier per session, because a burst on every
 * quantity tweak stops meaning anything.
 *
 * The bar is a display. It does not apply a discount; see the Liquid comment
 * in snippets/mastt-cart-tiers.liquid for why that matters.
 */
(function () {
  'use strict';

  var SEEN = 'mastt:tiers-seen';

  function money(paise) {
    var rupees = Math.round(paise / 100);
    return '₹' + rupees.toLocaleString('en-IN');
  }

  function seenTop() {
    try { return window.sessionStorage.getItem(SEEN) || '0'; }
    catch (e) { return '0'; }
  }

  function rememberTop(v) {
    try { window.sessionStorage.setItem(SEEN, String(v)); } catch (e) {}
  }

  function burst(root) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var host = root.querySelector('[data-mtier-burst]');
    if (!host) return;

    for (var i = 0; i < 14; i++) {
      var bit = document.createElement('i');
      bit.className = 'mtier__bit';
      /* Spread the pieces across a half-circle so they arc outward, not up. */
      var angle = (Math.PI / 14) * i + Math.PI;
      var dist = 40 + Math.random() * 50;
      bit.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      bit.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      bit.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
      bit.style.setProperty('--delay', (Math.random() * 90) + 'ms');
      bit.style.setProperty('--hue', ['var(--color-dusty-coral)', 'var(--color-aqua)', 'var(--color-blush-pink)', 'var(--color-charcoal)'][i % 4]);
      host.appendChild(bit);
      window.setTimeout(function (el) { return function () { el.remove(); }; }(bit), 1200);
    }
  }

  function render(root, total) {
    var tiers;
    try { tiers = JSON.parse(root.dataset.tiers || '[]'); } catch (e) { return; }
    if (!Array.isArray(tiers) || !tiers.length) { root.hidden = true; return; }

    tiers.sort(function (a, b) { return a.min - b.min; });
    root.hidden = false;

    var top = tiers[tiers.length - 1].min;
    var reached = tiers.filter(function (t) { return total >= t.min; });
    var next = tiers.find(function (t) { return total < t.min; });

    /* Scale by the top tier so the bar fills as the goal is reached, rather
       than resetting between tiers — a bar that restarts reads as lost
       progress. */
    var pct = Math.max(0, Math.min(100, (total / top) * 100));
    root.querySelector('[data-mtier-fill]').style.width = pct + '%';

    var msg = root.querySelector('[data-mtier-msg]');
    if (next) {
      var gap = next.min - total;
      msg.innerHTML = 'Add <strong>' + money(gap) + '</strong> more to save <strong>' +
                      money(next.off) + '</strong>';
    } else if (reached.length) {
      msg.innerHTML = 'Nice — you have unlocked <strong>' +
                      money(reached[reached.length - 1].off) + '</strong> off';
    } else {
      msg.textContent = '';
    }

    var nodes = root.querySelector('[data-mtier-nodes]');
    var above = root.querySelector('[data-mtier-above]');
    var below = root.querySelector('[data-mtier-below]');
    nodes.innerHTML = '';
    above.innerHTML = '';
    below.innerHTML = '';

    tiers.forEach(function (t) {
      var on = total >= t.min;
      var at = Math.min(100, (t.min / top) * 100) + '%';

      var dot = document.createElement('span');
      dot.className = 'mtier__node' + (on ? ' is-on' : '');
      dot.style.left = at;
      nodes.appendChild(dot);

      /* Reward above, threshold below, both centred on the same percentage as
         the node, so each tier reads as one vertical column. */
      var off = document.createElement('span');
      off.className = 'mtier__off' + (on ? ' is-on' : '');
      off.style.left = at;
      off.textContent = money(t.off) + ' off';
      above.appendChild(off);

      var min = document.createElement('span');
      min.className = 'mtier__min' + (on ? ' is-on' : '');
      min.style.left = at;
      min.textContent = money(t.min);
      below.appendChild(min);
    });

    /* Celebrate when the best tier reached goes up. Tracking the highest
       rather than a set means it re-fires if the cart drops and climbs back,
       and it cannot silently swallow the first crossing the way the old
       length check could. */
    var top_reached = reached.length ? reached[reached.length - 1].min : 0;
    var prev = parseInt(seenTop(), 10) || 0;
    if (top_reached > prev) {
      burst(root);
      rememberTop(top_reached);
    } else if (top_reached < prev) {
      rememberTop(top_reached);
    }
  }

  function refresh() {
    var roots = document.querySelectorAll('[data-mastt-tiers]');
    if (!roots.length) return;

    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cart) {
        if (!cart) return;
        for (var i = 0; i < roots.length; i++) render(roots[i], cart.total_price);
      })
      .catch(function () { /* offline or blocked — leave the server-rendered state */ });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-mastt-tiers]');
    for (var i = 0; i < roots.length; i++) {
      render(roots[i], parseInt(roots[i].dataset.total, 10) || 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Dawn replaces cart markup wholesale after every change, so watch for the
     swap rather than trying to hook each control. */
  if (window.MutationObserver) {
    var queued = false;
    new MutationObserver(function (records) {
      var touched = records.some(function (r) {
        return r.target.closest &&
               r.target.closest('cart-drawer, cart-items, .cart, #main-cart-items, #CartDrawer');
      });
      if (!touched || queued) return;
      queued = true;
      window.setTimeout(function () { queued = false; boot(); refresh(); }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener('cart:refresh', refresh);
  window.MasttTiers = { refresh: refresh };
})();
