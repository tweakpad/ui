# Alert implementation and evidence record

## Delivery and source record

- Component / public identity: Alert, `TpAlert`, `tp-alert`.
- Requested work / claim: fix the four findings in the preceding review: severity presentation, constrained/empty-region layout, rich title composition, and documentation. User: “fix them”.
- Scope source: user's “fix them” refers to the four concrete findings in the Alert review immediately preceding this turn.
- Repository baseline: `ebfbf601427fa98036b569ba454579b8c66c8a25`; clean worktree before work.
- Live project: `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, 0.3.14, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, clean; fresh direct MCP reads on 2026-10-02.
- Foundation document: `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`; Component Library: `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; managed vocabulary read (47 terms).
- Owning contracts: `ucl22-alert`, Foundation `sec-71-semantic-invariants`, `sec-73-accessible-text-aggregation`, library presentation dictionary and state-presentation contracts.
- Base UI: `../specification/external/base-ui`, `5b495488d182c81a8a14a440d7a376517118f8ec`, clean; no standalone Alert export/implementation, only Alert Dialog.
- shadcn: `../specification/external/ui`, `63c1308d112b6b1205d86244a156cca1abef5087`, clean. Sources: `apps/v4/registry/bases/base/ui/alert.tsx`, `bases/base/examples/alert-example.tsx`, `styles/style-nova.css` Alert selectors; secondary `new-york-v4/ui/alert.tsx` and example.
- Floating UI: not applicable; Alert stays in document flow and has no popup/positioning lifecycle.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available. Reuse running localhost:5173 Vite and localhost:6006 Storybook; no other browser driver.
- Evidence directory: `tmp/component-verification/alert/2026-10-02/` (local only).
- Durable fixture: `tests/fixtures/components/alert/index.html`, source and `?built` modes, served from existing Vite.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Severity informational/success/warning/danger; informational default; non-color meaning | ucl22-alert | Alert variants, Nova alert-variant selectors | Preserve reflected severity; semantic token rules in Alert recipe; require authored condition text | docs/alert.md severity and usage | V-01, V-05 | passed | Four distinct semantic colors verified in light/dark; meaningful authored text and docs enforce non-color meaning; no unused variable remains |
| C-02 | Optional Title with arbitrary content and string fallback | ucl22-alert Title | AlertTitle and linked-title examples | New title slot, existing title fallback; slot content takes precedence | docs/alert.md slots/properties | V-02 | passed | Rich title with Badge renders; removal restores title fallback; clearing title collapses region; reinsertion/reconnect preserve nodes |
| C-03 | Description, optional Mark/Action, wrapping, in-flow nonmodal layout | ucl22-alert anatomy and flow | AlertDescription/AlertAction; Nova optional-icon grid | Keep default/icon/actions slots; hide empty wrappers, zero-minimum content track and overflow wrapping | docs/alert.md anatomy | V-02, V-03 | passed | 280px long URL with Icon/Retry and RTL have zero overflow; empty slots add no column gaps; dynamic membership passed |
| C-04 | Announcement off/polite/assertive; off default, urgent-only assertive | ucl22-alert announcement; Foundation semantic invariants | Alert role adapted to explicit live contract | Preserve off/no role, polite/status, assertive/alert; no focus management or dismissal | docs/alert.md announcement | V-04 | passed | AX off/no-role, polite/status and assertive/alert confirmed; real click/Enter and Tab/Shift+Tab passed |
| C-05 | Public parts and replaceable appearance | library dictionary contract | Nova card surface, medium title, muted description, current-color mark | Existing five parts; TpElement PresentationController; scoped tokens, dictionary and part hooks | docs/alert.md customization | V-01, V-05 | passed | Five style hooks, root/title CSS parts, scoped tokens, alternate dictionary and no-fallback reset passed with focus/DOM retained |
| C-06 | One canonical example and complete API; real composed controls | skill docs requirements | Alert examples use Button and icons | Authored alert.stories.ts + docs; generator exclusion; remove stale dismissible | docs/alert.md and Alert Docs | V-06 | passed | Authored Docs and three real Controls render/update; generator exclusion and existing story tests pass; dismissible removed from example |
| C-07 | Preserve registration, exports and unrelated primitives | existing package boundary | Native standalone Alert, no family dependency | Extract small Alert folder; reexport TpAlert through primitives for compatibility | docs/alert.md imports | V-07 | passed | 76 unit tests, lint, typecheck, package/Storybook builds pass; source compatibility reexport and built public export match registration |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Upstream role/variants | shadcn defaults role=alert and two variants; live contract has announcement=off and four severities, no variant axis | Accessibility, presentation | Preserve live semantics; adapt severity in existing root recipe | ucl22-alert fresh read | passed |
| Non-color severity | Visual severity cannot be the only meaning | Authored text/docs | Require visible message wording to identify condition (e.g. Warning / Could not save); no unlocalizable automatic duplicate label | ucl22-alert permits text or semantics; upstream authors meaningful titles | passed |

