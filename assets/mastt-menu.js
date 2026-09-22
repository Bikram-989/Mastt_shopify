class MasttMenuTabs extends HTMLElement {
  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.tabs = [...this.querySelectorAll('[role="tab"]')];
    const select = (index, focus = false) => {
      this.tabs.forEach((tab, n) => {
        tab.setAttribute('aria-selected', String(n === index));
        tab.tabIndex = n === index ? 0 : -1;
        const panel = this.querySelector(`[id="${tab.getAttribute('aria-controls')}"]`);
        if (panel) panel.hidden = n !== index;
      });
      if (focus) this.tabs[index].focus();
      const panes = this.querySelector('.mmd__panes');
      if (panes) panes.scrollTop = 0;
    };
    this.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) { event.stopPropagation(); select(this.tabs.indexOf(tab)); }
    });
    this.addEventListener('keydown', event => {
      const index = this.tabs.indexOf(event.target);
      if (index < 0) return;
      const keys = { ArrowDown: (index + 1) % this.tabs.length, ArrowUp: (index + this.tabs.length - 1) % this.tabs.length, Home: 0, End: this.tabs.length - 1 };
      if (keys[event.key] === undefined) return;
      event.preventDefault();
      select(keys[event.key], true);
    });
  }
}
if (!customElements.get('mastt-menu-tabs')) customElements.define('mastt-menu-tabs', MasttMenuTabs);
