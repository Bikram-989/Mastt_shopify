/*
 * Share button for the product page.
 *
 * navigator.share opens the OS sheet — on a phone that is the only share flow
 * people reliably finish. It requires a secure context and a user gesture,
 * both of which hold here. Desktop browsers mostly lack it, so those copy the
 * link instead and say so.
 */
(function () {
  'use strict';

  function toast(button) {
    var el = button.parentNode.querySelector('[data-mastt-share-toast]');
    if (!el) return;
    el.hidden = false;
    window.clearTimeout(el._t);
    el._t = window.setTimeout(function () { el.hidden = true; }, 2000);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    /* Older Safari and any non-secure context. */
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-mastt-share]');
    if (!button) return;
    event.preventDefault();

    var url = button.dataset.url || window.location.href;
    var title = button.dataset.title || document.title;

    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {
        /* The user dismissed the sheet. Not an error — say nothing. */
      });
      return;
    }

    copy(url).then(function () { toast(button); }).catch(function () {
      window.prompt('Copy this link', url);
    });
  });
})();
