# Content-security execution evidence

2026-10-04, live head `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state `5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1`. Base reference `5b495488d182c81a8a14a440d7a376517118f8ec`. This record covers the Foundation service and affected style transport, not complete conformance of every consumer.

## Implementation review

- `ContentSecurityService` resolves document, element, shadow and logical portal policies; nearest provider replaces outer options. Updates/disposal notify connected owned resources; disconnected resources release subscriptions.
- `GeneratedStyleResource` owns structural, recipe, registered native-part, portal, navigation-view, toast and drag styles. Nonces precede insertion. Suppression removes only generated resources. Stable comment boundaries preserve Lit renders across suppression and adoption.
- `PresentationController` lost its three duplicated style/sheet adapters. `OwnedPortal` retains the same portal/projection implementation and reexports the extracted logical-owner lookup at its original import path. Toast registers the same logical ownership.
- Runtime source scan finds style creation and `replaceSync` only in `generated-style.ts`; story-authored styles remain outside this runtime service.
- First strict built integration exposed a NavigationPanel string-style CSP violation. Inventory found the same initial-render transport in Calendar, Carousel, NavigationPanel skeleton, ResizablePanelGroup implicit handles and DataVisualization indicators. They now reuse the existing `bindPart` CSSOM writer. No CSS declarations, recipes, theme tokens or public component state APIs changed.

## Direct Chrome MCP evidence

Page71, `http://localhost:5173/tests/fixtures/components/content-security/?package`:

- Strict `style-src 'self' 'nonce-tweakpad-csp-test'` from the document meta. After the CSSOM repair, initial render and library interactions produced zero policy violations. All76 generated styles in the exercised composition carried the nonce; no nonce-less library resource found. NavigationView had two nonce-bearing resources.
- Actual click opens portaled Select. Scoped suppression removes its two styles while retaining the same portal host and open state; restore returns two styles. Real ArrowDown/Enter selects Apple and closes correctly.
- Actual Show notification click renders Toast through the chosen external container; actual Close toast dismisses it. Generated resources use the same nonce.
- Actual resize drag changes separator value50→80. Event observations show the temporary document cursor style present only between pointerdown and pointerup, with the nonce set throughout. Sizes move223.5/223.5→357.6/89.4; the style is removed at release. No policy violation.
- Global and scoped suppression produce zero styles and zero adopted library sheets. Real typing changes Notes→Notes!, then Tab/ArrowDown/Enter selects Apple. FormData is `notes=Notes!`, `fruit=Apple`; Select editor retains focus. Restore keeps the native input identity and values.
- Fresh `?package&suppressed` initial render also has zero style elements/sheets, no policy violations, and FormData `notes=Notes`.
- Consumer-owned adopted stylesheet survives suppression/restore. Root spacing .2rem→.25rem changes input height36→45 while retaining native identity, focus and Notes!. Dictionary replacement applies muted background/padding6.4 without replacing state; a documented kebab-case `styleHook` applies radius9999px. All overrides restored.
- Actual built Input adopted into an iframe keeps the same native editor/value, receives two target-policy nonce styles, removes them under destination suppression, and restores two when moved back. Teardown disposes service and nodes. Unit tests independently cover constructed sheet realm ownership and consumer-sheet preservation.
- Public-API setup checks Calendar visibleMonths3, Carousel index1, ScrollArea native scrollTop80. Actual DataVisualization legend content uses its metadata provider and shared binding, resolves series color, and causes no additional CSP violation. These are API/geometry checks, not claimed native user inputs.
- Screenshots inspected inline: dark LTR and light RTL Input/Select/Button/resize/navigation; default NavigationPanel Teams menu (page63), and real Learn click→Tools hover (page58) with the Tools popup located under Tools and visible separation. This checks regression scope only; prior independent interaction/paint gaps remain in their own records.

## Accessibility and tooling boundary

- Strict fixture accessibility tree exposes named text/combobox controls, menu/listbox relationships, navigation, notification dialog and resize separator. Real keyboard focus/selection and pointer interactions are recorded above.
- Axe WCAG2A/AA/2.1AA on page71 reports zero violations/25 passes, but its own temporary cloned styles are blocked by CSP (70 analyzer-origin violations). This is not counted as a clean CSP resource run or sufficient analyzer evidence alone.
- Independent built NumberField fixture page69 with the same nonce service, without a restrictive test header interfering with the analyzer: zero axe violations/19 passes; actual Input contains three nonce-bearing structure/recipe/compound styles and retains numeric value3. No rules suppressed. No screen-reader claim.
- Source mode's static CSS import is injected by Vite without a nonce and generates one Vite-origin violation. Built mode loads the external package stylesheet and has no such violation. Documented bundler responsibility; production resources are not exempted.
- Screenshot persistence was previously rejected by MCP workspace roots; screenshots were inspected inline. No saved screenshots claimed. Logs under `tmp/component-verification/content-security/` are local artifacts; this Markdown and the durable fixture preserve the findings.

## Checks

- Four focused unit files,26 tests pass: structural resource policy/realm lifecycle, presentation resolver/recipes, existing part CSSOM binding.
- TypeScript, focused ESLint, applicable Stylelint, production build, Storybook build and `git diff HEAD --check` pass. Logs: `tests.log`, `types.log`, `lint.log`, `stylelint.log`, `build.log`, `storybook.log`, `diff-check.log` in the local evidence directory.
- Built `ContentSecurityService`, option/scope declarations exported through Foundation/public index; actual built fixture imports and uses them before registration.
- `docs/content-security.md` documents API/defaults, nearest-scope replacement, disposal, nonce setup, suppression, bundler boundary and public styling behavior. It adds no visual catalog identity or style variant.

Whole-library work remains active. This service repair does not clear the existing Button hover contract conflict, unsupported native-input matrices, Autocomplete text-only capability, or outstanding catalog capability audits.
