# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Citation (`tp-citation`) with its List member (`tp-citation-list`); catalog kind preset-composition.
- Requested work / claim: Complete new component: inline badge-styled source reference with icon, hover state, label and/or number, optional source preview, and a citation list for footer sources.
- Scope source: User review 2026-10-14: outline default ("just a border"), no gray fill or gray hover, favicon leading and external-link arrow trailing on hover without widening (arrow over the label end with a fade), site URLs open in a new tab unless `target` is set, muted reference text, demos show one style each (labelled inline, or numbered markers that move focus to the list entry), ~2px space before numbered markers. User request 2026-10-15 ("a new component called citation … display inline references to external sources … icon, hover state, label, and or a number … correspond to a text citation at the footer"); user decisions: hover fill + optional Preview card; number placement configurable with baseline default; include `tp-citation-list`.
- In-scope changes and existing gaps: new spec section CL §22 Citation (v0.22.0); `src/components/citation/`; family/recipe; Badge focus-ring repair for focusable non-interactive badges; globe icon; catalog/register/exports; docs, stories, examples, fixture; changeset.
- Repository baseline / unrelated changes: `f36e3cc` (motion tokens committed by the user); no unrelated worktree changes touched.
- Live project / document IDs and revisions: project `prj_c5a403a0-…`; Component Library `doc_8077bf7c-…`; spec commits `d82acb99` (Citation content, v0.21.1), the v0.22.0 bump, and v0.22.1 (q8: visible label and mark stay the citation's own; a referenced image appears in the preview); after user review: `e33b3522` v0.22.2 + bump v0.23.0 (outline default without hover fill, new-tab default for site addresses, external mark q9, External mark part), v0.23.1 (mark overlays the label end over a fade; no mark may change the inline size), v0.23.2 (outline/ghost text in the muted foreground), v0.23.3 (q10: fragment link to another Citation moves focus to it; preview shows the source's host).
- Owning contracts / dependencies / vocabulary: CL §22 Citation (`ucl22-citation`, q1–q8); related Badge (`ucl22-badge`), Preview card (`ucl19-preview-card`), Button link pattern (`ucl16-button`); CL §5 tokens incl. motion roles.
- Local reference evidence: no in-repo inline citation reference (searched all of `../specification/external/`). Evidence used: `ui` 63c1308d1 `registry/bases/base/ui/badge.tsx` (badge render-as-link), `hover-card.tsx` + nova `.cn-hover-card-content`, `blocks/preview-03/components/part-source.tsx` (hostname helper, source card), typeset footnote markup; `base-ui` 5b495488d `preview-card/` (600/300 ms delays, inline anchoring). User design reference (external page) used for features only.
- Tool readiness: Spec Blocks direct MCP available; Chrome DevTools MCP available (was wedged earlier, unblocked by user).
- Browser / server / build under test: Chrome via DevTools MCP; the user's Storybook dev server :6006 (docs, stories, Badge and Preview card regressions); a private Vite server :5197 for the fixture (source and `?package` dist); `storybook-static` build.
- Evidence directory: `tmp/component-verification/citation/2026-10-15/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/citation/index.html`
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `href` / `target` / `rel` (null): accepted address (relative, fragment, http, https, mailto, tel) renders a native link; others render inert text | CL q1 | ui `badge-link.tsx` render-as-link; local `foundation/markdown/url.ts` `allowedUrl` | `TpCitation` badge render delegate → `<a>` or `<span>` | docs/citation.md | V-01, V-02 | passed | fixture q1 assertions (link, target/rel, `javascript:` inert); Enter activates; V-01, V-02 |
| C-02 | Accessible name `{citation} {number}: {label ‖ source title ‖ host}`; locale-formatted number; `messages.citation` | CL q2 | part-source `getHostname` | `#accessibleName()`, `numberFormatter`, `resolveLocale` | docs/citation.md | V-03 | passed | fixture q2 assertions incl. host fallback, fragment, `ar-EG` digits; a11y tree names |
| C-03 | Composes Badge; `variant` (default `secondary`) forwarded; `interactive` iff linked | CL q3 | ui badge variants | `<tp-badge part="citation-badge">` | docs/citation.md | V-01, V-04 | passed | fixture q3 assertions; variants matrix screenshots |
| C-04 | `index` number; number-only compact chip (inline size ≥ block size); leading count chip when labeled | CL q6 | typeset `sup a` footnote | `citation-index` part; `setPartComposition` compact badge | docs/citation.md | V-04 | passed | number-only chip width ≥ height (fixture q6); leading count tinted from the variant foreground (`index-colors-after.png`) |
| C-05 | `src` source mark reserves icon extent while loading; falls back to `icon` slot, else default globe mark | CL q4 | Avatar image fallback | `ImageLoadController`; `citation-icon` part; `globeIcon` | docs/citation.md | V-05 | passed | fixture q4: width held on failure, default mark shown |
| C-06 | Label: default slot content | CL anatomy | ui badge children | `citation-label` part, default slot | docs/citation.md | V-04 | passed | docs and fixture screenshots; label ellipsizes (computed `text-overflow`) |
| C-07 | Preview only with `description` or `preview` slot content; Preview card policy (600/300 ms, describes trigger, hover/focus); shows mark + host, title, description | CL q5 | ui `hover-card.tsx`; base-ui PreviewCard | composed `tp-preview-card` with slotted preview parts | docs/citation.md | V-06 | passed | real hover and keyboard focus open the preview after the delay; `aria-describedby` set; start-aligned card |
| C-08 | `superscript` raises without size change; default baseline | CL q6 | typeset `sup` | host `vertical-align` | docs/citation.md | V-07 | passed | 375px light/RTL: 24px line box unchanged with superscript markers |
| C-09 | `source` id reference fills unset values; follows changes, appearance, removal; own values win | CL q8 | GFM footnote reference ↔ definition | module registry of connected citations | docs/citation.md | V-08 | passed | fixture q8: number/title, edits, move, removal; own label stays |
| C-10 | List: list semantics, entries list items, numbering from `start` in order, renumber on change; `label` (default `messages.sources` "Sources"); `orientation` vertical/horizontal | CL q7 | GFM `section.footnotes ol` | `TpCitationList` (`role=list`), entry internals role `listitem` | docs/citation.md | V-09 | passed | fixture q7: list role, entries are list items, renumber on move, role released when moved out; a11y tree list "Sources" |
| C-11 | Public parts and keys: citation, citation-badge, citation-index, citation-icon, citation-label, citation-preview(-source/-title/-description), citation-list(-orientation-*) | CL public definition | — | `families/citation.ts`, `recipes/citation.ts` | docs/citation.md | V-10 | passed | parts in CEM; `partPresentation` override applied (earlier session evidence) |
| C-12 | Badge focus indication for a focusable non-interactive badge (preview target of an inert citation) | CL q1, Badge q2 | — | `recipes/badge.ts` focus rule | docs/badge.md | V-06 | passed | Badge focus rule covers `[tabindex]`; inert-with-preview ring (`focus-inert.png`); Badge story ring unchanged |
| C-13 | Docs, stories (Default first), examples, fixture, changeset | Docs policy | — | `docs/citation.md`, `src/stories/citation.*` | docs/citation.md | V-11 | passed | docs, stories, examples, fixture, changeset present; builds pass |
| C-14 | Outline default; no Badge hover fill on outline; hover strengthens the border; outline/ghost text muted, foreground on link hover/focus | CL q3 (v0.23.0, v0.23.2) | ui `badge.tsx` outline | `variant='outline'`; `citation-badge` recipe via `::part(badge)` (composition precedent: Calendar, Pagination) | docs/citation.md | V-12 | passed | `outline-rest.png`, `outline-hover.png`, `docs-inline-hover-light.png`; fixture q3 |
| C-15 | Site address opens in a new tab unless `target`; name ends with `messages.newTab`; external-link mark over the label end with a label fade on hover/focus; no width change; none without a label | CL q2, q9 (v0.23.0–v0.23.1) | — | `externalLinkIcon` (Badge example icon); `.text` wrapper; `citation-external` part; `mask-image` fade (Code block / Message scroller recipe precedent) | docs/citation.md | V-12, V-13 | passed | width 228.96→228.96 and 114.48 (RTL) on real hover; fixture q9 |
| C-16 | Fragment link to another Citation moves focus to it (managed, no preview pop); preview host falls back to the source citation's host | CL q10 (v0.23.3) | — | `#onLinkClick` + `focusManaged`; `focus()` forwards to the Badge part | docs/citation.md | V-14 | passed | Tab+Enter on marker → entry 1 focused, ring shown, preview closed; fixture q10 |
| C-17 | Numbered marker keeps `--tp-space-0-5` from the preceding word | CL q6 (presentation) | — | `citation` host part `&[data-number-only]` margin | docs/citation.md | V-12 | passed | gap 0px → 2px measured; `marker-spacing.png`; fixture q6 |

