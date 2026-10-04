# Library completion: execution results

2026-10-04. This report covers the user-listed controls and necessary shared repairs.
The earlier user-listed implementation batch is delivered; the broader whole-library objective remains active with Foundation/composition gaps in upstream-inventory.md. Full conformance certification is
blocked by the specific native-input/media/runtime checks below. Existing working
controls were retained and checked where their shared owners changed. This is not
an assertion that every unrelated upstream catalog feature exists.

## Sources and retained ownership

Live Foundation and Component Library were read through direct Spec Blocks MCP.
Project/document identifiers, clean reference revisions and baseline are in
[audit.md](audit.md). The implementation follows local Base UI, Floating UI and
shadcn base/Nova sources, using Lit and existing Tweakpad owners. No new runtime
dependency was added. The [upstream inventory](upstream-inventory.md) distinguishes
catalog controls from remaining Foundation/composition gaps. Those gaps remain required under the whole-library objective.

- Select owns editable/query and ordinary selection through the same collection,
  form, positioning and lifecycle infrastructure. Separate Combobox registration,
  export, docs and catalog identity are removed. Native Select stays native.
- Menu owns context invocation and ordinary trigger invocation. It retains shared
  arbitrary-depth submenu, indicator, icon, shortcut and separator constituents.
  Separate Context Menu registration/export/presentation identity is removed.
- Command Palette uses Select's collection/query machinery and actual Dialog.
  Side Panel uses Dialog directly; Drawer adds its own snap/gesture policy to that
  same modal/focus owner. Preview Card retains the existing hover/anchor owners.
- Form retains Field/ValidationRun/Button; Input Group retains its actual editor
  and actions; Questionnaire uses shared atomic state and contract-required native
  answer controls, with actual Button/KeyHint. Data Visualization has a renderer
  adapter boundary, actual Tooltip, and actual accessible Table composition.
- Presentation uses shared recipes, dictionary and semantic tokens. The final
  fixed-pixel spacing search found only resolver-test literals, zero-coordinate
  fallbacks for measured Drawer motion, and the existing visually-hidden recipe.
  None is a component-specific visible spacing override.

## Additional integration defects repaired

1. Searchable Select no longer returns focus to an old editor when focus has moved
   to another editor. Authoritative remote items work without a separate items
   source. Removing the highlighted item clears the query highlight rather than
   inheriting ordinary selection's fallback-first policy.
2. Command source projections remove stale optional properties when the original
   item changes, including disabled and selection callback metadata.
3. Attachment re-registers the same authored element when its slot changes from
   actions to trigger; removal and reconnect release/restore contributions.
4. Form releases only its own disabled submission policy when an action leaves
   the form or the form disconnects. Existing authored disabled state is retained.
5. Breadcrumb and Pagination chevrons follow dynamic ancestor direction through
   logical CSS, without relying on a render-time direction snapshot.
6. The documented shared SurfaceHandle/createSurfaceHandle API is now exported.
7. The common focus-availability helper reads hidden/inert attributes. Native form
   named controls can shadow those boolean properties; previously a field named
   hidden prevented focus from reaching a later visible invalid control. The real
   browser regression now focuses the visible field. A focused unit regression
   covers the named-property case.

Earlier integration repairs, including common modal/inert coordination, initial
AlertDialog Cancel focus, Table duplicate recipe removal and primitive part
bindings, are detailed in the per-workstream records.

## Verification evidence and interpretation

All browser work used registered Google Chrome DevTools MCP, existing Storybook
6006 and Vite5173. Source fixtures are durable in
`tests/fixtures/components/library-completion/`, `select-query/`, `menu/` and
`dialogs/`. Authored Storybook examples also supplied actual compositions.
Screenshots were inspected inline in the tool conversation; the MCP server rejected
requested local artifact paths outside its workspace roots. Do not assume a local
screenshot archive is available on another machine.

- Existing unit suite: 279/281 initially passed; two stale fixture expectations
  were corrected and their 20 assertions passed. Subsequent targeted changed-owner
  batch: 44/44 Select/source/collection/state/story assertions. Common focus batch:
  15/15, including the added native-form named-property regression. These results
  are separate runs, not a claim of one fresh full-suite run.
- Existing searchable Select browser API/protocol fixture: 73/73 passed from
  source and 73/73 from the served production package. Its synthetic input
  assertions are labeled protocol evidence. Real MCP keyboard/fill separately
  verified editor focus transfer, multi-selection, query clearing and FormData.
