const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup() {
  const pending = [];
  const chips = [99900, 159900, 209900].map((min, i) => {
    const classes = new Set();
    const action = { dataset: {}, replaceChildren(el) { this.child = el; } };
    const cond = { dataset: { over: `over ₹${min / 100}` }, textContent: '' };
    return {
      dataset: { min: String(min), code: `MASTT${(i + 1) * 100}`, applyUrl: `/discount/MASTT${(i + 1) * 100}?redirect=/cart` },
      classList: { contains: c => classes.has(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); } },
      querySelector: s => s === '[data-moff-cond]' ? cond : s === '[data-moff-action]' ? action : null,
      action, cond,
    };
  });
  const box = { querySelectorAll: () => chips };
  const window = { Shopify: { routes: { root: '/en/' } } };
  const document = {
    readyState: 'loading', addEventListener() {},
    querySelectorAll: s => s === '[data-moff]' ? [box] : [],
    createElement: tag => ({ tag }),
  };
  vm.runInNewContext(fs.readFileSync('assets/mastt-cart-tiers.js', 'utf8'), {
    window, document,
    fetch: url => new Promise(resolve => pending.push({ url, resolve })),
  });
  async function complete(index, subtotal, code, total = subtotal) {
    pending[index].resolve({ ok: true, json: async () => ({
      items_subtotal_price: subtotal, total_price: total,
      cart_level_discount_applications: code ? [{ title: code }] : [],
    }) });
    await new Promise(resolve => setImmediate(resolve));
  }
  return { chips, pending, refresh: window.MasttTiers.refresh, complete };
}

test('all three tiers unlock at their exact pre-order-discount thresholds', async () => {
  for (const [subtotal, unlocked] of [[99800, 0], [99900, 1], [159900, 2], [209900, 3]]) {
    const s = setup(); s.refresh(); await s.complete(0, subtotal);
    assert.deepEqual(s.chips.map(c => c.action.child.textContent),
      s.chips.map((_, i) => i < unlocked ? 'Apply' : 'Locked'));
  }
});
test('applied discount does not relock itself and lower tier remains selectable', async () => {
  const s = setup(); s.refresh(); await s.complete(0, 159900, 'MASTT200', 139900);
  assert.deepEqual(s.chips.map(c => c.action.child.textContent), ['Apply', 'Applied', 'Locked']);
  s.refresh(); await s.complete(1, 159900, 'MASTT100', 149900);
  assert.deepEqual(s.chips.map(c => c.action.child.textContent), ['Applied', 'Apply', 'Locked']);
});
test('removal relocks offers and clears stale applied badges', async () => {
  const s = setup(); s.refresh(); await s.complete(0, 209900, 'MASTT300', 179900);
  s.refresh(); await s.complete(1, 50000);
  assert.deepEqual(s.chips.map(c => c.action.child.textContent), ['Locked', 'Locked', 'Locked']);
  assert.ok(s.chips.every(c => !c.classList.contains('is-applied')));
});
test('a late response cannot overwrite the newest cart state', async () => {
  const s = setup(); s.refresh(); s.refresh();
  await s.complete(1, 50000); await s.complete(0, 209900);
  assert.ok(s.chips.every(c => c.action.child.textContent === 'Locked'));
  assert.equal(s.pending[0].url, '/en/cart.js');
});
