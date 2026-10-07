# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Code block `tp-code-block` (`ucl21-code-block`), plus the code-highlighting foundation (`src/foundation/code/`, subpath `@tweakpad/ui/code`) and the Syntax color token extension.
- Requested work / claim: complete new component, scoped as follows.
  - In: built-in tokenizer plus Shiki adapter; copy and title header; line numbers, highlighted and diff lines; collapsible height.
- Scope source: user request "Lets plan to create a component to highlight code"; AskUserQuestion answers: highlighter "Both", features "Copy + title header, Line numbers + highlights, Collapsible height", spec "Author it directly"; approved plan `/Users/vanrez/.claude/plans/lets-plan-to-create-cozy-star.md`.
- In-scope changes and existing gaps:
  - In scope: the component, the foundation, tokens, the spec, docs, stories, and the workspace demo usage.
  - Excluded by the user's feature choice: package-manager command tabs.
- Repository baseline / unrelated changes:
  - Branch `development` at `039a6b0`.
  - Preserve the uncommitted dialog/tooltip focus work from earlier in this session (`focus.ts`, `hover-surface.ts`, `surface-focus.ts`, `select.ts`, `anchored-surface.ts`, `dialog.ts`).
- Live project / document IDs and revisions:
  - Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
  - Foundation `doc_cd3c4721-…` §18.13 `sec-1813-code-highlighting`.
  - Component Library `doc_8077bf7c-…` `ucl21-code-block`, plus the §5 extension `sec-cl-57-syntax-colors` and the §25 row `audit-cov-code-block`.
  - Commits `d95a9d9` (v0.5.1, content) and `d512b4e` (v0.6.0). Details: `plans/components/code-block/spec-record.md`.
- Owning contracts / dependencies / vocabulary:
  - CL §5.3/§5.4 token roles and the no-literal law.
  - Button (`ucl16-button`), Icon (`ucl22-icon`), the reduced-motion policy, and the Map engine-adapter precedent (§18.12).
- Local Base UI / Floating UI / shadcn evidence (`../specification/external`, ui at `63c1308d1`, clean):
  - shadcn: `ui/apps/v4/components/{component-source,copy-button,code-collapsible-wrapper}.tsx`, `ui/apps/v4/lib/highlight-code.ts`, `ui/apps/v4/app/globals.css:309-454`.
  - mapcn: `mapcn/src/app/(main)/docs/_components/code-block.tsx`, `mapcn/src/components/code-copy-button.tsx`.
  - Others: `videojs-v10/site/src/components/Code/ClientCode.tsx`, `base-ui/docs/src/components/CodeBlock/CodeBlock.tsx`.