- Existing selected Menu API fixture: 11 cases passed across the initial batch and
  two focused reruns. Corrected fixture expectations use a collision-safe anchor,
  inspect actual overlay-root Backdrop/Arrow, and listen to the actual shared
  presentation diagnostic event. These are API evidence, not native touch proof.
- Production package export/registration inspection confirms no TpCombobox or
  TpContextMenu, no removed custom-element tags, and an exported SurfaceHandle
  factory. Built styles and actual registration loaded in Chrome.
- Native keyboard/pointer, AX tree and local axe were inspected separately.
  Actual Form/Questionnaire/Attachment/InputGroup/OTP/navigation/resize/scroll
  composition, primitive composition, Drawer modal, Data Visualization and
  independently recorded stories reported zero relevant axe violations. An early
  duplicate Table fixture landmark label was repaired without suppressing rules.
  Chart contrast included an incomplete automated row and was visually inspected.
  No screen-reader speech testing is claimed.
- Light/dark/RTL and changed spacing were visually inspected. A 320px chart
  container measured a320x180 plot with a105.34px inspection popup; table content
  uses its native scrolling wrapper. Avatar fallback/group and navigation rail
  centers, menu spacing, joined Input Group boundaries, OTP groups, optional
  Drawer/SidePanel regions, Bubble treatments and Table pinned geometry were
  checked in their real compositions.
- Data Visualization renderer replacement yielded first mount/update/destroy,
  second mount/update/destroy. Server-style data-chart adoption and reconnect
  preserve scope; that is client lifecycle evidence, not SSR hydration proof.
- Preview Card handle switching/removal, detached inert state, disabled native
  href preservation, open veto and explicit initial/return focus pass.
- Attachment native Enter follows its href; keyboard removal emits once without
  removing the card. Pagination click and Enter cancellation preserve page and
  URL. Breadcrumb removal and disconnect restore owned slot/current attributes.

Final lint, TypeScript, production build, Storybook build and diff checks are
recorded below after the last shared focus change. Builds prove types/bundles and
documentation composition, not visual or interaction completeness.

## Explicitly blocked evidence

The registered Chrome MCP tool schema has no native secondary mouse-button input,
wheel/touch/long-press/pointer-cancel injection, IME/autofill/clipboard driving,
software keyboard control, or forced-colors/OS reduced-motion emulation. The current
runtime also has no configured SSR/hydration execution setup. Applicable V-98 and
V-99 rows preserve these requirements; API simulation, viewport resizing and
component motionPolicy=reduce do not satisfy them.

All 17 records passed source/design and early integration checks. The complete
checker is intentionally blocked by those explicit rows and corresponding gates;
there is no full-component or universal-library conformance claim. The requested
implementation is not reduced or deferred to a smaller feature set.

## Final command results

- `npm run lint`: passed (Prettier, ESLint, Stylelint). The final shared focus/export
  edits additionally passed targeted Prettier and ESLint.
- `npx tsc --noEmit`: passed after the final focus regression fixture correction.
- `npm run build`: passed after the final focus change; served built Form confirms
  invalid focus reaches the visible field even with another control named hidden.
- `npm run build-storybook`: passed after that production build. Existing large
  chunk advisory remains; no build error.
- `git diff --check` and `git diff --cached --check`: passed.
- `check-gates.mjs`: all17 records permit verify; complete remains blocked only by
  the explicitly recorded unavailable evidence. Machine-readable details are in
  [gate-results.json](gate-results.json).
- After the focus repair, actual shared Dialog non-modal/trap-focus-only/modal
  policy checks and reduced close-transition check pass, with page overflow
  restored after removal.

The work remains uncommitted. Existing servers and user-owned browser tabs were
preserved. Temporary execution logs in /tmp are local only; this report and the
source fixtures carry the durable conclusions.

## NumberField continuation

The NumberField Foundation composition and affected shared owners have a separate [execution record](number-field/execution-evidence.md). Source and built Chrome,65 focused tests plus16 final numerical regression tests, types/lint and both builds pass for the recorded paths. Complete remains blocked for unsupported native input/media evidence. This updates the whole-library continuation, not the earlier listed-control batch completion boundary.

Content-security service2026-10-04: see [execution evidence](content-security/execution-evidence.md). Shared runtime resource owner and existing CSSOM binding now cover all generator paths.26 focused tests, type/lint checks and both builds pass. Actual built strict-policy interactions report zero library violations; initial/dynamic suppression preserves native editing/selection/forms, consumer styles and node identity. Nonce-aware independent accessibility check reports zero violations. Service complete checker passes; this does not complete the library-wide objective.
