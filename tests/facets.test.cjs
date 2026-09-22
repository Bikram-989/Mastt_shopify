const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  const pending = [], rendered = [], cleared = [];
  const retry = {};
  const error = { hidden: true, querySelector: () => retry };
  const document = {
    getElementById: id => id === 'MasttFilterError' ? error : { id },
    querySelector: () => ({ classList: { remove: value => cleared.push(value) } }),
    querySelectorAll: () => [],
  };
  const context = vm.createContext({
    HTMLElement: class {}, customElements: { define() {} }, document,
    window: { location: { search: '', href: 'https://mastt.co/collections/rings?sort_by=price-ascending' }, addEventListener() {} },
    fetch: url => new Promise((resolve, reject) => pending.push({ url, resolve, reject })),
  });
  vm.runInContext(fs.readFileSync('assets/facets.js', 'utf8') + '\nthis.Facets = FacetFiltersForm;', context);
  const Facets = context.Facets;
  Facets.renderFilters = () => {};
  Facets.renderProductGridContainer = html => rendered.push(html);
  Facets.renderProductCount = () => {};
  return { Facets, pending, rendered, error, retry, cleared };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('a slower previous filter request cannot overwrite newer results', async () => {
  const s = setup();
  s.Facets.requestVersion = 1; s.Facets.renderSectionFromFetch('old', null, 1);
  s.Facets.requestVersion = 2; s.Facets.renderSectionFromFetch('new', null, 2);
  s.pending[1].resolve({ ok: true, text: async () => 'new results' }); await settle();
  s.pending[0].resolve({ ok: true, text: async () => 'old results' }); await settle();
  assert.deepEqual(s.rendered, ['new results']);
});
test('network failure clears the loading state and offers retry for the selected URL', async () => {
  const s = setup(); s.Facets.requestVersion = 1;
  s.Facets.renderSectionFromFetch('new', null, 1);
  s.pending[0].reject(new Error('offline')); await settle();
  assert.equal(s.error.hidden, false);
  assert.ok(s.cleared.includes('loading'));
  assert.match(s.retry.href, /sort_by=price-ascending$/);
  assert.deepEqual(s.rendered, []);
});
test('failed obsolete request does not show an error over newer results', async () => {
  const s = setup(); s.Facets.requestVersion = 1;
  s.Facets.renderSectionFromFetch('old', null, 1);
  s.Facets.requestVersion = 2;
  s.pending[0].reject(new Error('offline')); await settle();
  assert.equal(s.error.hidden, true);
});
