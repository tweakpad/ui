# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: List (`tp-list`) with its members List item (`tp-list-item`) and List separator (`tp-list-separator`); catalog `['List', 'tp-list', 'preset-composition']`. Replaces the List item family (`tp-list-item`, `tp-list-item-group`, `tp-list-item-separator`).
- Requested work / claim: Bounded rename and contract repair. The container is named for the collection (`tp-list`, parent of `tp-list-item`); the Storybook, catalog and docs entry becomes List; list semantics move to the List host; and a tag-naming rule is added to the Component Library.
- Scope source: User request 2026-10-14 (parent/child naming `tp-list` → `tp-list-item`, Storybook entry "List"). User decisions in plan review: rename List only, leaving the Attachment, Bubble, Message, Avatar, Image and Kbd groups unchanged; add a tag-naming rule to the CL. The plan was approved (`we-need-to-introduce-parsed-tide.md`).
- In-scope changes and existing gaps:
  - CL List section and naming law.
  - Drag Drop List and Flow references.
  - `src/components/list/` (moved from `list-item/`).
  - Family and recipe renamed to `list`.
  - Catalog, register and exports.
  - Consumers: Menu item, Drag drop list, Flow node and inspector, workspace, Map and Marker examples.
  - Stories, examples, docs, fixture, changeset and size report.
  - Out of scope: the other `-group` families and the four declared member-prefix families keep their tags.
- Repository baseline / unrelated changes: `ad72936`. The uncommitted Citation and font-mono work from this session is preserved; only the Citation checklist path to the List owner changed.
- Live project / document IDs and revisions:
  - Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
  - Documents: Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; UI Widgets `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f`.
  - Head before the change: `01d08263` (v0.23.5).
  - Commits: `9fd6e2bb` (v0.23.6: List section, `req-cl-91-tags`, `tbl-cl-91-member-prefix`, `ucl22-list-item-q4`, Drag Drop List and Flow references) and `f899c9bb` (bump to v0.24.0).
- Owning contracts / dependencies / vocabulary:
  - CL §22 List (`ucl22-list-item`, q1–q4, public definition and detail).
  - CL §91 slot naming (`req-cl-91-derive`, new `req-cl-91-tags`, `tbl-cl-91-member-prefix`).
  - Separator (`ucl22-separator`).
  - Drag Drop List adoption blocks (`dnd-adopt-*`).
  - Widgets Flow `flx-0003`, `flx-0130`.
- Local reference evidence: `../specification/external/ui` at `63c1308d1`, clean.
  - `apps/v4/registry/bases/base/ui/item.tsx`: `ItemGroup` is a `div role="list"`, `ItemSeparator` a horizontal Separator.
  - `apps/v4/registry/styles/style-nova.css`: `.cn-item-group` (`gap-4`, `has-data-[size=sm]:gap-2.5`, `has-data-[size=xs]:gap-2`) and `.cn-item-separator` (`my-2`).
- Tool readiness: Spec Blocks direct MCP and Chrome DevTools MCP both available.
- Browser / server / build under test:
  - Chrome through DevTools MCP.
  - The user's Storybook dev server on :6006, for docs, stories and consumer regressions.
  - A private Vite server on :5197 for the fixture, against source and the built package (`?package`).
  - `npm run build` and the `storybook-static` build.
