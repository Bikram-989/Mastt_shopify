/*
 * Mastt wishlist — saved products, held in the visitor's own browser.
 *
 * No app, no account, no server. A list of product handles in localStorage,
 * the same store the Recently Viewed rail uses.
 *
 * Event delegation on the document means cards injected later — the Recently
 * Viewed rail, quick-add modals, filtered collection grids swapped in by the
 * Section Rendering API — all work without re-binding anything.
 */
(function () {
  'use strict';

  var KEY = 'mastt:wishlist';

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      // Private browsing, blocked storage, or corrupt JSON. Saving is a
      // convenience, never let it break a product grid.
      return [];
    }
  }

  function write(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function paint(button, saved) {
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.classList.toggle('is-saved', saved);
    var title = button.dataset.handle ? '' : '';
    button.title = saved ? 'Saved' : 'Save for later';
    return title;
  }

  /* Reflect stored state onto every button currently in the DOM. */
  function sync(root) {
    var list = read();
    var scope = root || document;
    var buttons = scope.querySelectorAll('[data-mastt-wish]');
    for (var i = 0; i < buttons.length; i++) {
      paint(buttons[i], list.indexOf(buttons[i].dataset.handle) !== -1);
    }
    broadcast(list.length);
  }

  function broadcast(count) {
    document.dispatchEvent(
      new CustomEvent('mastt:wishlist:change', { detail: { count: count } })
    );
  }

  function toggle(button) {
    var handle = button.dataset.handle;
    if (!handle) return;

    var list = read();
    var at = list.indexOf(handle);
    var saved;

    if (at === -1) {
      list.unshift(handle);
      saved = true;
    } else {
      list.splice(at, 1);
      saved = false;
    }

    if (!write(list)) return;   // storage refused; leave the button as it was

    paint(button, saved);
    broadcast(list.length);

    /* Repaint any other card showing the same product — the homepage rail and
       the Recently Viewed rail can both hold it. */
    var twins = document.querySelectorAll('[data-mastt-wish][data-handle="' + handle + '"]');
    for (var i = 0; i < twins.length; i++) {
      if (twins[i] !== button) paint(twins[i], saved);
    }

    if (saved && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      button.classList.remove('is-popping');
      void button.offsetWidth;          // restart the animation
      button.classList.add('is-popping');
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-mastt-wish]');
    if (!button) return;
    /* Cards are wrapped in a link — stop the tap becoming navigation. */
    event.preventDefault();
    event.stopPropagation();
    toggle(button);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { sync(); });
  } else {
    sync();
  }

  /* Cards arriving after load (Recently Viewed, facet updates, quick add). */
  if (window.MutationObserver) {
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        sync();
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.MasttWishlist = { read: read, sync: sync };
})();
