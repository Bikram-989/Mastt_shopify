import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const cartSource = readFileSync(new URL('../assets/cart.js', import.meta.url), 'utf8');
const cardSource = readFileSync(new URL('../assets/mastt-card.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
function items(count) {
  return `<cart-items class="${count ? '' : 'is-empty'}"><h1>Cart <span class="cart__count">${count}</span></h1>
    ${count ? '<div data-moff>Eligible offers</div>' : ''}
    <form id="cart"><div id="main-cart-items" data-id="template__cart-items"><div class="js-contents">
    ${count ? `<div class="cart-item" id="CartItem-1"><input id="Quantity-1" name="updates[]" value="${count}"><div id="Line-item-error-1"><span class="cart-item__error-text"></span></div></div>` : ''}
    </div></div><p id="cart-live-region-text"></p><p id="shopping-cart-line-item-status"></p></form></cart-items>`;
}
function sections(count) {
  return {
    'template__cart-items': items(count),
    'cart-icon-bubble': `<div class="shopify-section"><span>${count}</span></div>`,
    'cart-live-region-text': `<div class="shopify-section">${count} items</div>`,
    'template__cart-footer': `<div id="main-cart-footer"><div class="cart__blocks"><span class="total">${count * 499}</span><button name="checkout" ${count ? '' : 'disabled'}>Checkout</button><div id="cart-errors"></div></div></div>`
  };
}
function setup() {
  const window = new Window({ url: 'https://mastt.co/cart' });
  window.eval(`var routes = {cart_url:'/cart',cart_change_url:'/cart/change.js'};
    var PUB_SUB_EVENTS = {cartUpdate:'cart-update'};
    var subscribe = () => () => {}; var publish = () => Promise.resolve();
    var debounce = (fn) => fn; var ON_CHANGE_DEBOUNCE_TIMER = 0;
    var fetchConfig = () => ({method:'POST'});
    var CartPerformance = {measure: (name,fn) => fn(),measureFromEvent:()=>{}};
    window.cartStrings = {error:'Unable to update cart', quantityError:'Only [quantity] available'};`);
  window.document.body.innerHTML = `${items(1)}<a id="cart-icon-bubble">1</a><div id="main-cart-footer" data-id="template__cart-footer"><div class="cart__blocks"><span class="total">499</span><button name="checkout">Checkout</button><div id="cart-errors"></div></div></div>`;
  window.eval(cartSource);
  return window;
}

test('quantity change updates header count, offers, totals and the current live region together', async () => {
  const w = setup();
  w.fetch = async () => ({text:async()=>JSON.stringify({item_count:2,items:[{quantity:2}],sections:sections(2)})});
  w.document.querySelector('cart-items').updateQuantity(1,2,{currentTarget:null},'updates[]');
  await tick();
  assert.equal(w.document.querySelector('.cart__count').textContent,'2');
  assert.equal(w.document.querySelector('.total').textContent,'998');
  assert.equal(w.document.querySelector('#cart-icon-bubble').textContent,'2');
  assert.equal(w.document.querySelector('#cart-live-region-text').textContent,'2 items');
  assert.ok(w.document.querySelector('[data-moff]'));
  await w.happyDOM.close();
});

test('removing the final item clears offers and disables checkout', async () => {
  const w=setup(); const cart=w.document.querySelector('cart-items');
  cart.renderSections(sections(0));
  assert.ok(cart.classList.contains('is-empty'));
  assert.equal(w.document.querySelector('[data-moff]'),null);
  assert.ok(w.document.querySelector('[name="checkout"]').disabled);
  assert.ok(w.document.querySelector('#main-cart-footer').classList.contains('is-empty'));
  await w.happyDOM.close();
});

test('a null section fails before replacing any cart content', async () => {
  const w=setup(); const incoming=sections(2); incoming['template__cart-footer']=null;
  assert.throws(()=>w.document.querySelector('cart-items').renderSections(incoming));
  assert.equal(w.document.querySelector('.cart__count').textContent,'1');
  assert.equal(w.document.querySelector('.total').textContent,'499');
  await w.happyDOM.close();
});

test('adding a recommendation refreshes the full cart with its dynamic section IDs', async () => {
  const w=setup();let requested;
  w.fetch=async url=>{requested=new URL(url);return {ok:true,json:async()=>sections(3)};};
  w.document.dispatchEvent(new w.CustomEvent('mastt:cart:added'));
  await tick();
  assert.ok(requested.searchParams.get('sections').includes('template__cart-footer'));
  assert.equal(w.document.querySelector('.total').textContent,'1497');
  assert.equal(w.document.querySelector('.cart__count').textContent,'3');
  await w.happyDOM.close();
});

test('a rejected quantity shows the Shopify error and preserves the previous total', async () => {
  const w=setup();w.fetch=async()=>({text:async()=>JSON.stringify({errors:'Only one left'})});
  w.document.querySelector('cart-items').updateQuantity(1,8,{currentTarget:null},'updates[]');
  await tick();
  assert.equal(w.document.querySelector('.cart-item__error-text').textContent,'Only one left');
  assert.equal(w.document.querySelector('.total').textContent,'499');
  await w.happyDOM.close();
});

test('product-card add replaces badge from Shopify section wrapper and uses locale root', async () => {
  const w=new Window({url:'https://mastt.co/en'});const requests=[];
  w.Shopify={routes:{root:'/en/'}};w.routes={cart_add_url:'/en/cart/add.js'};
  w.document.body.innerHTML='<a id="cart-icon-bubble">0</a><button data-mastt-add data-variant-id="123">+</button>';
  w.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>url.includes('sections=')?{'cart-icon-bubble':'<div class="shopify-section"><span>1</span></div>'}:{items:[{id:123}]}};};
  w.eval(cardSource);w.document.querySelector('button').click();await tick();
  assert.deepEqual(requests,['/en/cart/add.js','/en/?sections=cart-icon-bubble']);
  assert.equal(w.document.querySelector('#cart-icon-bubble').textContent,'1');
  await w.happyDOM.close();
});

test('drawer refresh after a card add clears the empty state and updates checkout', async () => {
  const w=setup();
  w.document.body.innerHTML='<cart-drawer class="is-empty"><div id="CartDrawer"><div class="drawer__inner"><div class="drawer__inner-empty">Empty</div><cart-drawer-items></cart-drawer-items></div></div></cart-drawer><a id="cart-icon-bubble">0</a>';
  const drawerSource=readFileSync(new URL('../assets/cart-drawer.js',import.meta.url),'utf8');
  w.eval(drawerSource.slice(drawerSource.indexOf('class CartDrawerItems')).replace('extends CartItems', "extends customElements.get('cart-items')"));
  w.document.querySelector('cart-drawer-items').renderSections({
    'cart-drawer':'<cart-drawer><div class="drawer__inner"><cart-drawer-items><p id="CartDrawer-LineItemStatus"></p></cart-drawer-items><button name="checkout">Checkout</button></div></cart-drawer>',
    'cart-icon-bubble':'<div class="shopify-section">1</div>'
  });
  assert.equal(w.document.querySelector('cart-drawer').classList.contains('is-empty'),false);
  assert.equal(w.document.querySelector('[name="checkout"]').disabled,false);
  await w.happyDOM.close();
});
