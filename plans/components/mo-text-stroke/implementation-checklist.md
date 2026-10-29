# Text stroke implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Text stroke, `<tp-mo-text-stroke>`, Motion › Text (`docs/motion/text/text-stroke.mdx`, story `Motion/Text/Text stroke`)
- Requested work / claim: complete component, split out of Text split's former `stroke` reveal token into its own element on the shared Motion › Text base
- Scope source: user, 2026-10-29: "split inside text-effects category as different components instead", then "we should have Motion > Text, so later we can add Motion > Image, Motion > Scroll", then "lets rename tp-text-motion with tp-mo-text-split tp-mo-text-mirror tp-mo-text-stroke"
- In-scope changes and existing gaps: new element, shared `TextRevealElement` base (`src/components/shared/text-reveal.ts`) adopted by Text split, docs page, story, fixture, website section; the Component Library definition is written (§ 21 Motion › Text)
- Repository baseline / unrelated changes: `46ad002` on `development` with the uncommitted text split work of this session; nothing staged or committed
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; read at `2cf5c25f` (0.45.9), definition added and committed as `b50a3c82` (0.45.10), version bump `bc79e887` (0.46.0)
- Owning contracts / dependencies / vocabulary: CL Text split (`tml-*`), Foundation §18.19 (`tm-layout`, `tm-lines`, `tm-scrub`, `tm-driver`), §18.18 reveal coordination
- Local reference evidence: none; the effect has no reference counterpart (original effect, behavior settled with the user in this session)
- Tool readiness: Chrome DevTools MCP and direct Spec Blocks MCP tools available
- Browser / server / build under test: Chrome via DevTools MCP; library Vite server on :5199 (source), Storybook static build, website build against the packed library
- Evidence directory: `tmp/component-verification/mo-text-stroke/2026-10-29/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/mo-text-stroke/index.html` (README steps)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Each piece draws its glyph outline in the text color, fills over the second half, outline fades over the last quarter | user, this session | none | `TpMoTextStroke.afterSplit` + `outlineGlyphs`, `moTextStrokePieceCss` | Usage | V-01 | passed | fixture timing samples |
| C-02 | `split` (words; chars, lines) sets the drawing pieces; chars turn off kerning | Foundation §18.19 | none | `split` property, `:host([split~='chars'])` | Words and characters | V-02 | passed | chars and words cases |
| C-03 | `stagger` (30), `stagger-from` (first) | Foundation §18.18 | none | base properties | Words and characters | V-02 | passed | last piece later than first |
| C-04 | `reveal-repeat` (false) | Foundation §18.18 | none | base | Words and characters | V-02 | passed | docs previews replay |
| C-05 | `reveal-hold` waits; set on revealed text plays backwards | user, this session | none | base hide; hiding rules | Hiding and revealing again | V-03 | passed | outline returns, fill fades, undraws |
| C-06 | Scrubbed by a scrubbing Scroll trigger | Foundation §18.19 `tm-scrub` | none | `tp-mo-text-stroke-fill/outline/draw` keyframes | Usage | V-04 | passed | after specificity fix |
| C-07 | Outlines `aria-hidden`, unselectable, rebuilt after every split and line pass | Foundation §18.19 | none | `outlineGlyphs`, `user-select: none` | Usage | V-01, V-07 | passed | 14/12/5/11 outlines, all aria-hidden |
| C-08 | `--tp-mo-text-stroke-width` (0.03em), `-length` (6em), `-duration`, `-easing` | CL naming | none | `moTextStrokePieceCss` | Outline | V-06 | passed | heavier outline case |
| C-09 | Events and methods as Text split | Foundation §18.19 | none | base | API Reference | V-01 | passed | event log |
| C-10 | Text read once; reduced motion filled at once | Foundation §18.19 | none | splitter `[data-tp-text]` | Usage | V-07 | passed | accessibility tree read; motion scale 0 at rest immediately |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | The Component Library has no Text stroke definition (it was a Text split token) | spec, docs Related | Add the definition, its custom properties and the reverse hide under CL Text split's family | Committed in `b50a3c82`, bumped to 0.46.0 in `bc79e887` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/mo-text-stroke/` (element, piece styles, index); shared base `src/components/shared/text-reveal.ts` and `text-reveal-styles.ts`; presentation family `src/presentation/families/text-stroke.ts`
- Supported exports / registration / constituent API impact: exported from `@tweakpad/ui`, defined by `@tweakpad/ui/register`; Text split loses the token
- Public vocabulary / tokens / parts / presentation review: `--tp-mo-text-stroke-*` custom properties follow the `--tp-<component>-*` convention; duration and easing default to `--tp-duration-slow` and `--tp-easing-enter`

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Splitting, lines, playback, coordination | Text split (`src/components/mo-text-split/text-motion.ts`, former private implementation) | `TextSplitter`, `RevealPlayback`, `RevealMembership`, `StandaloneReveal` | Extracted into `TextRevealElement`; this element supplies split options, effect tokens, piece CSS and hooks | Text split, Text mirror, Text stroke; V-01, text-motion fixture |
| Piece layout styles | Text split piece styles | `moTextSplitPieceCss` | Shared rules moved to `textPieceCss(host)`, keyed by tag and its custom properties | all three; V-01 |
| Glyph outlines | none | new `src/foundation/text-outline.ts`, `src/foundation/svg.ts` | Internal utilities for browser-drawn outlines, reusable by later text effects | Text stroke; V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| host `text-stroke` | none (paints no surface) | Text split presentation | `moTextStrokePresentation` | inherits typography and color | V-01 |
| outline SVG `text-stroke-outline` | none | none | `moTextStrokePieceCss` | stroke `currentcolor`, `-webkit-text-fill-color` fill fade | V-01, V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Docs Hide/Reveal preview | Toggle button | `tp-button` variant outline | defined by the docs preview runtime | none |
| Fixture Hide/Reveal case | Toggle button | `tp-button` | defined in fixture.ts | none |
| Fixture scrub case | Scroll coordinator | `tp-scroll-trigger` scrub | defined in fixture.ts | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-07, C-09; behavior | fixture load | outlines draw then fill; settle filled, outline 0, dash 0 | settled values in every case; events in order | DevTools evaluate `sample()` | passed | Observed values recorded in Actual result |
| V-02 | C-02, C-03, C-04; behavior | chars and words lines cases | per-piece stagger | first piece filled while last still undrawn | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-03 | C-05; behavior | press Hide then Reveal, sample 50 to 1200 ms | reverse order of the reveal | outline 1 at 250 ms, dash 188 to 240 px, fill 0; reveal draws 180 to 0 px then fills | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-04 | C-06; behavior and visual | scroll scrub case to 15/40/70/40 % | outline visible while drawing, both directions | first fix: outline opacity stuck at 0 (`:is()` specificity); after fix 1 while drawing, 0 when filled; screenshot | DevTools evaluate and screenshot | passed | Fixed in `piece-styles.ts`; values recorded in Actual result |
| V-05 | C-01; layout | positions before and after definition | no movement from the element | only the fixture's own Hide button grows | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-06 | C-08; customization | heavier outline case | thicker, slower outline | 2.4 s reveal, 0.05em stroke | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-07 | C-07, C-10; accessibility | accessibility tree, reduced motion | text once; filled at once | aria-hidden on every outline; accessibility tree has each text once, link once; with `--tp-motion-scale: 0` hide and reveal are instant and both events fire | DevTools snapshot (`a11y.txt`) and evaluate | passed | Automated axe analysis not run; screen reader not tested |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `TpMoTextSplit`, `TpMoTextMirror` and `TpMoTextStroke` all extend `TextRevealElement`; splitting, playback, coordination, line passes and observation live only there; piece layout CSS only in `textPieceCss()` |
| I-02 | Default visual regions match traced source and shared library recipes | passed | No surface; inherits typography; Chrome fixture screenshots of rest and mid-animation states |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | stagger, stagger-from, reveal-repeat, reveal-hold and scrub exercised separately in the fixture |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | Scope from the user's messages; live Component Library read at `2cf5c25f` and the definition committed in `b50a3c82` (0.46.0 in `bc79e887`) |
| 1. Capability mapping | passed | Capability rows below; every row maps to a scenario |
| 2. Architecture and composition reuse | passed | Shared base and styles; Text split migrated onto them; no parallel owner |
| 3. Behavior | passed | V-01 to V-05 in Chrome |
| 4. Presentation and customization | passed | V-06 custom properties; inherits typography and color |
| 5. Accessibility | pending | V-07 accessibility tree and reduced motion passed; automated axe analysis not run |
| 6. Visual and interaction inspection | passed | Screenshots of mid-animation and rest states in Chrome |
| 7. Documentation and demo reuse | passed | check-docs (91 pages), static Storybook Docs page and website page read in Chrome: sections, previews, full API, no Related in Storybook |
| 8. Regression and reconciliation | passed | Library tests (6082), lint, typecheck, build, docs checker (91 pages) pass; spec definition matches the implementation |

## Completion / handoff

Pending: automated axe analysis (Gate 5). Evidence is local only, under `tmp/component-verification/`.
