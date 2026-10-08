# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Text motion, `tp-text-motion` (CL `ucl21-text-motion`, Foundation §18.19 `sec-1819-text-motion`); shared owners in `src/foundation/text-split/`, `reveal-coordination.ts`, `reveal-playback.ts`, `viewport-trigger.ts`
- Requested work / claim: complete component. It splits text into characters, words and lines, with masks and a viewport reveal, recalculates lines responsively, and uses a shared viewport owner with coordination. Binding must not cause any reflow or height change.
- Scope source: user messages of 2026-10-08:
  - "We now need to introduce a new component to do text motion|split …"
  - "we also need to make sure the initialization does not cause any reflow or height changes on the text areas …"
  - Answers: names `tp-text-motion` and `tp-scroll-trigger`; CSS presets plus the driver hook; external libraries never named in docs; the trigger coordinates its descendants; one shared owner.
  - Approved plan: `~/.claude/plans/create-a-new-image-breezy-curry.md`.
- In-scope changes and existing gaps:
  - New: `src/components/text-motion/`, `src/foundation/text-split/` (segment, scripts, lines, scheduler, splitter, styles), `observeFonts`, `whenFontsReady`, `fontsLoaded`, content options for `observeSubtree` plus `discardSubtreeRecords`.
  - Pre-definition rules in `src/styles.css`.
  - Family `presentation/families/text-motion.ts`; registration, elements and catalog.
  - Docs `docs/text-motion.md`, stories, fixture `tests/fixtures/components/text-motion/`.
  - Gaps are listed under Completion.
- Repository baseline / unrelated changes: `9e16b4a` (development), clean at start. The image refactor is recorded in `plans/components/image/implementation-checklist.md`.
- Live project / document IDs and revisions:
  - Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
  - Foundation `doc_cd3c4721-…`, Component Library `doc_8077bf7c-…`.
  - Commits `dc3ac91` (v0.9.0: §18.18, §18.19, CL Text motion and Scroll trigger, managed term Scroll trigger) and `e3c96ec` (v0.9.1: live links, measurement from the original, `splitText()`).
- Owning contracts / dependencies / vocabulary:
  - Foundation §18.19 `tm-*` and §18.18 `vr-*`; `env-shared-observation`, `env-shared-intersection`; §6.4 motion requests; `audit-sec-126` reduced motion.
  - CL `ucl21-text-motion`, `tbl-cl-158-text-motion-reveal`, `audit-cov-text-motion`.
  - Managed terms Scroll trigger (new) and Trigger (amended).
- Local Base UI / Floating UI / shadcn evidence:
  - None of the local external checkouts has a text-splitting equivalent (searched `../specification/external/`, all clean: base-ui `5b495488d`, ui, floating-ui `27629b74`).
  - External references (web): the source of an open-source split-text library (v3.15.0 algorithm: segmentation, deep slice, masks, line detection, responsive re-split) and the documentation of a text animation library (inView once/repeat, stagger from).