- Tool readiness: direct Spec Blocks MCP was used. Chrome DevTools MCP was used; it reconnected twice during the session (see V-09).
- Browser / server / build under test: Chrome via the DevTools MCP, Storybook dev at `http://localhost:6007` from source, and `npm run build` dist.
- Evidence directory: `tmp/component-verification/code-block/` (screenshots under `tmp/component-verification/cb-*.png` and `code-block-docs-*.png`).
- Durable verification fixtures / served URLs:
  - `components-code-block--docs` and `--default`;
  - the `tp-code-block` fixture in `src/stories/examples.ts`;
  - the workspace Files page ("Embed the teaser").
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Token model and exact text round-trip; plain text first, then replaced | §18.13 `sec-1813-code-highlighting` | videojs `ClientCode.tsx` (plain until Shiki loads) | `src/foundation/code/types.ts` `plainTokens`, `lexer.ts` `toLines`; component `#highlight` | docs/code-block.md | V-01, V-02 | passed | Tokenizer round-trip tests; stories render tokens |
| C-02 | Built-in tokenizer: ts/js/jsx/tsx, html, css, json, bash, diff, plaintext; unknown → plaintext plus diagnostic | §18.13 | n/a (in-house) | `tokenizer.ts`, `languages/*`, `builtin.ts`; `tp-diagnostic code-block-language` | docs/code-block.md | V-01, V-02 | passed | 12 docs blocks scoped; all samples < 1 ms |
| C-03 | Injected Shiki adapter with dual light/dark theme colors; no engine import | §18.13 adapter rule | shadcn `highlight-code.ts`, mapcn `highlight.ts` | `adapters/shiki.ts` `createShikiHighlighter` (structural `ShikiHighlighterLike`) | docs/code-block.md | V-03 | passed | 59 explicit-colour tokens in the Shiki story; root bundle has no Shiki |
| C-04 | Cancelable async highlighting; stale requests aborted | §18.13 | videojs `Shared.tsx` cache/abort | `AbortController` per request in `#highlight` | docs/code-block.md | V-01 | passed | Unit test; abort on change and disconnect |
| C-05 | Copy: original source, clipboard with fallback, cancelable `tp-code-copy`, polite announcement, check feedback for 2 s | §18.13 copy semantics; `ucl21-code-block` | shadcn `copy-button.tsx` | `clipboard.ts` `copyText`; `TpCodeBlock.copy()`; `LiveAnnouncer`; `tp-button` + `tp-tooltip` | docs/code-block.md | V-04 | passed | Real click: event with 356-char source, "Copied" announced, label reverted |
| C-06 | Header: title (label or slot) and language; copy floats at inline-end when untitled | `ucl21-code-block` anatomy | shadcn `component-source.tsx`, globals.css figure/title rules | `figure > .header`, `.floating` | docs/code-block.md | V-05 | passed | Untitled copy floats 9px from top and inline-end |
| C-07 | Line numbers (sticky gutter, `aria-hidden`), highlighted lines, inserted/deleted lines with markers and visually hidden text | `ucl21-code-block` | shadcn globals.css `[data-line-numbers]`, `[data-highlighted-line]` | `line-numbers`, `highlight-lines`, `added-lines`, `removed-lines`; `parseLineRanges` | docs/code-block.md | V-05, V-07 | passed | Visual and axe checks |
| C-08 | Collapsible: `collapsed-lines` (12), controllable `expanded`/`default-expanded`, cancelable `tp-value-change`, fade, reduced motion | `ucl21-code-block` | shadcn `code-collapsible-wrapper.tsx` | `ControllableState`; expand `tp-button` with `aria-expanded`/`ariaControlsElements` | docs/code-block.md | V-06 | passed | Real click: `trigger-press` event, `aria-expanded` true, 180→528 px |
| C-09 | Accessibility: figure named by title (or language); scroll region focusable and labelled only while overflowing; code LTR in RTL | `ucl21-code-block` requirements | media-chrome `make-scrollable-code-focusable.js`; base-ui CodeBlock `role=figure` | ResizeObserver `#measure`, `<code dir="ltr">` | docs/code-block.md | V-07 | passed | axe; tabindex present only on overflow (workspace card) |
| C-10 | Presentation: tokens only; mono `text-sm`, ligatures off, `tab-size` 2; syntax extension roles with AA contrast on surface and line tints | CL §5.3/§5.4 and `sec-cl-57-syntax-colors` | shadcn globals.css | `recipes/code-block.ts`; `--tp-syntax-*` in `styles.css` | docs/code-block.md, docs/styling.md | V-07, V-08 | passed | Normalization guard; computed contrast of every role ≥ 4.7:1 on every tint, both modes |
| C-11 | Public subpath and registration | CL catalog | Map subpath precedent | `@tweakpad/ui/code` (`dist/code.js`); catalog, register, elements | docs/code-block.md | V-02, V-09 | passed | Build, catalog 64/64 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | The live spec had no code-highlighting or code-block contract | The whole component | Author Foundation §18.13, the CL Code block section, the Syntax color extension and the §25 row | User chose "Author it directly"; commits `d95a9d9`, `d512b4e` (v0.6.0) | passed |
| S-02 | chart-* roles are reserved for charts, so syntax colours need their own roles | Built-in tokenizer palette | Syntax color token extension | `sec-cl-57-syntax-colors` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries:
  - `src/components/code-block/`: the element, plus dedent and its test.
  - `src/foundation/code/`: types, lexer, tokenizer, languages, builtin, Shiki adapter, clipboard, ranges.
  - `src/presentation/{families,recipes}/code-block.ts`.