## Architecture and reuse

- Component folder: `src/components/alert/index.ts` and `alert.ts`; behavior/structural layout only. Appearance remains in shared presentation recipes.
- Exports: preserve `TpAlert` reexport from primitives and existing index/registration route.
- Public vocabulary: existing severity/announcement/title; add title slot matching existing Title anatomy and Dialog's slot convention. Existing five parts retained.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| In-flow message | bases/base/ui/alert.tsx uses div; Base UI has no Alert primitive | TpAlert, TpElement; Dialog and AlertDialog inspected as distinct modal family | Reuse TpElement lifecycle/presentation, no Dialog inheritance | Alert V-04, V-07 |
| Nested controls | AlertAction examples use Button | TpButton, TpIcon, TpBadge | Compose real library elements; Alert does not own action activation or dismissal | Fixture and docs V-03, V-04, V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| alert | base / nova | .cn-alert, .cn-alert-variant-default/destructive | Alert recipe, existing semantic color/card/spacing tokens | Card surface, sm typography, no shadow; four semantic severities; remove generic popover recipe contribution only for Alert | V-01, V-05 |
| alert-title | base / nova | .cn-alert-title | Alert title recipe | Medium weight, optional rich slot with text fallback | V-02 |
| alert-description | base / nova | .cn-alert-description | Alert description recipe | Muted informational text, severity color for emphasized messages; rich native content | V-01, V-03 |
| alert-mark | base / nova | .cn-alert direct SVG currentColor, optional icon track | TpIcon and Alert mark recipe | Optional icon slot, current-color composition, no empty column | V-02, V-05 |
| alert-action | base / nova | .cn-alert-action top/right and reserved root space | TpButton and Alert action region | Logical inline-end track with measured intrinsic width instead of hardcoded absolute space; never overlaid over content | V-03, V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical story and copyable snippet | Optional icon and action | tp-icon + plusIcon; tp-button variant=outline size=sm | register import, V-06, V-07 | Plain prose is native content |
| Fixture rich title | Badge and emphasis/link | tp-badge; native strong/a for document content | V-02, V-04 | Native text/link is deliberate content, not a substituted library control |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-05; visual | Four severities, light/dark, meaningful title text | Distinct semantic colors; sourced card surface/medium title/description | Distinct colors in both modes; zero axe violations or incomplete checks in either; card surface, medium title, muted description and icon/action placement visually inspected | Chrome 153; light.png, dark.png; results.md | passed | Verified for the requested repair scope |
| V-02 | C-02,C-03; composition | String/rich/empty title, add/remove icon/actions/description, title fallback, reconnect | Rich nodes remain assigned; absent regions consume no space; DOM identity preserved | 18 browser assertions passed across dynamic regions, fallback, runtime severity, announcements, reconnect and layout | Chrome evaluate_script; results.md | passed | Verified for the requested repair scope |
| V-03 | C-03; layout | 280px, long URL, icon + actions, RTL, long title | Text and action stay within border; logical ordering; no ghost gaps | 280px LTR/RTL roots have 278px client and scroll widths; 390px viewport document overflow is zero for all eight fixtures | Chrome geometry; mobile.png, light.png, dark.png | passed | Verified for the requested repair scope |
| V-04 | C-04,C-03; behavior/a11y | off/polite/assertive; Tab/Enter on action, dynamic message, axe | Correct AX roles, independent Button activation, no focus trap | AX roles/live levels correct; click and Enter each fire once; Tab reaches Retry, Shift+Tab returns; scoped axe zero violations in light/dark | Chrome snapshot, click, press_key and local axe; results.md | passed | No remaining required failure; no spoken screen-reader claim |
| V-05 | C-05; customization | Scoped tokens, per-part hook, full alternate dictionary, missing Alert rule and reset | All five public boundaries respond; no hidden paint fallback; focus/DOM preserved | All five style hooks, CSS root/title parts, scoped card token, complete alternate dictionary, missing-root structure-only reset pass; native action focus and root identity retained | Chrome evaluate_script with real focused Button; results.md | passed | Verified for the requested repair scope |
| V-06 | C-06; docs | Default first, real Controls/API, copyable source and generator | Controls update actual element; no dismissible or fixture-only APIs | Default and complete API visible; native select Controls update severity/announcement and textarea changes title; reset restores defaults; real Icon/Button/Badge registered | Chrome Docs screenshot docs.png; story tests | passed | Verified for the requested repair scope |
| V-07 | C-07; regression/package | Unit suite, lint, tsc/build, Storybook build, built fixture, primitive exports | Existing consumers unchanged; TpAlert still registered/exported | 76/76 unit tests; full lint, tsc, package and Storybook builds, diff whitespace check pass; built fixture has no overflow and correct roles/slots/export identity | npm test; npm run lint; npx tsc -p tsconfig.build.json --noEmit; npm run build; npm run build-storybook; Chrome built fixture | passed | Verified for the requested repair scope |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually used | passed | Diff: Alert extends TpElement, reexport remains in primitives; no shared controller/base edits; 22 focused story/presentation tests and typecheck pass |
| I-02 | Sourced default presentation | passed | Chrome 153 source fixture: card background, 14px type, medium title, muted description, severity marks and top inline-end Button inspected against Nova; logical grid is documented adaptation |
| I-03 | Independent constituent options | passed | Chrome: plain/title-only/description-only/empty regions correctly hidden; rich title with Badge assigned; 280px long URL with Icon/Retry remains 278px scroll width inside border |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct MCP sources, clean baseline, four review findings explicitly authorized |
| 1. Capability mapping | passed | C-01 through C-07 mapped to sources/interfaces/docs and V-01 through V-07 |
| 2. Architecture and composition reuse | passed | Standalone primitive plus TpElement/presentation owner, complete source and nested-control maps |
| 3. Behavior | passed | V-02 through V-04 |
| 4. Presentation and customization | passed | V-01, V-05 |
| 5. Accessibility | passed | V-04 |
| 6. Visual and interaction inspection | passed | V-01, V-03 |
| 7. Documentation and demo reuse | passed | V-06 |
| 8. Regression and reconciliation | passed | V-07 and complete record check |