- Evidence directory: `tmp/component-verification/list/2026-10-14/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/list/index.html` (`api.ts` `verifyList`)
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Root `tp-list`: list semantics on the host; an authored host role is preserved; the role is released on disconnect | CL q4, anatomy Root | ui `item.tsx` `ItemGroup` `role="list"` | `TpList` `#ownRole` (`OwnedAttributes`) in `connectedCallback`/`disconnectedCallback` | docs/list.md (List, Accessibility) | V-01, V-06 | passed | Fixture q4 host-role assertions on source and package; verbose a11y tree shows list "Recent files" |
| C-02 | Label: the accessible name of the list, set on the Root (`aria-label`, default none) | CL props Label, q4 | `ItemGroup` props spread | `ariaLabel` property reflected from `aria-label` | docs/list.md, story `label` arg | V-01, V-10 | passed | Fixture: the name is read; Storybook Default story `label` control "Documents" |
| C-03 | Direct `tp-list-item` members become list items unless they set their own role; added items gain the role; moved or removed items lose it | CL q4 | — | `#sync` on `slotchange` and `updated`; member `OwnedAttributes` | docs/list.md (Accessibility) | V-02, V-06 | passed | Fixture: add, move-out, list removal and authored `article` role |
| C-04 | A standalone Item carries no list item role and still works on its own, including when composed by Drag drop list, Menu item and Flow nodes | CL q4, purpose | ui `Item` standalone | `TpListItem` unchanged except the root part name | docs/list.md (List item) | V-03, V-08 | passed | Fixture standalone assertion; a11y tree shows the standalone row as generic; consumer regressions |
| C-05 | Separator: `tp-list-separator` (part `list-separator`); a plain `tp-separator` member takes the `list-separator` presentation | CL anatomy Separator, slots | ui `ItemSeparator` | `TpListSeparator`; `presentationController.registerPart('list-separator', child)` | docs/list.md (List separator) | V-04, V-05 | passed | Fixture parts assertions; docs Separators example geometry unchanged |
| C-06 | Parts and keys: `list` (variant and size axes), `list-item` (row, was `list-item-root`), `list-item-*` unchanged, `list-separator`; gap 4 / 2.5 / 2 by item size; separator `margin-block` space-2 | CL public definition and detail (v0.24.0) | nova `.cn-item-group`, `.cn-item-separator` | `families/list.ts` `listPresentation`; `recipes/list.ts` `listAppearance` | docs/list.md (parts table) | V-04, V-05 | passed | Fixture `partPresentation` reaches `list`; CEM parts; geometry of 18 docs lists identical to the before baseline |
| C-07 | Item properties unchanged and set on each Item: `variant` (ghost), `size` (default), `media-treatment` (plain), `selected`, `href`/`target`/`rel`, `description`, slots | CL props, q1–q3 | ui `Item` variants | `TpListItem` API unchanged | docs/list.md (List item) | V-05, V-10 | passed | Docs examples identical geometry; Default story controls apply to every row |
| C-08 | Tag naming: the host is `tp-<component>` and members `tp-<component>-<part>`; a collection control is named for the collection; declared member prefixes for Media player, Command palette, Resizable panel group and Tree view | CL `req-cl-91-tags`, `tbl-cl-91-member-prefix` | — | Tags `tp-list`, `tp-list-item`, `tp-list-separator`; catalog name List | docs/list.md | V-09 | passed | CEM tags; grep finds none of the old names; `stories.test`, `families.test` and `resolver.test` consistency suites pass |
| C-09 | Docs, Storybook entry, examples, fixture, changeset and size report | Docs policy | — | `docs/list.md`, `src/stories/list.*`, `list-example.js`/`.d.ts`, `.changeset/list.md`, `size-report.json` | docs/list.md | V-09, V-10 | passed | Storybook index lists only `components-list--docs`/`--default`; builds pass |
| C-10 | Consumers follow the rename: Flow inspector connections (`tp-list`), Menu item row hook (`list-item` padding 0), Drag drop list rows, workspace pages, settings dialog, Map and Marker examples | CL `dnd-adopt-*`; Widgets `flx-0003`, `flx-0130` | — | Import paths, tags and part keys updated; Marker `div role=list` replaced by `tp-list` | docs/widgets/flow.md, docs/drag-drop.md | V-08 | passed | Regression screenshots and a11y checks recorded below |