Record spec/reference conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Citation contract existed | Whole component | Add CL §22 Citation with q1–q8 and coverage row | Spec commit d82acb99 + bump v0.22.0 (user requested the component) | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/citation/` — `citation.ts` (root: link/inert, number, mark, label, preview, source association), `citation-list.ts` (list semantics and numbering), `source.ts` (address acceptance, host, source registry), `index.ts`.
- Supported exports / registration / constituent API impact: new exports `TpCitation`, `TpCitationList`; catalog tuple `['Citation', 'tp-citation', 'preset-composition']`; register both tags; new icon `globeIcon`.
- Public vocabulary / tokens / parts / presentation review: names follow live spec §22; tokens only (badge recipe, `--tp-*` roles).

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Chip surface, variants, hover fill, focus ring, hit target | ui `badge.tsx` (`render={<a/>}`) | `src/components/badge/badge.ts` (`interactive` + `partContracts.badge.renderDelegate`) | Compose TpBadge; repair focus rule for `[tabindex]` badges | Citation, Badge / V-01, V-04, V-06 |
| Source preview on hover/focus | ui `hover-card.tsx` → base-ui PreviewCard | `src/components/preview-card/preview-card.ts` (`registerTrigger`, default slot content) | Compose TpPreviewCard; content slotted from Citation's shadow scope | Citation / V-06 |
| Address acceptance | ui part-source link | `src/foundation/markdown/url.ts` `allowedUrl`, `DEFAULT_LINK_PROTOCOLS` | Reuse unchanged | Citation, Markdown / V-02 |
| Source image with fallback | — | `src/foundation/image-load.ts` `ImageLoadController` (Avatar, Image) | Reuse; Citation renders its own small `img` in the reserved mark box | Citation / V-05 |
| Number formatting / locale | — | `src/foundation/intl.ts` `numberFormatter`, `services.ts` `resolveLocale` | Reuse | Citation / V-03 |
| Slot observation | — | `src/components/shared/slots.ts` `observeSlots`, `slotOccupied` | Reuse | Citation / V-04, V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Chip (citation-badge) | base / nova | `.cn-badge` h-5 gap-1 rounded px-2 text-xs font-medium; `-secondary` | `badgeAppearance` + `passiveVariantAppearance` via TpBadge | Default variant secondary; number-only compact via part composition | V-04 |
| Index (citation-index) | base / nova | typeset `sup a` footnote number | `currentColor` 15% tint from the Badge variant foreground (Tooltip Key hint contextual palette, `src/components/tooltip/tooltip.ts`), `--tp-radius-full`, `--tp-text-xs` | Leading count chip inside labeled pill; plain number when alone | V-04 |
| Icon (citation-icon) | base / nova | `[&>svg]:size-3` in badge | badge `--_tp-icon-extent` (`--tp-icon-size-xs`) | Image/Icon at icon extent, radius-sm for images | V-05 |
| Preview (citation-preview*) | base / nova | `.cn-hover-card-content` w-64 p-2.5 text-sm; demo title font-semibold, meta text-xs muted | `previewCardCoreAppearance` (surface) + new title/description/source recipe on typography roles | Muted source row, medium title, muted description | V-06 |
| List (citation-list) | base / nova | GFM footnotes `ol` | flex column/row with `--tp-space-*` gap; entry `role=listitem` through `OwnedAttributes` (List group precedent, `src/components/list/list.ts`) | Orientation axis | V-09 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Citation internals | chip | `tp-badge` | V-04 | none |
| Citation internals | preview | `tp-preview-card` | V-06 | none |
| Citation internals | default mark / slotted mark | `tp-icon` | V-05 | Source image is a native `img` (content media, as in Avatar) |
| Stories / docs | answer text + footer | `tp-citation`, `tp-citation-list`, `tp-icon` (icon slot) | V-11 | Paragraph and article text is native content |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-03; behavior | linked citation; click; keyboard Tab + Enter | native link with href/target/rel, interactive badge hover fill and ring | native `<a>` with href/target/rel; interactive Badge hover fill and ring; Enter activates | fixture `verifyCitations` + DevTools Tab/Enter; `focus-link.png` | passed | — |
| V-02 | C-01; behavior | `javascript:` and missing href | inert, not focusable, non-interactive badge | `javascript:` → inert `<span>`, no tabindex, non-interactive Badge; fragment/relative/mailto accepted | fixture q1/q3 + `source.test.ts` | passed | — |
| V-03 | C-02; accessibility | number + label, number only, title only, host only; `lang` | names per rule; locale digits | names per rule (label, number-only, host without www, fragment no host, `١٬٢٣٤`); note role for inert | fixture q2 + verbose a11y snapshot (`a11y-verbose.txt`) | passed | — |
| V-04 | C-03, C-04, C-06; visual | label, number, number+label, icon+label, variants | Badge look; compact number chip; leading count | Badge look per variant; compact round number; leading count tint follows each variant in light and dark (was page background before fix) | `index-colors-before.png`, `index-colors-after.png`, `docs-index-colors.png` | passed | — |
| V-05 | C-05; visual/behavior | src ok, src failing, icon slot | extent reserved; fallback mark; no width change | loading and failed image keep width; default globe mark on failure; icon slot used | fixture q4; earlier DevTools probes | passed | — |
| V-06 | C-07, C-12; behavior/a11y | hover and focus with description; inert + description | preview opens with delay, describes trigger; focus ring | preview opens after hover delay and keyboard focus delay, start-aligned, `aria-describedby`; focus ring on link and inert note | `fixture-preview-settled.png`, `fixture-keyboard-preview.png`, `focus-inert.png` | passed | — |
| V-07 | C-08; visual | superscript in paragraph | raised, same size; default baseline | superscript raised, same size; 4 lines × 24px at 375px; baseline default | `fixture-light-375-rtl.png` | passed | — |
| V-08 | C-09; behavior | in-text `source` before list; edit entry; remove entry | values follow; own values win | values follow edits, moves, removal and late appearance; mutual references settle; own label wins | fixture q8 | passed | — |
| V-09 | C-10; behavior/a11y | list of 3, add/remove/move, start=5, horizontal | list/listitem roles; numbering updates | list "Sources" with listitems; renumber on move; explicit index wins; role released outside the list; axe 0 violations | fixture q7 + verbose snapshot + axe (light/dark, preview open) | passed | — |
| V-10 | C-11; customization | partPresentation and dictionary override on parts | hooks apply; behavior intact | `partPresentation` hooks applied to parts; behavior intact | DevTools MCP (earlier session evidence) | passed | — |
| V-11 | C-13; docs/regression | `npm test`, lint, build, storybook build; read docs | pass; docs standalone | vitest 222 files / 2005 passed, 3 skipped; lint 0; build + CEM; storybook build; docs standalone | commands; `dist/custom-elements.json` | passed | — |
| V-12 | C-14, C-17; visual | rest, hover, focus in light/dark; numbered marker spacing | border-only chip, muted text, no fill; stronger border + foreground on hover; 2px marker gap | outline chips with muted text at rest; hover border `--tp-muted-foreground`, text `--tp-foreground`, fill layer `content: none`; marker gap 2px | DevTools real hover/Tab; screenshots | passed | — |
| V-13 | C-15; behavior/visual | labelled site link hover and focus, LTR and RTL; `target="_self"`; fragment; number-only | mark over label end with fade; width unchanged; `_blank` default; explicit target respected | widths unchanged (LTR 228.96, RTL 114.48); mask slides; `_blank` + "(opens in a new tab)"; `_self` drops it; no mark on number-only/fragment | DevTools + fixture `verifyCitations` 36/36 | passed | — |
| V-14 | C-16; behavior/a11y | Tab to marker 1, Enter; click; hover marker | focus on list entry; no entry preview; marker preview names grid.example | entry 1 focused with ring; preview closed; marker preview shows grid.example, title, description | DevTools; `marker-jump-keyboard.png`, `marker-preview-hover.png` | passed | — |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Citation composes `tp-badge` (render delegate) and `tp-preview-card` (`registerTrigger`); URL policy, `ImageLoadController`, locale and slot helpers, `OwnedAttributes` reused; Badge focus and Preview card text-align repaired at the owner and rechecked in their stories |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | (Reopened after user review) Chip = Badge outline role pair with no fill, muted text, external mark over the label end; earlier: Chip = Badge secondary role pair; preview = Preview card surface with popover/muted foreground roles; count chip tint reuses the Tooltip Key hint palette (page-background tint replaced after user review) |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | `superscript` independent of link/inert and preview; variants independent of number/label/mark (C-03, C-04, C-08; V-04, V-07) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live spec read via direct MCP; no in-repo citation reference (explorer sweep of all external folders); user decisions recorded; spec v0.22.0 adds the contract. |
| 1. Capability mapping                 | passed  | C-01…C-13 mapped to q1–q8, parts and docs with V-IDs; S-1 resolved by spec commit. |
| 2. Architecture and composition reuse | passed  | Badge, Preview card, Icon, URL policy, image loader, locale and slot helpers reused; one repair (Badge focus rule) identified; no parallel owners. |
| 3. Behavior | passed | Fixture `verifyCitations` 22/22 on source and `?package` dist; real hover, Tab and Enter in Chrome. |
| 4. Presentation and customization | passed | Public parts in CEM; `partPresentation` override; tokens only (index color fixed to variant-derived tint). |
| 5. Accessibility | passed | Verbose a11y tree (links, note, list/listitems); keyboard focus rings and preview; axe 0 violations light/dark incl. open preview. No screen-reader run. |
| 6. Visual and interaction inspection | passed | Light/dark, RTL, 375px (component-only; see global body min-width gap), variants matrix, preview placement, focus. |
| 7. Documentation and demo reuse | passed | Default story first with control args; docs examples render real components; docs standalone; Default spacing fixed. |
| 8. Regression and reconciliation | passed | vitest, lint, build (CEM), storybook build; Badge and Preview card stories rechecked; record reconciled. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary (user review 2026-10-14): outline default with muted text and no hover fill; site links open in a new tab with an external-link mark over the label end (no width change); demos show one style each; numbered markers link to and focus their list entry; 2px marker spacing. Original: New `tp-citation` (inline Badge-styled source reference: link or inert note, number, source mark, label, optional Preview card, `superscript`, `source` association) and `tp-citation-list` (numbered footer sources). Owner repairs: Badge focus ring for focusable `[tabindex]` parts; Preview card `text-align: inherit` against the `align` attribute hint. After user review, the leading count chip takes a `currentColor` tint of the Badge variant instead of the page background, and list entry roles moved from ElementInternals to an owned host `role` attribute (library convention; axe-visible).
- Actual delivery claim: CL §22 Citation q1–q8 implemented and verified in Chrome on source and built package; docs, stories, examples, fixture and changeset delivered.
- Record checker: `node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/citation/implementation-checklist.md --stage verify|complete` → "Record permits verify" and "Record permits complete".
- Non-browser checks: `npx vitest run` 222 files, 2005 passed, 3 skipped; `npm run lint` exit 0; `npm run build` exit 0 (CEM lists both elements, parts, slots, attributes); `npm run build-storybook` exit 0.
- Behavior: fixture `verifyCitations` 36/36 (source and `?package`); real hover/Tab/Enter, including marker → list entry focus.
- Accessibility: verbose a11y tree; keyboard focus and delayed preview; axe-core 0 violations light and dark (incl. muted-text contrast), preview closed and open. No assistive-technology run.
- Visual/customization/motion inspection: screenshots in `tmp/component-verification/citation/2026-10-15/` (variants before/after, preview, RTL, 375px, focus, docs).
- Documentation and demo composition reuse: Storybook Docs examples render real `tp-citation`/`tp-citation-list`/`tp-icon`; class descriptions in the manifest carry no spec references.
- Shared-consumer regressions / package boundaries: Badge docs focus ring and passive badges; Preview card Default story alignment; dist register/styles used by the package fixture.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: global `body { min-width: calc(var(--tp-spacing) * 100) }` (400px, `src/styles.css`) overflows a 375px viewport on every page; the `align` attribute text-align hint still affects other `align`-reflecting components (Bubble, Message, non-portaled Popover); Badge secondary hover fill is subtle in dark mode.
- Changed source revisions / reopened gates: spec v0.22.1–v0.23.3 after user review; gates 3–8 reopened and rechecked: commands, fixture 36/36 on source and dist, axe, real hover/focus/RTL/dark screenshots, Storybook docs examples.
