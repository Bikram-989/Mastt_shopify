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

  /* Offers are server-rendered, so without this a tier only unlocked on the
     next page load. Re-evaluating here means adding a product opens the offer
     immediately. */
  function paintOffers(total) {
    var boxes = document.querySelectorAll('[data-moff]');
    for (var b = 0; b < boxes.length; b++) {
      var chips = boxes[b].querySelectorAll('[data-moff-chip]');
      for (var i = 0; i < chips.length; i++) {
        var chip = chips[i];
        var min = parseInt(chip.dataset.min, 10) || 0;
        var unlocked = total >= min;
        var applied = chip.classList.contains('is-applied');

        chip.classList.toggle('is-locked', !unlocked);

        var cond = chip.querySelector('[data-moff-cond]');
        if (cond) {
          var text = unlocked ? cond.dataset.over : 'add ' + money(min - total);
          if (cond.textContent.trim() !== text) cond.textContent = text;
        }

        /* Absent on the product page, where there is no Apply to swap. */
        var action = chip.querySelector('[data-moff-action]');
        if (!action || applied) continue;

        var wantApply = unlocked && chip.dataset.code;
        var hasApply = !!action.querySelector('.moff__go');
        if (wantApply === hasApply) continue;

        action.innerHTML = wantApply
          ? '<a class="moff__go" href="' + chip.dataset.applyUrl + '">Apply</a>'
          : '<span class="moff__badge moff__badge--locked">Locked</span>';
      }
    }
  }

  function refresh() {
    var roots = document.querySelectorAll('[data-mastt-tiers]');
    var boxes = document.querySelectorAll('[data-moff]');
    if (!roots.length && !boxes.length) return;

    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cart) {
        if (!cart) return;
        for (var i = 0; i < roots.length; i++) render(roots[i], cart.total_price);
        paintOffers(cart.total_price);
      })
      .catch(function () { /* offline or blocked — leave the server-rendered state */ });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-mastt-tiers]');
    for (var i = 0; i < roots.length; i++) {
      render(roots[i], parseInt(roots[i].dataset.total, 10) || 0);
    }
    var box = document.querySelector('[data-moff]');
    if (box) paintOffers(parseInt(box.dataset.total, 10) || 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Dawn replaces cart markup wholesale after every change, so watch for the
     swap rather than trying to hook each control. */
  /* Dawn replaces cart markup wholesale after a quantity change or a removal,
     so watching for that swap is how we know to re-read the cart.

     The catch: boot() and paintOffers() write back into that same markup —
     the savings bar, the chip labels, the Apply links. Without pausing, every
     paint retriggered the observer 120ms later, forever. That loop is what
     made the cart flicker when a line was deleted.

     So: only react to cart line items appearing or disappearing, and
     disconnect while painting. */
  if (window.MutationObserver) {
    var queued = false;
    var painting = false;

    var observer = new MutationObserver(function (records) {
      if (painting || queued) return;

      var cartChanged = records.some(function (r) {
        if (!r.target.closest) return false;
        if (!r.target.closest('cart-drawer, cart-items, .cart, #main-cart-items, #CartDrawer')) {
          return false;
        }
        var lists = [r.addedNodes, r.removedNodes];
        for (var l = 0; l < lists.length; l++) {
          for (var i = 0; i < lists[l].length; i++) {
            var n = lists[l][i];
            /* A line item, or a wrapper carrying them — not our own text. */
            if (n.nodeType !== 1) continue;
            if (n.matches('.cart-item, tr, tbody, cart-items, .js-contents') ||
                n.querySelector('.cart-item')) {
              return true;
            }
          }
        }
        return false;
      });

      if (!cartChanged) return;

      queued = true;
      window.setTimeout(function () {
        queued = false;
        painting = true;
        observer.disconnect();
        boot();
        refresh();
        window.requestAnimationFrame(function () {
          painting = false;
          observer.observe(document.documentElement, { childList: true, subtree: true });
        });
      }, 120);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener('cart:refresh', refresh);
  /* Fired by mastt-card.js after a successful /cart/add.js */
  document.addEventListener('mastt:cart:added', refresh);

  /* Dawn's own add-to-cart publishes through its pub/sub rather than a DOM
     event, and on a product page there is no cart markup for the observer to
     notice changing. Subscribe when it is available so adding from the
     product form opens an offer just as adding from a card does. */
  /* Bare identifiers, not window.*: PUB_SUB_EVENTS is a top-level const, and
     const bindings never become properties of window. */
  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    try {
      subscribe(PUB_SUB_EVENTS.cartUpdate, refresh);
    } catch (e) {
      /* Signature changed in a Dawn upgrade — the observer and the custom
         event still cover the common paths. */
    }
  }
  window.MasttTiers = { refresh: refresh };
})();