- Tool readiness: direct Spec Blocks MCP available; Chrome DevTools MCP available
- Browser / server / build under test: Chrome (MCP), Vite dev server `http://localhost:5191`, Storybook dev `http://localhost:6006`; `npm run build` dist
- Evidence directory: `tmp/component-verification/text-motion/` (resize traces, Lighthouse report)
- Durable verification fixtures / served URLs: `tests/fixtures/components/text-motion/index.html` (`?defer=ms`, `?stress=n`)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `split` tokens chars/words/lines, default words; the finest unit animates | `tm-parts`, `tml-props` | external split-text `type` option | `split` property; `parseSplitUnits`; `#finish` | docs Properties | V-01 | passed | words/chars/lines counts per fixture case |
| C-02 | Words by locale segmentation; spaces stay text; breaks only at existing opportunities (hyphens, dashes, unspaced scripts) | `tm-segmentation` | external `wordDelimiter`, Intl.Segmenter | `segment.ts` `tokenize`, `splitChunk` | Splitting | V-01, V-11 | passed | unit tests and line parity sweeps |
| C-03 | Characters as grapheme clusters | `tm-segmentation` | external `graphemes` | `graphemes()` | Splitting | V-01 | passed | ZWJ family, flags, combining marks |
| C-04 | Joined scripts never split below words; diagnostic | `tm-segmentation` | n/a (external lacks it) | `scripts.ts` `isJoinedScript`; `tp-diagnostic` once per split | Splitting | V-02 | passed | Arabic 4 words, 0 chars, one diagnostic |
| C-05 | Formatting cloned around pieces, once per line | `tm-structure` | external `deepSlice` | `assemble` + picker | Splitting | V-03 | passed | nested strong/em/code across lines |
| C-06 | Links wrap like text: original holds the first fragment; inert continuations forward activation | `tm-structure` (v0.9.1) | n/a | `isLive`, stand-in, `#cloneEntry`, `#picker` | Splitting | V-03, V-12 | passed | continuation click reached the original's listener; tabindex -1 |
| C-07 | Other interactive and replaced elements kept whole as originals | `tm-structure` | n/a | `isAtomic`, placeholders, `#restoreAtomics` | Splitting | V-03 | passed | button kept, measured in place |
| C-08 | Revert restores original nodes; `splitText()` | `tm-structure`, `tml-api` | external `revert()` | `revert()`, `splitText()` | Properties | V-04 | passed | link identity and listeners kept |
| C-09 | Lines measured from the original's layout; RTL/mixed grouping; batched pass | `tm-lines` | external line detection (left-edge) | hidden copy `flatten`/`measure`; `groupLines`; `scheduler.ts` | Splitting, Responsive | V-05, V-06 | passed | 0 parity misses in 1,888 checks |
| C-10 | Recalculation before paint; only when lines can change; stale lines never wrap | `tm-lines`, `tm-layout` | external debounced re-split (200ms) | RO callback, `fits()`, `text-wrap-mode: nowrap` | Responsive | V-06, V-07 | passed | 0 stale in 6,594 1px steps (CJK falls back to always measuring) |
| C-11 | Fonts loading and typography height changes recalculate | `tm-lines` | external `document.fonts` listener | `observeFonts`, `whenFontsReady`, height rule | Responsive | V-08 | passed | font swap 2→3 lines equals original; font-size 22/14/28 equal |
| C-12 | Layout stability: no box size, nowrap lines, kerning off for chars from the first frame, pre-definition rule | `tm-layout`, `vr-layout` | n/a | piece CSS, `:host([split~=chars])`, `styles.css` | Splitting, Limits | V-09, V-10 | passed | 0 layout shifts on late definition; heights equal |
| C-13 | Masks with bleed by clip-path, per axis | `tm-layout` | external masks (overflow clip) | piece CSS `clip-path: inset(...)` | Reveal, Styling | V-13 | passed | line, word and char masks inspected |
| C-14 | Accessibility: pieces hidden; runs exposed once; links named; no generic aria-label | `tm-a11y` | external `aria: auto` (label on container) rejected | hidden runs, `aria-hidden`, link `aria-label` | Accessibility | V-12 | passed | AX tree and Lighthouse 100 |
| C-15 | Reveal effects, stagger, stagger-from, mask travel | `tm-reveal` | text animation stagger/from | piece CSS, `--tp-text-order` | Reveal | V-13, V-14 | passed | timings in trigger log |
| C-16 | Standalone entry, repeat, hold; readiness after fonts | `tm-reveal`, `vr-signals`, `vr-events` | inView once/amount | `StandaloneReveal`, `#ready` | Reveal | V-15 | passed | repeat and hold cases |
| C-17 | Motion role `reveal` with effect/unit/count; external driver gets pieces | `tm-reveal`, CL 15.8 row | §6.4 | `textMotionRoles`, `RevealPlayback` | External animation libraries | V-16 | passed | driver context `{effect, unit: words, count: 5}` |
| C-18 | Recalculation and content changes keep reveal state; `tp-text-split` | `tm-resplit` | external `onSplit` | holder and host content observation, `adopt()` | Responsive, Events | V-04, V-17 | passed | textContent replace, control change in Storybook |
| C-19 | Reduced motion: rest immediately, events fire | `tm-motion-policy` | n/a | `--tp-motion-scale`, `revealsImmediately` | Accessibility | V-18 | passed | `motion-policy="reduce"` |
| C-20 | Performance: shared observers, one batched layout | `tm-edges`, `env-shared-observation` | n/a | shared RO and fonts, scheduler, keep range | Responsive | V-19 | passed | 200 instances; 2 long frames only on grid column changes |
| C-21 | Styling surface: data-tp-piece, index/order vars, custom properties, markers | `tml-api`, `tml-presentation` | n/a | piece CSS, `#finish` | Styling | V-13 | passed | data-tp-piece, --tp-text-index/--tp-text-order and markers inspected in the fixture (MCP) |
| C-22 | Coordinated membership (scroll trigger / image group) | `vr-membership` | n/a | `RevealMembership` | Reveal | V-14 | passed | trigger heading/caption |