Record spec/reference conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | CL §22 "List item" modelled the container as the part Group with the bare slot `list-item` and pushed the row to `list-item-root`, against `req-cl-91-derive`; the CL had no element-tag rule | List family, Menu item, Drag drop list, Flow | Rename the control to List: Root `list`, Item `list-item`, Separator `list-separator`; foundation parts `List.*`; add q4 and `req-cl-91-tags` | Spec `9fd6e2bb` (v0.23.6) and `f899c9bb` (v0.24.0); user decision | passed |
| S-2 | The new tag rule would make 39 existing member tags nonconforming (Media player, Command palette, Resizable panel group, Tree view) | Those four families | Declare their member prefixes in `tbl-cl-91-member-prefix`; no renames (user decision: List only) | Spec `9fd6e2bb`; tag audit across `src/register.ts` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/list/`:
  - `list.ts`: Root. Host role, name, member roles and separator registration.
  - `list-item.ts`: the row, unchanged apart from the root part name.
  - `separator.ts`: the Separator binding.
  - `index.ts`.
- Supported exports / registration / constituent API impact:
  - `TpList` replaces `TpListItemGroup`, and `TpListSeparator` replaces `TpListItemSeparator`. `TpListItem` is kept.
  - `listPresentation` replaces `listItemPresentation`.
  - Registered tags: `tp-list`, `tp-list-item`, `tp-list-separator`.
  - No aliases (no consumers).
- Public vocabulary / tokens / parts / presentation review: part names follow live CL v0.24.0. Recipe declarations are unchanged; only keys were renamed.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Host role ownership | `item.tsx` `ItemGroup` `role="list"` on the container element | `src/foundation/owned-attributes.ts` `OwnedAttributes`; host-role pattern in `src/components/timeline/timeline.ts` | Reused. The role moves from the inner stack div to the host so the named host is the list; an authored role wins | `TpList`, `TpTimeline` / V-01 |
| Member list item roles | Consumer-authored `role="listitem"` | Previous `TpListItemGroup.#sync` (`OwnedAttributes` per member) | Kept and moved into `TpList` | `TpList`, `TpCitationList` (same pattern) / V-02 |
| Vertical stack | `.cn-item-group` flex column | `src/components/shared/stack-group.ts` `stackGroupStyles` (Bubble and Message groups) | Reused unchanged; part `list` on `.group` | List, Bubble group, Message group / V-05 |
| Divider | `ItemSeparator` → `Separator` | `src/components/separator/separator.ts` `TpSeparator` | `TpListSeparator` composes the decorative Separator; a plain `tp-separator` gets `registerPart('list-separator')` | List / V-04 |
| Row appearance | `Item` variants, sizes and media | `families/list.ts` + `passiveVariantAppearance` | Same presentation sources under renamed keys | Menu item (`list-item` hook), Drag drop list, Flow node rows / V-08 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root (`list`) | base / nova | `style-nova.css` `.cn-item-group` `gap-4`, `has-data-[size=sm]:gap-2.5`, `has-data-[size=xs]:gap-2` | `recipes/list.ts` `list` (`gap: var(--tp-space-4)`, `:host(:has(tp-list-item[size=sm/xs]))` gaps) + `stackGroupStyles` | Key renamed from `list-item`; declarations unchanged | V-04, V-05 |
| Item (`list-item`) | base / nova | `.cn-item`, `.cn-item-variant-*`, `.cn-item-size-*` | `recipes/list.ts` `list-item` + `passiveVariantAppearance(definition, 'list-item')` | Key renamed from `list-item-root`; declarations unchanged | V-05 |
| Item sub-parts (`list-item-media`, `-content`, `-title`, `-description`, `-actions`, `-header`, `-footer`) | base / nova | `.cn-item-media*`, `.cn-item-content`, … | `recipes/list.ts` unchanged keys | No change | V-05 |
| Separator (`list-separator`) | base / nova | `.cn-item-separator` `my-2` | `recipes/list.ts` `list-separator` (`margin-block: var(--tp-space-2)`) + Separator recipe | Key renamed from `list-item-separator` | V-04, V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| List internals | divider | `tp-separator` (via `tp-list-separator`) | V-04 | none |
| Stories / docs examples | rows, media, actions, avatars, badges | `tp-list`, `tp-list-item`, `tp-list-separator`, `tp-icon`, `tp-button`, `tp-avatar`, `tp-badge` | V-05, V-10 | none |
| Flow inspector Wiring | connection lists | `tp-list` + `tp-list-item` (`elementDependencies` `TpList`) | V-08 | none |
| Marker example "Files read" | file rows | `tp-list` (replaces a hand-built `div role=list`) | V-08 | none |
| Workspace overview, sites, activity, settings dialog; Map example | rows | `tp-list` + `tp-list-item` | V-08 | none |
| Drag drop list | sortable rows | `tp-list-item` inside its own ordered list | V-08 | Drag drop list owns its ordered-list semantics per its contract (`dnd-adopt-*`); it composes List items without a List |
| Menu item | row layout | `tp-list-item` with `list-item` padding hook | V-08 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02; behavior/a11y | Fixture `verifyList`: `tp-list aria-label="Teams"`; `tp-list role="menu"` | Host `role=list` named Teams; authored host role kept | As expected | DevTools MCP evaluation; `verifyList` 15/15 on source and `?package` (minified class confirms dist) | passed | — |
| V-02 | C-03; behavior | Members with and without a role; append an item; move an item out; remove the List | `listitem` on plain members; authored `article` kept; added item gains the role; moved and released items lose it; authored role survives release | As expected | `verifyList` (source and package) | passed | — |
| V-03 | C-04; behavior/a11y | Standalone `tp-list-item` | No role; generic in the a11y tree | No role; generic node outside the list | `verifyList`; verbose a11y snapshot | passed | — |
| V-04 | C-05, C-06; customization | Shadow parts; plain `tp-separator` member; `partPresentation` on `list` | Parts `list`, `list-item`, `list-item-content`, `list-separator` present; plain separator gets the margin; `display: grid` hook reaches `list` | As expected | `verifyList` | passed | — |
| V-05 | C-06, C-07; visual parity | Storybook List docs: all 18 example lists, before and after the rename (user Storybook :6006, light) | Identical list and row geometry | All 18 lists match `before/geometry.json` exactly; Mail folders screenshot identical | `before/geometry.json`, `before/mail-folders.png`, `after-mail-folders.png`, `before/people.png` | passed | — |
| V-06 | C-01, C-03; accessibility | Fixture in dark and light | Named list with list items; 0 axe violations | list "Recent files" with 2 listitems; axe-core 0 violations in dark and light | Verbose a11y snapshot; axe-core (`/node_modules/axe-core/axe.min.js`) | passed | No screen-reader run |
| V-07 | C-06; visual | Fixture in dark, light and RTL (`dir=rtl`) at 1440 px; package build in dark | Outline rows, separator spacing and description colors correct; mirrored in RTL | As expected; the package render matches the source render | `fixture-source-dark.png`, `fixture-source-light-rtl.png`, `fixture-package-dark.png` | passed | Storybook has no theme or direction switch; dark and RTL come from the fixture |
| V-08 | C-04, C-10; regression | Flow inspector Wiring; Menu rows; Drag drop list; workspace overview/sites/activity; settings dialog; Map Lisbon sights; Marker Files read | Lists named with listitems; Menu rows keep padding 0 and no role; no undefined `tp-*` tags | As expected | `after-flow-inspector.png`, `after-menu-rows.png`; DevTools evaluation per story | passed | — |
| V-09 | C-08, C-09; build/package | `npx vitest run`; `npm run lint`; `npm run build` (CEM); `npm run size:report`; `npm run build-storybook`; grep for old names | All pass; CEM lists `tp-list`, `tp-list-item`, `tp-list-separator` and no group; no old names | vitest 222 files, 2005 passed, 3 skipped; lint exit 0 (after formatting `recipes/list.ts`); build and CEM as expected; size report regenerated; Storybook build passes; grep clean | Commands | passed | — |
| V-10 | C-02, C-07, C-09; docs | Storybook index; Default story and Controls; docs page | Entry "List" only; Default renders three items with label, variant, size, media treatment and selected controls; 19 lists on the docs page all role list | As expected; no undefined tags | `after-default.png`, `docs-snapshot.txt`; DevTools evaluation | passed | — |
| V-11 | C-01; frameworks | Vue props row `tp-list` with `aria-label` | the label reaches the host attribute (the host is the list) | before: Vue set only the `ariaLabel` property, the host stayed unnamed; after: `aria-label` reflects | React and Vue props matrix (`tests/fixtures/frameworks/props.ts`) via DevTools MCP | passed | — |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `TpList` uses `OwnedAttributes` for host and member roles, `stackGroupStyles` and `registerPart`. The Group's inner `role=list` is removed. Flow inspector, workspace, Map and Marker compose `tp-list`; the Marker example's hand-built list is gone. |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Recipe declarations unchanged under renamed keys, and they match nova `.cn-item-group` and `.cn-item-separator`; geometry parity on all 18 docs lists (V-05). |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | The List's role and name are independent of Item `variant`, `size`, `media-treatment` and `href`; a standalone Item keeps its full API without a List (V-03, V-05, V-10). |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live CL and Widgets read through direct MCP at `01d08263`; reference `item.tsx` and nova styles at `63c1308d1`; user scope (List only, add tag rule) recorded. |
| 1. Capability mapping                 | passed  | C-01…C-10 map q1–q4, Label, parts, separator, naming rule, docs and consumers to V-IDs; S-1 and S-2 resolved by spec `9fd6e2bb` and `f899c9bb`. |
| 2. Architecture and composition reuse | passed  | `OwnedAttributes`, Timeline host-role pattern, `stackGroupStyles`, `TpSeparator` and `registerPart` reused; no parallel owners; Marker example substitute removed. |
| 3. Behavior | passed | `verifyList` 15/15 on source and `?package`. |
| 4. Presentation and customization | passed | Parts in CEM; `partPresentation` reaches `list`; Menu item `list-item` hook works. |
| 5. Accessibility | passed | Verbose a11y tree (named list, list items, standalone generic); axe 0 violations in light and dark. No screen-reader run. |
| 6. Visual and interaction inspection | passed | Docs geometry parity (18 lists); fixture in light, dark and RTL; package render; consumer screenshots. |
| 7. Documentation and demo reuse | passed | `docs/list.md` (List, List item, Accessibility, List separator); Default story first with controls; examples compose real components; docs standalone. |
| 8. Regression and reconciliation | passed | vitest, lint, build (CEM), size report, Storybook build; Flow, Menu, Drag drop list, workspace, Map and Marker rechecked; record reconciled. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary:
  - List item becomes List: `tp-list` (Root, host `role=list` named by `aria-label`), `tp-list-item` (Item) and `tp-list-separator` (Separator).
  - Parts are `list`, `list-item`, `list-item-*` and `list-separator`.
  - The catalog, Storybook and docs entry is List.
  - The CL gains `req-cl-91-tags` and the declared member-prefix table.
