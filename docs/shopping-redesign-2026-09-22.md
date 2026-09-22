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

The connected store initially reported 451 active products, zero drafts and zero Online Store publications. The user authorized publishing all active products and activating drafts for testing. Publication is handled separately from theme deployment and verified after completion.

The provided Google Sheet is accessible. The inspected OTH_N_F header has SKU, per-store push flags, descriptions, specifications, category, demographics, material, tags, separate Mastt/wholesale prices and image-folder columns. The sheet remains unchanged; no private pricing or raw sheet records are committed here. Product metadata/image automation remains the next agreed phase.

## Checks at checkpoint

- Four cart offer regression tests pass: exact thresholds, lower-tier selection, removal/relocking and stale-response ordering.
- Local Shopify Theme Check used without transmitting theme source. Syntax and schema checks pass; existing warnings for Google Fonts and scheme_classes remain.
- Local browser fixture rendered the actual cart Liquid at mobile width. Quantity 3→4 updated heading and total to ₹2,396; removing the final item produced Cart (0 items) and disabled checkout.
- Wishlist fixture loaded three cards with three requests. A sync made no extra requests. Removing one card left two, reused the unchanged DOM nodes and made no extra requests. No console errors.
- Live responsive and purchase-flow tests follow deployment and catalogue publication; local fixtures do not establish checkout correctness.