### Gaps and conflicts

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | Spec v0.9.0 kept interactive descendants whole, but measurement showed links wrapping differently | `tm-structure`, `tm-a11y` | Links split inside, with inert continuations | Spec commit `e3c96ec` | passed |
| G-02 | `split()` method name clashed with the `split` property | `tml-api` | Renamed to `splitText()` | Spec commit `e3c96ec` | passed |
| G-03 | Word and character splits were exempt from line recalculation, but inline boxes lose kerning against spaces, so their wrapping drifted | `tm-lines` | Lines are always laid out, measured from the original | Spec commit `e3c96ec`; V-05 | passed |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Viewport entry (near, in, out, repeat inset) | external inView | image `#syncVisibility` and group `#observe` (duplicated) | New owner `foundation/viewport-trigger.ts`; image and group migrated | `tp-image`, `tp-image-group`, `tp-scroll-trigger`, `tp-text-motion`; V-15, image V-26 to V-30 |
| Coordination (membership, order, stagger, hold, events) | n/a | `components/image/group-protocol.ts` | Generalized into `foundation/reveal-coordination.ts`; `group-protocol.ts` removed | image group, scroll trigger; V-14 |
| Reveal playback (serial, motion role, completion) | §6.4 `prepareMotion` | `TpImage#reveal` | `foundation/reveal-playback.ts`; image migrated | image, text motion; V-16 |
| Shared observation (size, fonts, content) | n/a | `foundation/observation.ts` | Extended: `observeFonts`, content subtree, `discardSubtreeRecords` | text motion; V-19 |
| Light-tree styles per root | n/a | `foundation/generated-style.ts` | Reused through ref-counted `text-split/styles.ts` | text motion |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root | none (no upstream) | n/a | none; paints no surface, inherits typography | `tml-presentation` | V-01 |
| Line / Word / Char / Mask | none | external split-text inline-block pieces | none | Structural CSS only; no surface | V-13 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Stories: heading, rich text with link | headings and links | native `h2`, `p`, `a`, `em`, `code` | V-12 | Text content to split |
| Scroll trigger and image examples | images, groups | `tp-image`, `tp-image-group`, `tp-scroll-trigger` | V-14 | none |
| Fixture | resizable box, stress grid | native layout | V-06, V-19 | Verification layout only |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-03; behavior | Fixture cases chars/words/lines, emoji | Correct pieces | e.g. emoji 6 words and 21 chars; flags and family whole | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-02 | C-04; behavior | Arabic with `split="chars"` | Words only, one diagnostic | 4 words, 0 chars, one diagnostic per split | MCP evaluate, `textLog` | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-03 | C-05 to C-07; behavior | Nested strong/em/code, link, button across widths | Clones per line, link original, button whole | as expected; 1 continuation at 330px | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-04 | C-08, C-18; lifecycle | revert/splitText, `textContent` replace | Originals restored, new content split | link connected; 5 words after replace | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-05 | C-09; layout parity | 9 probe texts at every 2px from 620 to 150, both directions | Split lines equal the original | 0 of 1,888 parity misses (4,248 run: 0) | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-06 | C-10; responsive | 1px steps both directions, 7 texts | Kept lines equal a fresh split | 0 stale of 6,594 after the CJK fallback | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-07 | C-10; layout shift | Resize sweep, split against reverted | Same shift as the original | 0.0304 against 0.0314 | MCP PerformanceObserver | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-08 | C-11; responsive | Web font swap; font-size change at a fixed width | Lines recalculate | 3 = 3; 22/14/28px equal | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-09 | C-12; layout stability | `?defer=1500` late definition | Flow positions unchanged, 0 shifts | all diffs 0, 0 shifts | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-10 | C-12; heights | Split against reverted heights at 6 widths, 11 texts | Equal | 66 of 66 | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-11 | C-02; unit | vitest text-split | Pass | 9 tests pass | `vitest src/foundation/text-split` | passed | vitest `src/foundation/text-split/text-split.test.ts` |
| V-12 | C-06, C-14; accessibility | AX snapshot, real Tab, Lighthouse | Text once, link named, focus visible on all fragments | as expected; Lighthouse a11y 100 | MCP snapshot, press_key, lighthouse | passed | Screen-reader testing not performed |
| V-13 | C-13, C-15, C-21; visual | Line, word and char masks mid-reveal; descenders | Clip without cutting glyphs | inspected | MCP screenshots | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-14 | C-15, C-22; coordination | Scroll trigger heading, group, caption | Ordered timings | heading 623ms, images 764/885/1004, caption 1175 | MCP event log | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` (scroll trigger case) |
| V-15 | C-16; behavior | repeat and hold cases | Reset on leave, hold until cleared | as expected | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-16 | C-17; motion | External driver claim | Receives pieces and context; completion from playback | `count` 5, complete 296ms | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-17 | C-18; Storybook | Change the `split` control | Re-split of Lit-rendered text | 41 chars | MCP fill | passed | Observed in Chrome DevTools MCP on 2026-10-08 in Storybook Docs `components-text-motion--docs` |
| V-18 | C-19; reduced motion | `motion-policy="reduce"` | Rest immediately | opacity 1, 0s, complete in 13ms | MCP evaluate | passed | OS-level toggle not emulated |
| V-19 | C-20; performance | `?stress=200` resize sweep | No layout thrash; bounded frames | average 36ms per two frames; 2 long frames on column changes | MCP trace `tmp/component-verification/text-motion/resize-trace-2.json` | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `group-protocol.ts` removed; image and group use the Foundation owners (diff) |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | No surface; Storybook docs screenshot |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | split, mask and effect combinations (V-01, V-13) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec v0.9.0/v0.9.1; user scope recorded |
| 1. Capability mapping                 | passed | C-01 to C-22 |
| 2. Architecture and composition reuse | passed | Shared owners mapped and adopted |
| 3. Behavior                           | passed | V-01 to V-06, V-14 to V-17 |
| 4. Presentation and customization     | passed | V-13, C-21 |
| 5. Accessibility                      | passed | V-12, V-18 |
| 6. Visual and interaction inspection  | passed | V-07 to V-10, V-13 |
| 7. Documentation and demo reuse       | passed | `docs/text-motion.md`, stories, examples |
| 8. Regression and reconciliation      | passed | vitest 1326, lint, build, size report, image regression |

## Documentation synchronization

- `docs/text-motion.md` (new), `docs/motion.md` (split boundary and role row), `docs/image.md` (coordination).
- Stories: `src/stories/text-motion.stories.ts`, `text-motion.examples.ts`, catalog example in `examples.ts`.
- External animation libraries are not named in the docs or comments.

## Completion / handoff

- Delivered and verified as recorded above. Evidence is local (`tmp/component-verification/text-motion/`).
- Remaining limits (documented):
  - `::first-line`, `hyphens: auto`, SVG text and vertical writing modes;
  - spacing or weight changes at the same height need `splitText()`;
  - the OS-level reduced-motion toggle was not emulated (the `motion-policy` path is verified);
  - no screen-reader session.
