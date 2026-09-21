# Mastt retail cart and collection audit — 21 September 2026

Based on retail main commit 7de1add. The supplied Shopify screenshot confirms the store theme is linked to Mastt_shopify/main.

## Changes

- Order summary beside cart items on desktop; summary and checkout before recommendations on mobile.
- Card borders, readable totals, generous checkout target, and mobile quantity controls.
- Cart item count, eligibility offers, order summary, checkout state and live region refresh together using Shopify's dynamic section IDs.
- Product-card adds refresh the page/drawer and correctly replace the cart icon section contents. Requests preserve the storefront locale.
- Failed product-form requests show the cart error message.
- Cart recommendations use the actual best-sellers collection.
- Removed the currently empty men's sets tab. Explicitly selected empty collections no longer silently show unrelated products from the full catalog.
- Promotional announcement links to all products without an unrelated recipient filter.
- Corrected list-price total calculation when line discounts exist.

## Catalog findings

Read all 31 collections through the connected Shopify API. The seven product categories, recipient collections and occasion collections are already populated and mostly connected by the preceding retail commit. No product tags or collection membership were changed in this pass.

An active-product search returned zero products. Three sampled products are DRAFT with inventory. Product activation needs a merchant decision; inventory or collection membership alone does not make a product available to shoppers.

Four collections contain zero products: men's sets, Genuine Stone, 925 Sterling Silver, Premium Base Metal. Material claims must be based on verified product data before assigning products to material collections.

## Validation

- Seven automated DOM regression tests: quantity update, final-item removal, null section handling, recommendation add, stock rejection, locale-aware badge update, and drawer empty-state refresh.
- Run locally with Node 20+ using `npm ci && npm test`.
- Shopify's local theme validator checks the changed theme files. Eleven files pass; layout/theme.liquid has four identical pre-existing findings, verified against 7de1add: three remote font/CDN notices and scheme_classes initialization. No new validator findings remain.
- Validation telemetry was explicitly disabled with OPT_OUT_INSTRUMENTATION=true.
- Cart layout checked with a local sample-cart fixture at mobile, tablet and desktop sizes. The fixture uses production cart CSS and sample product data; this is not a rendered Shopify theme or a live checkout test.

## Remaining live checks

The public storefront redirects to /password. The automated Shopify admin page returns 403. A storefront password or working preview link is required, along with products available for testing.

On the candidate theme, check homepage/recipient/category links, variant selection, card add, cart/drawer quantity changes, zero-item state, discount application and removal, mobile overflow, keyboard navigation, and arrival at checkout without placing an order. Verify Shopify receives the expected theme revision before publishing.

The branch is prepared for review, not merged to the connected main branch. The wholesale repository is outside this change.
