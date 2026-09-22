const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const elements = new Map(), requests = [];
  const updated = { item_count: 0, discount_codes: [], sections: {} };
  vm.runInNewContext(fs.readFileSync('assets/cart.js', 'utf8'), {
    HTMLElement: class {},
    customElements: { define: (name, type) => elements.set(name, type), get: name => elements.get(name) },
    routes: { cart_update_url: '/cart/update.js' },
    window: { location: { pathname: '/cart' } },
    fetchConfig: () => ({ method: 'POST' }),
    fetch: async (url, options) => { requests.push({ url, ...options }); return { ok: true, json: async () => updated }; },
  });
  const cart = Object.create(elements.get('cart-items').prototype);
  cart.querySelectorAll = () => [99900, 159900, 209900].map((min, i) => ({ dataset: { min, code: `MASTT${(i + 1) * 100}` } }));
  cart.getSectionsToRender = () => [{ section: 'items' }, { section: 'totals' }];
  return { cart, requests, updated };
}

test('emptying the cart forgets a previously selected tier instead of reactivating it later', async () => {
  const s = setup();
  const result = await s.cart.clearIneligibleOffers({ item_count: 0, items_subtotal_price: 0, discount_codes: [{ code: 'MASTT100', applicable: false }] });
  assert.equal(result, s.updated);
  assert.equal(s.requests.length, 1);
  assert.equal(JSON.parse(s.requests[0].body).discount, '');
});

test('dropping below a tier removes that selection and preserves unrelated codes', async () => {
  const s = setup();
  await s.cart.clearIneligibleOffers({ item_count: 1, items_subtotal_price: 199900, discount_codes: [
    { code: 'mastt300', applicable: false }, { code: 'SHIPPING', applicable: true },
  ] });
  assert.equal(JSON.parse(s.requests[0].body).discount, 'SHIPPING');
});

test('an eligible customer selection survives quantity changes without being replaced', async () => {
  const s = setup();
  const state = { item_count: 3, items_subtotal_price: 300000, discount_codes: [{ code: 'MASTT100', applicable: true }] };
  assert.equal(await s.cart.clearIneligibleOffers(state), state);
  assert.equal(s.requests.length, 0);
});

test('unlocking all tiers with no selection never sends a discount write', async () => {
  const s = setup();
  const state = { item_count: 3, items_subtotal_price: 300000, discount_codes: [] };
  assert.equal(await s.cart.clearIneligibleOffers(state), state);
  assert.equal(s.requests.length, 0);
});
