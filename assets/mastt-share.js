/*
 * Share button on the product page — copies the product link.
 *
 * An earlier version preferred navigator.share, which opens the OS sheet.
 * That is a good flow, but it is not what was asked for and it made the
 * button behave differently on phone and desktop for no visible reason.
 * Copying is one predictable action everywhere.
 */
(function () {
  'use strict';

  function toast(button, message) {
    var el = button.parentNode.querySelector('[data-mastt-share-toast]');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(el._t);
    el._t = window.setTimeout(function () { el.hidden = true; }, 2000);
  }

  function copy(text) {
    /* The async clipboard API needs a secure context and a focused document.
       Both hold on a normal tap, but not in every embedded webview, so the
       textarea path stays as a fallback rather than an afterthought. */
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);   // iOS needs the explicit range
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-mastt-share]');
    if (!button) return;
    event.preventDefault();

    var url = button.dataset.url || window.location.href;

    copy(url)
      .then(function () {
        toast(button, 'Link copied');
        button.classList.add('is-copied');
        window.setTimeout(function () { button.classList.remove('is-copied'); }, 1400);
      })
      .catch(function () {
        /* Clipboard refused outright — show the link so it can still be taken
           by hand rather than failing silently. */
        window.prompt('Copy this link', url);
      });
  });
})();
