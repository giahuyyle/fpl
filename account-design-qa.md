# Account settings design QA

final result: passed

## Evidence

- Source visual truth: `/var/folders/45/9x8czf656y16dbbb50gp59p40000gn/T/codex-clipboard-3aa3fcf5-c662-4971-a94d-2ebd95c7eb25.png` (3840 × 2182 pixels).
- Desktop implementation: `/tmp/fpl-account-desktop.png`, captured at a 1440 × 1000 CSS viewport and 1440 × 1000 output pixels.
- Mobile implementation: `/tmp/fpl-account-mobile.png`, captured at a 390 × 844 CSS viewport and 390 × 844 output pixels.
- State: signed-in personal-details page. The implementation was populated with Huy Le, Vietnam, and United Kingdom to compare the same visible state as the reference.
- The source and both implementation captures were opened together for the comparison. The source viewer was normalized to 2048 × 1164 for inspection. Focused regions included the header, settings banner, menu, form fields, selected country, nationality checkbox, and mobile overflow behavior.

## Comparison history

- The first desktop render matched the reference's hierarchy but used empty account data. Real personal details were saved through the browser and the page was reloaded; the second render confirmed persisted content and matching selected-control states.
- The desktop two-column layout, purple banner, active menu rail, labels, fields, card treatment, and content density have no actionable P0/P1/P2 differences within this app's requested four-link navigation scope.
- At 390px, the side menu becomes a horizontally scrollable tab row and the form becomes one column. No page-level horizontal overflow or clipped form content remains. Off-screen settings tabs remain reachable through the horizontal menu.

## Fidelity surfaces

- Fonts and typography: the existing Outfit and DM Sans families preserve the product's established typography. Display headings, field labels, navigation, body copy, weights, and line heights follow the reference hierarchy.
- Spacing and layout rhythm: the centered frame, purple banner, one-third/two-thirds desktop grid, card radii, form widths, menu spacing, and field rhythm closely follow the source. The source's editorial/news spacer above the banner is outside this application's navigation scope.
- Colors and visual tokens: deep Premier League purple, white cards, pale page background, muted labels, field borders, feedback states, and dark appearance tokens are consistent and accessible.
- Image quality and asset fidelity: the existing Premier League lion brand asset is reused. The account view does not require additional imagery. Decorative source chevrons and news-strip assets were omitted rather than approximated.
- Copy and content: the seven reference settings sections are present. Personal details, email, preferences, security, appearance, interests, and account management contain functional, product-specific controls.

## Interaction checks

- Personal details saved through the live API and remained after a browser reload.
- Country, gender, different-nationality, and nationality controls persisted correctly.
- Appearance selection updates the preview immediately; Cancel restores saved appearance.
- Password mismatch validation is covered in the UI tests; successful password replacement and session revocation are covered through the API tests.
- Browser console checked with no captured errors.
- Production build and ESLint passed. Frontend: 58 tests passed. Backend: 116 tests passed with 95.01% coverage against the required 95% gate.

## Follow-up polish

- The reference includes a news strip and a larger promotional spacer above the account content. Those modules are not part of this application's four-destination navbar.
- Marketing email choices persist, but outbound email delivery is not configured in this project.