- Actual delivery claim: Bounded rename and q4 contract repair, verified in Chrome on source and the built package. The rest of the List item contract (q1–q3) is unchanged and keeps its prior evidence; geometry parity confirms no visual change.
- Record checker: `node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/list/implementation-checklist.md --stage implement|verify|complete`.
- Non-browser checks:
  - `npx vitest run`: 222 files, 2005 passed, 3 skipped.
  - `npm run lint`: exit 0.
  - `npm run build` (inside `size:report`): exit 0; the CEM has `tp-list`, `tp-list-item` and `tp-list-separator`.
  - `npm run build-storybook`: exit 0.
- Behavior: `verifyList` 15/15 (source and `?package`).
- Accessibility: verbose a11y tree; axe 0 violations in light and dark. No assistive-technology run.
- Visual/customization/motion inspection: screenshots in `tmp/component-verification/list/2026-10-14/`; no motion involved.
- Documentation and demo composition reuse: Storybook Docs examples render real components; 19 named lists on the docs page; no undefined tags.
- Shared-consumer regressions / package boundaries: Flow inspector, Menu rows, Drag drop list, workspace, Map and Marker; the package fixture uses dist `register.js` and `styles.css`.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: the other `-group` families (Attachment, Bubble, Message, Avatar, Image, Kbd) keep their names by user decision; Media player, Command palette, Resizable panel group and Tree view keep their member tags under declared prefixes.
- Changed source revisions / reopened gates: spec v0.23.5 → v0.24.0; no gate reopened after verification.