## Documentation synchronization

- [x] Base example, Controls, complete API and code agree.
- [x] Slots, parts, properties, events/method absence and inherited boundaries documented.
- [x] Verification fixtures remain separate from curated Docs.
- [x] Compositions reuse actual Button/Icon/Badge; registration works outside Storybook.
- [x] Generator and existing story checks preserve authored docs.

## Completion / handoff

- Change summary: all four review findings repaired; Alert extracted into a small component folder with its compatibility reexport retained; appearance now belongs solely to its own shared recipe.
- Actual delivery claim: severity paint, optional/wrapping anatomy, rich-title composition and documentation repaired. No catalog-wide certification.
- Record checker: implement and verify passed before their boundaries; complete checked after reconciliation.
- Non-browser checks: 76 tests passed; full format/ESLint/stylelint, typecheck, library build, Storybook build and git diff --check passed. Storybook emits its existing large-chunk advisory.
- Behavior: dynamic insertion/removal, fallback, reconnect, preserved child identity, runtime severity, independently owned Button activation and no focus trap verified in Chrome.
- Accessibility: real keyboard and AX checks plus scoped local axe in both light/dark modes, zero violations/incomplete; no screen-reader speech test claimed.
- Visual/customization: screenshots inspected for spacing, typography, all severities, optional regions, long URL and RTL; 390px viewport has no horizontal overflow. All five public part hooks, CSS parts, scoped tokens and dictionary replacement work without losing focus.
- Documentation: complete authored API and canonical example, working Controls, real library component composition, stale dismissible removed, generator handling and existing tests updated.
- Package boundaries/shared consumers: no shared base/controller/other component recipes changed. Existing primitive source reexport and built package root preserve TpAlert identity; built registration and rich/narrow/role cases pass. Button/Icon/Badge exercised as actual consumers. Broader modal/positioning regressions are not applicable to this independent in-flow primitive.
- Evidence: `tmp/component-verification/alert/2026-10-02/results.md`, `light.png`, `dark.png`, `mobile.png`, `docs.png`; local-only artifacts, durable fixture is in tests/fixtures/components/alert.
- Required failures or blocked checks: none remaining for these four repairs. An initial input run was invalidated by a build-triggered page reload and was rerun successfully. An attempted non-public dist deep import was replaced by the real package root check (runtime code is bundled; only declarations use that deep path).
- Older out-of-scope gaps: none newly established; this record does not claim complete catalog conformance.
- Changed source revisions/reopened gates: no runtime code edits after the tested build. Source revision remains the recorded baseline plus this worktree diff.
