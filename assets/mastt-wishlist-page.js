class MasttWishlistPage extends HTMLElement {
  connectedCallback() {
    this.grid = this.querySelector('[data-mwp-grid]');
    this.empty = this.querySelector('[data-mwp-empty]');
    this.status = this.querySelector('[data-mwp-status]');
    this.retry = this.querySelector('[data-mwp-retry]');
    this.cards = new Map();
    this.version = 0;
    this.lastHandles = '';
    this.onChange = () => this.render();
    this.onRetry = () => { this.lastHandles = ''; this.render(); };
    document.addEventListener('mastt:wishlist:change', this.onChange);
    this.retry.addEventListener('click', this.onRetry);
    this.render();
  }

  disconnectedCallback() {
    this.version++;
    document.removeEventListener('mastt:wishlist:change', this.onChange);
    this.retry.removeEventListener('click', this.onRetry);
  }

  async render() {
    const handles = window.MasttWishlist ? window.MasttWishlist.read() : [];
    const signature = JSON.stringify(handles);
    if (signature === this.lastHandles) return;
    this.lastHandles = signature;
    const version = ++this.version;
    const root = window.Shopify?.routes?.root || '/';
    let failures = 0;
    let unavailable = 0;
    const unavailableHandles = [];
    let next = 0;
    const activeCard = document.activeElement.closest('[data-wishlist-handle]');
    const removedFocusedCard = activeCard && !handles.includes(activeCard.dataset.wishlistHandle);
    for (const [handle, card] of this.cards) {
      if (!handles.includes(handle)) { card.remove(); this.cards.delete(handle); }
    }
    this.empty.hidden = handles.length > 0;
    this.retry.hidden = true;
    this.status.textContent = handles.length ? 'Loading your saved pieces…' : '';
    this.grid.hidden = handles.length === 0;
    this.grid.setAttribute('aria-busy', 'true');
    const missing = handles.filter(handle => !this.cards.has(handle));

    const load = async () => {
      while (next < missing.length && version === this.version) {
        const handle = missing[next++];
        try {
          const response = await fetch(`${root}products/${encodeURIComponent(handle)}?section_id=mastt-rv-card`);
          if (version !== this.version) return;
          if (response.status === 404) { unavailable++; unavailableHandles.push(handle); continue; }
          if (!response.ok) throw new Error('Product request failed');
          const html = await response.text();
          if (version !== this.version) return;
          const card = new DOMParser().parseFromString(html, 'text/html').querySelector('.card-wrapper');
          if (!card) {
            // Shopify can return 200 + an empty section for a missing product.
            // Confirm with product JSON before dropping a saved favourite.
            const productResponse = await fetch(`${root}products/${encodeURIComponent(handle)}.js`);
            if (version !== this.version) return;
            if (productResponse.status === 404) {
              unavailable++; unavailableHandles.push(handle); continue;
            }
            throw new Error('Saved product card could not be rendered');
          }
          const item = document.createElement('li');
          item.dataset.wishlistHandle = handle;
          item.append(card);
          this.cards.set(handle, item);
        } catch (_) { failures++; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, missing.length) }, load));
    if (version !== this.version || !this.isConnected) return;
    if (unavailableHandles.length && window.MasttWishlist?.remove(unavailableHandles)) return;
    let position = 0;
    for (const handle of handles) {
      const card = this.cards.get(handle);
      if (card && this.grid.children[position] !== card) this.grid.insertBefore(card, this.grid.children[position] || null);
      if (card) position++;
    }
    this.grid.hidden = position === 0;
    this.grid.setAttribute('aria-busy', 'false');
    const count = this.querySelector('[data-mwp-count]');
    count.textContent = `${handles.length} ${handles.length === 1 ? 'piece' : 'pieces'}`;
    this.status.textContent = failures
      ? 'Some pieces could not load. Please try again.'
      : unavailable ? 'Some saved pieces are no longer available. Your other favourites are here.' : '';
    this.retry.hidden = !failures;
    window.MasttWishlist?.sync(this.grid);
    if (removedFocusedCard) (this.grid.querySelector('[data-mastt-wish]') || this.querySelector('[data-mwp-browse]')).focus();
  }
}
if (!customElements.get('mastt-wishlist-page')) customElements.define('mastt-wishlist-page', MasttWishlistPage);
