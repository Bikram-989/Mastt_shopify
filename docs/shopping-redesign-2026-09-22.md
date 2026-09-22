# Mastt shopping improvements — 22 September 2026

## Changes

- Page-specific body classes now allow existing cart, homepage and product CSS rules to match their intended pages.
- Cart uses compact product panels, a tier progress panel, an offer strip and a single-column cost breakdown. Existing palette, native checkout and page-based cart are retained.
- Cart changes replace the complete items and totals content, including the heading, offers, empty state and checkout controls. Product-card additions publish Dawn's cart update event. The old cart MutationObserver is removed in favour of explicit events.
- Wishlist retains unchanged card nodes, limits simultaneous product requests to four, ignores obsolete responses, distinguishes failures from empty state and supports retry. Button synchronisation no longer broadcasts changes recursively; browser storage events keep tabs in sync.
- Menu tabs are native buttons with vertical keyboard navigation, using a custom element that also initializes in the theme editor. Dawn's close handler excludes tab buttons.
- Header settings allow merchants to select menu collections and a category navigation menu. Theme settings → Mastt category images controls shared homepage/menu photos; current homepage photos are migrated.
- Empty selected collections no longer silently fall back to unrelated products. The unused drawer recommendation CSS was removed.
- Footer is omitted on the cart page. Order Help links to the contact page instead of the homepage.

## Catalogue and sheet

The connected store initially reported 451 active products, zero drafts and zero Online Store publications. With the user's authorization, all 451 products were published to the Online Store (publication 146449072213). All mutations returned no user errors; final counts were 451 published and zero unpublished active products. No draft activation was necessary. This operation did not change product content, prices, inventory or tags.

The provided Google Sheet is accessible. The inspected OTH_N_F header has SKU, per-store push flags, descriptions, specifications, category, demographics, material, tags, separate Mastt/wholesale prices and image-folder columns. The sheet remains unchanged; no private pricing or raw sheet records are committed here. Product metadata/image automation remains the next agreed phase.

## Checks at checkpoint

- Four cart offer regression tests pass: exact thresholds, lower-tier selection, removal/relocking and stale-response ordering.
- Local Shopify Theme Check used without transmitting theme source. Syntax and schema checks pass; existing warnings for Google Fonts and scheme_classes remain.
- Local browser fixture rendered the actual cart Liquid at mobile width. Quantity 3→4 updated heading and total to ₹2,396; removing the final item produced Cart (0 items) and disabled checkout.
- Wishlist fixture loaded three cards with three requests. A sync made no extra requests. Removing one card left two, reused the unchanged DOM nodes and made no extra requests. No console errors.
- Checkpoint was pushed as 4e07ae5 to main and verified on the live storefront.

## Live findings and fixes

- The discount-link fallback retained the previous higher discount when choosing a lower offer. Replaced enhanced Apply handling with POST `/cart/update.js`, sending one selected `discount` code plus bundled sections. Shopify returns the price breakdown. No optimistic price calculation is used. Pending requests block checkout and concurrent offer selections; unconfirmed requests keep checkout disabled and explain how to retry.
- Live cart: subtotal ₹1,999 → MASTT200 → ₹1,799 → switch to MASTT100 → ₹1,899. Increasing quantity to two produced subtotal ₹3,998, unlocked the third offer and MASTT300 produced ₹3,698. Reducing to one item removed the ineligible discount and relocked that tier without reloading. Crossing the threshold inserted celebration particles.
- Selected MASTT100 reached native Shopify checkout: subtotal ₹3,998, discount ₹100, total ₹3,898. **Checkout says “This store can’t accept payments right now.”** Payment setup must be completed in Shopify Admin before paid orders can be tested. No customer details were entered and no order was submitted.
- Removing the last test cart item produced Cart (0 items), no product rows, an empty-cart prompt, a cleared header count and disabled checkout. No footer is rendered on the cart page.
- Six automated offer checks now cover thresholds, lower-offer display, removal/relocking, stale reads, replacement requests and network failure. These supplement the live checkout verification.
- Wishlist live test: three saved products loaded with three requests. Hovering/removing a saved product retained the other card nodes and made no extra requests. The header badge measured 18×18px. No horizontal overflow at 320px or 1440px.
- Mobile menu click and ArrowDown navigation retain the open drawer and update the active pane; Escape closes it. The New Arrivals pane loaded all eight product images. All six category destinations and image URLs match the homepage.
- All ten main collection destinations returned HTTP 200 and rendered published cards: rings, necklaces, bracelets, earrings, sets, anklets, for-her, for-him, new-arrivals and best-sellers. Existing empty material/men-sets collections still require correct source metadata; this pass does not invent their contents.
- Homepage rails extended past the viewport because negative 15px rail margins met inherited 6px mobile/0px tablet gutters. Scoped gutters now match the rails; decorative gradients no longer extend outside their section. Reviews use proximity snapping to avoid shifting the first card at initial layout.
- Cart checkpoint labels use equal spacing and progress interpolates between exact spend thresholds so adjacent reward labels remain readable on small phones.

## Merchant controls and next work

- Theme settings → **Mastt category images** controls the six shared category photographs. Header settings choose collections for New Arrivals, For Her, For Him and Best Seller; an optional category navigation menu can replace the default six destinations.
- Offers remain configured in the theme's tier settings and must match real Shopify discount codes/minimums. Storefront text does not create or enforce discounts.
- Wishlist stays in browser storage. Account-backed wishlist remains deferred as requested.
- Source-sheet metadata, product-card/product-page redesign and new generated photography are the next phase. The live catalogue includes gemstone-labelled products because the current instruction authorized publishing all active products; any catalogue exclusions must be reconciled with the source-sheet selection before the next sync.
