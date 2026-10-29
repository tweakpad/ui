# Text mirror implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Text mirror, `<tp-mo-text-mirror>`, Motion › Text (`docs/motion/text/text-mirror.mdx`, story `Motion/Text/Text mirror`)
- Requested work / claim: complete component, split out of Text split's former `mirror` reveal token into its own element on the shared Motion › Text base
- Scope source: user, 2026-10-29: "split inside text-effects category as different components instead", then "we should have Motion > Text, so later we can add Motion > Image, Motion > Scroll", then "lets rename tp-text-motion with tp-mo-text-split tp-mo-text-mirror tp-mo-text-stroke"
- In-scope changes and existing gaps: new element, shared `TextRevealElement` base (`src/components/shared/text-reveal.ts`) adopted by Text split, docs page, story, fixture, website section; the Component Library spec entry is not written (Spec Blocks unreachable)
- Repository baseline / unrelated changes: `46ad002` on `development` with the uncommitted text split work of this session; nothing staged or committed
- Live project / document IDs and revisions: Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; not read in this run: `spec_whoami` returned "fetch failed" (Spec Blocks dev stack and Caddy down)
- Owning contracts / dependencies / vocabulary: CL Text split (`tml-*`), Foundation §18.19 (`tm-layout`, `tm-lines`, `tm-scrub`, `tm-driver`), §18.18 reveal coordination
- Local reference evidence: none; the effect has no reference counterpart (original effect, behavior settled with the user in this session)
- Tool readiness: Chrome DevTools MCP available; direct Spec Blocks MCP tools registered but the server is unreachable
- Browser / server / build under test: Chrome via DevTools MCP; library Vite server on :5199 (source), Storybook static build, website build against the packed library
- Evidence directory: `tmp/component-verification/mo-text-mirror/2026-10-29/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/mo-text-mirror/index.html` (README steps)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Line reveal from the middle of each line's text, both halves sliding out of the seam; real line in the end window, inert copy in the start | user, this session | none | `TpMoTextMirror.splitOptions` (`mirror: true`), splitter `#twinLines`, `#measure` | Usage | V-01 | passed | fixture: seams per line, slides settle at `none` |
| C-02 | `stagger` (30), `stagger-from` (first) by line | Foundation §18.18 | none | base properties | Stagger | V-02 | passed | per-line delays observed |
| C-03 | `reveal-repeat` (false) | Foundation §18.18 | none | base `StandaloneReveal` | Stagger | V-02 | passed | docs previews replay on re-entry |
| C-04 | `reveal-hold` waits; set on revealed text hides in reverse | user, this session | none | base `updated` → `RevealPlayback.hide` | Hiding and revealing again | V-03 | passed | slides return to ±reach, events fire |
| C-05 | Scrubbed by a scrubbing Scroll trigger | Foundation §18.19 `tm-scrub` | none | `tp-mo-text-mirror-end/start` keyframes, `timedElement` | Usage | V-04 | passed | slides follow scroll both ways |
| C-06 | At rest the real line shows whole; copy hidden | user, this session | none | `data-tp-at-rest` rules | Usage | V-01 | passed | start window hidden at rest |
| C-07 | Seams follow width changes and rewraps without layout shift | Foundation §18.19 `tm-lines` | none | `widthChanged`, line pass | Usage | V-05 | passed | no shift from the element |
| C-08 | `--tp-mo-text-mirror-duration`, `-easing`, `-mask-bleed` | CL naming | none | `textPieceCss('tp-mo-text-mirror')` | API Reference | V-06 | passed | manifest rows |
| C-09 | Events `tp-text-split`, `tp-reveal-change`, `tp-reveal-change-complete`; methods `splitText`, `revert` | Foundation §18.19 | none | base | API Reference | V-01 | passed | event log |
| C-10 | Text read once; copies and pieces hidden; reduced motion at rest | Foundation §18.19 | none | splitter `[data-tp-text]`, inert copies | Usage | V-07 | passed | accessibility tree read; motion scale 0 at rest immediately |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | The Component Library has no Text mirror definition (it was a Text split token) | spec, docs Related | Add the definition, its custom properties and the reverse hide under CL Text split's family | Spec Blocks unreachable in this run | blocked |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/mo-text-mirror/` (element, piece styles, index); shared base `src/components/shared/text-reveal.ts` and `text-reveal-styles.ts`; presentation family `src/presentation/families/text-mirror.ts`
- Supported exports / registration / constituent API impact: exported from `@tweakpad/ui`, defined by `@tweakpad/ui/register`; Text split loses the token
- Public vocabulary / tokens / parts / presentation review: `--tp-mo-text-mirror-*` custom properties follow the `--tp-<component>-*` convention; duration and easing default to `--tp-duration-slow` and `--tp-easing-enter`

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Splitting, lines, playback, coordination | Text split (`src/components/mo-text-split/text-motion.ts`, former private implementation) | `TextSplitter`, `RevealPlayback`, `RevealMembership`, `StandaloneReveal` | Extracted into `TextRevealElement`; this element supplies split options, effect tokens, piece CSS and hooks | Text split, Text mirror, Text stroke; V-01, text-motion fixture |
| Piece layout styles | Text split piece styles | `moTextSplitPieceCss` | Shared rules moved to `textPieceCss(host)`, keyed by tag and its custom properties | all three; V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| host `text-mirror` | none (paints no surface) | Text split presentation | `moTextMirrorPresentation` | inherits typography and color | V-01 |
| line windows and slides | none | Text split mask rules | `moTextMirrorPieceCss` | clip windows sized from measured text | V-01, V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Docs Hide/Reveal preview | Toggle button | `tp-button` variant outline | defined by the docs preview runtime | none |
| Fixture Hide/Reveal case | Toggle button | `tp-button` | defined in fixture.ts | none |
| Fixture scrub case | Scroll coordinator | `tp-scroll-trigger` scrub | defined in fixture.ts | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-06, C-09; behavior | fixture load: centered, start-aligned, RTL cases | seams at middle of text; settle at rest; events | seams 34/0/277 px, slides `none`, `data-tp-at-rest`, change and complete events | DevTools evaluate `sample()` | passed | Observed values recorded in Actual result |
| V-02 | C-02, C-03; behavior | stagger 90 vs 60 cases | later lines start later | observed in hold timing samples | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-03 | C-04; behavior | press Hide, then Reveal | halves slide back in, then out; both events | ±157 px at 100 ms, ±251 px hidden; reveal back to `none` | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-04 | C-05; behavior and visual | scroll scrub case to 10/35/60/35 % | slides follow time both ways | ±141, ±30.5, ±4.9, ±30.5 px; screenshot mid-scrub | DevTools evaluate and screenshot | passed | Observed values recorded in Actual result |
| V-05 | C-07; layout | load and compare positions before definition | no movement from the element | only the fixture's own Hide button grows 8 px | DevTools evaluate | passed | Observed values recorded in Actual result |
| V-06 | C-08; customization | manifest and docs API | three custom properties documented | build manifest rows present | `npm run build` | passed | Observed values recorded in Actual result |
| V-07 | C-10; accessibility | accessibility tree, reduced motion | text once; at rest immediately | Accessibility tree: each text once, links once, outlines and copies absent; with `--tp-motion-scale: 0` hide and reveal are instant and both events fire | DevTools snapshot (`a11y.txt`) and evaluate | passed | Automated axe analysis not run; screen reader not tested |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `TpMoTextSplit`, `TpMoTextMirror` and `TpMoTextStroke` all extend `TextRevealElement`; splitting, playback, coordination, line passes and observation live only there; piece layout CSS only in `textPieceCss()` |
| I-02 | Default visual regions match traced source and shared library recipes | passed | No surface; inherits typography; Chrome fixture screenshots of rest and mid-animation states |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | stagger, stagger-from, reveal-repeat, reveal-hold and scrub exercised separately in the fixture |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | blocked | Scope from the user's messages; live Component Library spec could not be read (Spec Blocks "fetch failed") |
| 1. Capability mapping | passed | Capability rows below; every row maps to a scenario |
| 2. Architecture and composition reuse | passed | Shared base and styles; Text split migrated onto them; no parallel owner |
| 3. Behavior | passed | V-01 to V-05 in Chrome |
| 4. Presentation and customization | passed | V-06 custom properties; inherits typography and color |
| 5. Accessibility | pending | V-07 accessibility tree and reduced motion passed; automated axe analysis not run |
| 6. Visual and interaction inspection | passed | Screenshots of mid-animation and rest states in Chrome |
| 7. Documentation and demo reuse | passed | check-docs (91 pages), static Storybook Docs page and website page read in Chrome: sections, previews, full API, no Related in Storybook |
| 8. Regression and reconciliation | blocked | Library tests, lint, typecheck, build pass; spec entry missing |

## Completion / handoff

Pending: the spec definition (G-01, Spec Blocks unreachable) and automated axe analysis. Evidence is local only, under `tmp/component-verification/`.