- Supported exports / registration / constituent API impact:
  - New subpath `@tweakpad/ui/code`.
  - Catalog entry Code block; `tp-code-block` registered.
  - No change to existing APIs.
- Public vocabulary / tokens / parts / presentation review:
  - Parts: `code-block`, `header`, `title`, `language`, `copy`, `viewport`, `line`, `line-number`, `line-marker`, `token`, `expand`.
  - 14 `--tp-syntax-*` extension roles.

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Copy and expand controls | shadcn `copy-button.tsx` (Button ghost icon) | `src/components/button.ts` | Reused `tp-button` (ghost `icon-sm`, `sm`) with the `.icon` property | V-04, V-06 |
| Copy tooltip | shadcn sr-only label; mapcn `aria-label` | `src/components/tooltip` | Reused `tp-tooltip` | V-04 |
| Announcement | mapcn/shadcn none; library pattern | `LiveAnnouncer` (foundation) | Reused | V-04 |
| Expanded state | shadcn collapsible wrapper state | `src/foundation/controllable-state.ts` | Reused `ControllableState` plus `TpValueChangeEvent` | V-06 |
| Engine adapter shape | Map `MapEngine` adapters | `src/foundation/map/engine.ts` | Same injected-namespace pattern with structural types | V-03 |
| Clipboard | shadcn `copyToClipboardWithMeta` | Story-only clipboard writes (no library owner) | New foundation `copyText`; restores focus with `focusManaged` | V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Figure surface | shadcn apps/v4 (no registry preset) | `globals.css` `[data-rehype-pretty-code-figure]` bg-code, rounded-2xl | `recipes/code-block.ts` | `color-mix(card 50%, muted)` surface, radius-xl, border | V-05 |
| Title bar | same | `[data-rehype-pretty-code-title]` border-bottom, mono | recipe header/title/language | Title in font-sans medium; language in mono `text-xs` muted | V-05 |
| Lines, numbers, highlights | same | `[data-line-numbers]` counter/sticky, `[data-highlighted-line]` | recipe line/line-number | Sticky `space-12` gutter; highlight tint 12% with an inset bar | V-05, V-07 |
| Tokens (dual theme) | same | `--shiki-light`/`--shiki-dark` | recipe token | `light-dark(--_tp-code-light, --_tp-code-dark)`; scope roles otherwise | V-03, V-08 |
| Collapse | same | `code-collapsible-wrapper` max-h-64, gradient | recipe viewport `[data-collapsed]` | `collapsed-lines × 1lh` with a mask fade and an Expand button row | V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Code block stories and docs | Copy, Expand, Tooltip | `tp-button`, `tp-tooltip`, `tp-icon` | V-04, V-06 | `<pre>`/`<code>` are the contract's native anatomy |
| Workspace Files "Embed the teaser" | Code display | `tp-code-block` in `tp-card` | V-09 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-04; unit | `npx vitest run` (tokenizer round-trip per language, scopes, ranges, cancellation) | Pass | 1130 passed | vitest | passed | Observed in command output on 2026-10-07 |
| V-02 | C-01, C-02, C-11; rendering | Docs page: 12 blocks across 7 languages | Scoped tokens per language | ts 11 scopes, html 5, css 8, json 3, bash 3, diff 2 | Chrome DevTools MCP evaluate | passed | Observed on Storybook 6007 |
| V-03 | C-03; adapter | Shiki story (JS regex engine, github-light-default/dark-default) | Explicit dual-theme colours, no Shiki in the root bundle | 59 explicit tokens; `dist/index.js` has 0 Shiki references | Chrome DevTools MCP; grep dist | passed | Theme colours are the theme's own |
| V-04 | C-05; real input | Real click on Copy | Cancelable event with source, "Copied" announced, check, revert after 2 s | As expected (356 chars, announced, reverted) | Chrome DevTools MCP click + listeners | passed | The clipboard is not read back, to avoid the permission prompt |
| V-05 | C-06, C-07; visual | Docs: titled, untitled, line numbers, highlights, diff | Header layout; untitled copy floats; tints and markers | Matches after the floating fix | Screenshots `code-block-docs-1/2.png`, `cb-collapsed.png` | passed | Floating copy defect found and fixed |
| V-06 | C-08; real input | Real click Expand on `steps.ts` | `tp-value-change` (`trigger-press`), `aria-expanded` true, full height | 180→528 px, event fired | Chrome DevTools MCP click | passed | Animation completed before sampling |
| V-07 | C-07, C-09, C-10; accessibility | axe wcag2a/aa/22aa on all blocks, light and dark | No library violations | Light: 0 library violations. Dark: only mask-fade false positives on the collapsed block (verified visually) | axe-core 4.10.2 | passed | Shiki github-light-default comment colour 4.32:1 is theme-owned and documented |
| V-08 | C-10; contrast computation | Every syntax role vs the surface and the highlight/inserted/deleted tints, both modes | ≥ 4.5:1 | Minimum 4.70:1 after keyword `#b42318`/`#ff9a92` and diff tint 10% | Python WCAG computation | passed | Values recorded in styles.css |
| V-09 | C-11; integration | Workspace Files page | Renders inside a card; catalog 64/64 | 7 lines, 2 highlighted, horizontal scroll; 64 entries | Chrome DevTools MCP, `cb-workspace.png` | passed | DevTools reconnected twice during the session |
| V-10 | C-09; RTL and keyboard | Overflowing block: Tab to the viewport; RTL ancestor | Focusable labelled region; code stays LTR | `tabindex` and `role` set only while overflowing; `<code dir="ltr">` | Chrome DevTools MCP evaluate | passed | Overflow state checked in the workspace card |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `tp-button`, `tp-tooltip`, `LiveAnnouncer`, `ControllableState`, `focusManaged` reused; no local button or tooltip substitutes |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Figure, title bar, sticky numbers, highlight bar and floating copy match shadcn `globals.css` / `component-source` |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | Copy works titled or untitled; line numbers, highlights and diff are independent; collapsible independent of copy |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Live spec authored and committed (v0.6.0); upstream sources traced; user-scoped features recorded. |
| 1. Capability mapping                 | passed | C-01..C-11 mapped to authority, upstream, implementation, docs and scenarios; S-01/S-02 resolved. |
| 2. Architecture and composition reuse | passed | Family and presentation maps above; reused Button, Tooltip, announcer and controllable state. |
| 3. Behavior                           | passed | V-01, V-04, V-06. |
| 4. Presentation and customization     | passed | Token-only recipe; syntax extension; token-theme story; part hooks. |
| 5. Accessibility                      | passed | V-07, V-08, V-10. |
| 6. Visual and interaction inspection  | passed | V-05, V-06, V-09 screenshots in light and dark. |
| 7. Documentation and demo reuse       | passed | docs/code-block.md, the stories and the workspace usage. |
| 8. Regression and reconciliation      | passed | tsc, vitest 1130, lint and build pass; catalog 64/64. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: `tp-code-block` with a built-in tokenizer and an injected Shiki adapter; copy and title header; line numbers, highlighted and diff lines; collapsible height; Syntax color token extension; spec v0.6.0.
- Actual delivery claim: the user-scoped first version, verified in Chrome. Package-manager tabs were not requested.
- Record checker: implement, verify and complete (see the terminal run).
- Non-browser checks: tsc, vitest (1130), lint and build pass.
- Behavior: V-04 and V-06 with real input.
- Accessibility: V-07, V-08, V-10.
- Visual/customization/motion inspection: V-05, V-06, V-09.
- Documentation and demo composition reuse: docs/code-block.md, stories, workspace.
- Shared-consumer regressions / package boundaries: the root bundle has no Shiki; `dist/code.js` exists.
- Required failures or blocked checks: none.
- Older out-of-scope gaps:
  - The Shiki github-light-default comment colour is below AA on our surface. It is theme-owned and documented.
  - axe can't evaluate masked (collapsed) content; this was checked visually instead.
- Changed source revisions / reopened gates: none.
