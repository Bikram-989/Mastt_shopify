const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function storeSetup(initial = []) {
  let stored = JSON.stringify(initial);
  const handlers = {}, badge = { textContent: '', hidden: true, classList: { toggle() {} } };
  const window = { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } }, addEventListener: (name, fn) => { handlers[name] = fn; } };
  const document = { readyState: 'complete', addEventListener() {}, dispatchEvent() {}, querySelectorAll: selector => selector === '[data-mastt-wish-count]' ? [badge] : [] };
  vm.runInNewContext(fs.readFileSync('assets/mastt-wishlist.js', 'utf8'), { window, document, CustomEvent: class {} });
  return { api: window.MasttWishlist, badge, handlers, set: value => { stored = JSON.stringify(value); } };
}

test('a new browser starts with no saved product and no visible count', () => {
  const s = storeSetup();
  assert.equal(s.api.read().length, 0);
  assert.equal(s.badge.textContent, '0');
  assert.equal(s.badge.hidden, true);
});

test('removing an unavailable handle keeps favourites added while loading', () => {
  const s = storeSetup(['missing-piece']);
  s.set(['missing-piece', 'new-favourite']);
  assert.equal(s.api.remove(['missing-piece']), true);
  assert.deepEqual(Array.from(s.api.read()), ['new-favourite']);
  assert.equal(s.badge.textContent, '1');
});

test('browser Back refreshes a cached header count from current storage', () => {
  const s = storeSetup(['saved-piece']);
  s.set([]);
  s.handlers.pageshow({ persisted: true });
  assert.equal(s.badge.textContent, '0');
  assert.equal(s.badge.hidden, true);
});

async function pageScenario(productStatus) {
  let Page;
  const removed = [], urls = [];
  const api = { read: () => ['missing-piece'], remove: handles => { removed.push(...handles); return true; }, sync() {} };
  vm.runInNewContext(fs.readFileSync('assets/mastt-wishlist-page.js', 'utf8'), {
    HTMLElement: class {}, customElements: { get() {}, define: (_, type) => { Page = type; } },
    window: { MasttWishlist: api }, document: { activeElement: { closest: () => null } },
    DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
    fetch: async url => { urls.push(url); return { ok: true, status: url.endsWith('.js') ? productStatus : 200, text: async () => '' }; },
  });
  const count = {};
  const page = Object.assign(Object.create(Page.prototype), {
    cards: new Map(), version: 0, lastHandles: '', isConnected: true,
    grid: { setAttribute() {}, children: [], hidden: false }, empty: {}, retry: {}, status: {}, querySelector: () => count,
  });
  await page.render();
  return { page, removed, urls };
}

test('empty section plus product JSON 404 removes the phantom saved count', async () => {
  const s = await pageScenario(404);
  assert.deepEqual(s.removed, ['missing-piece']);
  assert.equal(s.urls.length, 2);
});

test('a temporary card failure does not erase a real saved product', async () => {
  const s = await pageScenario(200);
  assert.deepEqual(s.removed, []);
  assert.equal(s.page.retry.hidden, false);
  assert.match(s.page.status.textContent, /could not load/);
});
