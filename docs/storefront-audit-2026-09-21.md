# Mastt storefront audit — 21 September 2026

## Verified baseline

- GitHub: Bikram-989/Mastt_shopify, main, baseline 7de1add.
- Published Shopify theme: Mastt_shopify/main, ID 139536891989.
- The published theme's index.json, cart.json, settings_data.json and mastt-cart-tiers.js MD5 checksums matched the checkout before edits.
- A second unpublished theme has the same name (ID 139209736277). Do not select by name alone.
- Theme name and matching files do not prove an active GitHub subscription. Verify the published theme receives this commit after pushing.

## Collection wiring

All six homepage category destinations exist: rings, necklaces, bracelets, earrings, sets, anklets.
New Arrivals uses new-arrivals (CREATED_DESC); Best Sellers uses best-sellers (BEST_SELLING). Both contain 451 products in Admin; this is not a count of purchasable storefront products.
For Her and For Him use dedicated collections (356 and 111 products respectively), with existing gender/category collections for the tab destinations.
Three material collections and men-sets contain zero products. Do not invent product tags/material values to populate them.
The side menu uses the same six collection handles, but its images come from collection images while homepage tiles can override images. These images can differ.

## Fixes in this checkpoint

- Offer progress and unlocks use items_subtotal_price, before order discounts, so applying an offer does not reduce progress below its own minimum.
- Live offer refresh clears obsolete Applied states, allows eligible lower tiers, and ignores late responses from older refreshes.
- Offer action markup changes only when its state changes.
- Product-page offer conditions continue to show the required spend rather than a cart-dependent remaining amount.
- Cart recommendations explicitly use best-sellers instead of the all-products fallback.

## Validation and remaining work

Four local regression tests cover tier boundaries, lower-offer switching, removal/relocking and response ordering: node --test tests/cart-tiers.test.cjs.
The tests exercise UI state using simulated Shopify responses; they do not prove checkout discounts apply.
External Shopify validation was blocked by automatic approval review because it transmits theme source. No external validation result is claimed.

The storefront redirects to /password and the browser's Admin request returned 403. A storefront viewing password or working preview is needed for mobile/desktop visual tests, real cart add/remove/quantity changes, wishlist, variant selection and native checkout verification.

Still verify actual discount settings, single-offer replacement through /discount links, published product availability, storefront collection membership, image consistency and empty collection handling. No products were published, deleted or retagged by this audit.
