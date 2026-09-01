/*
 * Share on the product page.
 *
 * Tries the OS share sheet, falls back to copying the link. Both paths end in
 * something visible, because the original failure mode here is a tap that
 * appears to do nothing.
 *
 * navigator.share needs a secure context and transient user activation, so it
 * is called synchronously inside the click handler — awaiting anything first
 * spends the activation and the call is rejected.
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

  function confirmOn(button) {
    button.classList.add('is-copied');
    window.setTimeout(function () { button.classList.remove('is-copied'); }, 1400);
  }

  function copy(text) {
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
      ta.setSelectionRange(0, ta.value.length);   // iOS ignores select() alone
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }

  function copyPath(button, url) {
    copy(url)
      .then(function () { toast(button, 'Link copied'); confirmOn(button); })
      .catch(function () { window.prompt('Copy this link', url); });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-mastt-share]');
    if (!button) return;
    event.preventDefault();

    var url = button.dataset.url || window.location.href;
    var title = button.dataset.title || document.title;

    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function (err) {
        /* AbortError means the sheet opened and the person closed it — that is
           a completed interaction, not a failure. Anything else (no handler
           registered, permission denied, an embedded webview that advertises
           the API without supporting it) means the sheet never appeared, so
           fall through to copying rather than leaving the tap dead. */
        if (err && err.name === 'AbortError') return;
        copyPath(button, url);
      });
      return;
    }

    copyPath(button, url);
  });
})();
