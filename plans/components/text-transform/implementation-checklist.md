# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Text transform (`tp-text-transform`, class `TpTextTransform`); catalog kind presentational-primitive; module function `defineTextPreset`.
- Requested work / claim: Complete new component: display-time text transform and formatter with built-in presets (case, identifier case, number, integer, decimal, percent, currency, compact, scientific, unit, bytes, duration), Consumer presets and formatters, and measured start/middle/end truncation by characters or words with a count cap.
- Scope source: User request 2026-10-14 ("We need a component for formatting text. Call it tp-text-transform … Capitalize, lower casing, truncating from left/right/center, formatting money, numbers, decimals, percentage, etc. We offer a set of well known formatters and let the user define their own"); user decisions 2026-10-14: truncation fits the available width with `max-length`, configurable char/word unit (char default); vocabulary `preset`/`format`/`formatter` as in Time; built-ins include identifier cases, bytes and duration (no list); mask excluded (sensitive masking belongs to the backend); Tooltip with the full text by default while truncated.
- In-scope changes and existing gaps: new spec contract (Foundation §12.4 requirement, §18.23 Text transform, CL §22 Text transform, coverage rows, A.1 evidence); `src/foundation/text-transform/`; `src/components/text-transform/`; shared owners `observeLanguage` (observation) and `DescriptionTooltipController` (Time + Text transform); `formatBytes` long display; family; catalog/register/exports; docs, stories, examples, fixture; changeset.
- Repository baseline / unrelated changes: `322dc68` (clean worktree at start).
- Live project / document IDs and revisions: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Foundation `doc_cd3c4721-…`, Component Library `doc_8077bf7c-…`; spec head before `f899c9bb` (v0.24.0); content commit `64b9c4fb` (v0.24.1); release commit `06732c5b` (v0.25.0).
- Owning contracts / dependencies / vocabulary: Foundation §18.23 (`sec-1823-text-transform`, `ttf-*`), §12.4 `req-f-locale-number-formatting`, §12.3 `env-shared-observation`, §12.5 diagnostics, §16.7 Tooltip; CL §22 Text transform (`ucl22-text-transform`, q1–q3, canonical tables); related Time (`sec-1811-time`, `ucl22-time`); managed terms Presentational primitive, Consumer, Part slot.
- Local reference evidence: base-ui `5b495488d` (clean): `packages/utils/src/formatNumber.ts` (`getFormatter` cache), Meter/Progress/Slider `format`/`locale`; ui `63c1308d1` (clean): `truncate` utility (CSS end clipping only), `data-table-demo.tsx` currency cells; tweakpane `Formatter<T>`; maplibre `src/util/graphemes.ts`, `transform_text.ts`. No reference implements measured start/middle truncation.
- Tool readiness: Spec Blocks direct MCP available (used for the amendment); Chrome DevTools MCP registered (to be used for browser gates).
- Browser / server / build under test: Chrome via DevTools MCP; repository Storybook dev server and a Vite server for the fixture (URLs recorded at verification).
- Evidence directory: `tmp/component-verification/text-transform/2026-10-14/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/text-transform/index.html`
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `value` (number, bigint, text; attribute text), default trimmed light-DOM text; content changes re-present | F ttf-input; CL props | Time `#input()` (`time.ts`) | `value` property; `observeSubtree(this, …, {content:true})` | docs/text-transform.md | V-01 | passed | fixture ttf-input (content read, content edit re-presents, value wins); live check value/content swap |
| C-02 | `preset` default `text` (identity) | F ttf-presets, ttf-precedence | — | `preset` attribute; `transformText` | docs/text-transform.md | V-02 | passed | unit identity; fixture presets row |
| C-03 | Case presets uppercase, lowercase, capitalize, sentence; locale case mapping; word starts from word segmentation; first grapheme only | F ttf-case, ttf-presets | maplibre `transform_text.ts`; local `text-split/segment.ts` | `foundation/text-transform/case.ts` | docs/text-transform.md | V-03 | passed | unit tr İSTANBUL/istanbul, straße→STRASSE, combining marks, apostrophes; fixture case row |
| C-04 | Identifier presets camel, pascal, kebab, snake, constant, humanize; split rules | F ttf-case, ttf-presets | ui `part-tool.tsx` title helper | `foundation/text-transform/identifier.ts` | docs/text-transform.md | V-04 | passed | unit identifierWords/identifierCase (backgroundColor, XMLHttpRequest, base64Encode, separators); fixture humanize/kebab |
| C-05 | Numeric presets number, integer, decimal (2), percent (ratio), currency, compact (short), scientific, unit (short) | F ttf-presets, ttf-numeric | base-ui `formatNumber`; local `numberFormatter` | `foundation/text-transform/number.ts` | docs/text-transform.md | V-05 | passed | unit en-US/de-DE/ar-EG outputs incl. 15K, 1.53E4, 42 km/h, 13%/12.5%; Storybook table and locale examples |
| C-06 | `bytes` (binary units) and `duration` (seconds, digital default, `format.style`/`guide`) | F ttf-presets | local `formatBytes`, `formatDuration` | `number.ts` | docs/text-transform.md | V-06 | passed | unit 1.5 KB/1.5 kilobytes, 1:02:05 + spoken long; formatBytes long display unit test |
| C-07 | Numeric input: finite number, bigint, decimal-literal text passed without float conversion | F ttf-input | base-ui NumberField parse | `parseNumericInput` | docs/text-transform.md | V-07 | passed | unit parseNumericInput; fixture 12,345,678,901,234,567,890.25 exact |
| C-08 | Option precedence: preset defaults < `currency`/`unit`/`decimals` < `format`; `format` with `text` selects number; `decimals` sets min and max | F ttf-precedence; CL props | Time `formatAbsolute` precedence | `resolveNumberOptions` | docs/text-transform.md | V-08 | passed | unit decimals/currency/format merge ($1,235); fixture api-fare with JPY |
| C-09 | `formatter(context)` → text or `{ text, accessibleText }`; context value, text, locale, preset, format, `apply()` | F ttf-formatter; CL props | Time `formatter` | `formatter` property; `TextFormatContext` | docs/text-transform.md | V-09 | passed | unit apply()+accessibleText; fixture formatter composes and supplies accessible text |
| C-10 | `defineTextPreset(name, definition)` (formatter or `{ preset, format }`), release function, reserved built-ins, re-present users, undefined preset adopted later | F ttf-consumer-presets; CL q1 | ECL `LocalizationController.setStringLiterals` notify | `presets.ts` registry + `subscribeTextPresets` | docs/text-transform.md | V-10 | passed | unit define/notify/release/reserved/cycle; fixture undefined→defined→released without recreating the host |
| C-11 | Failures: unreadable numeric input / negative bytes or duration → fallback content, invalid, diagnostic; missing/invalid currency or unit → number + diagnostic; rejected format → preset defaults + diagnostic; failing formatter → preset + diagnostic | F ttf-invalid, ttf-numeric, ttf-formatter-failure | Time `format-failed` retry | `transformText` diagnostics → `diagnose(…, {once, defer})` | docs/text-transform.md | V-11 | passed | unit codes missing-currency, invalid-currency, invalid-unit, invalid-format, invalid-decimals, invalid-number, formatter-failed, formatter-result, invalid-locale; fixture fallback slot + data-invalid |
| C-12 | Accessible long form for compact short, unit short/narrow, bytes, digital/short durations | F ttf-accessible | Time `req-f-time-accessible` | `accessibleText` | docs/text-transform.md | V-12 | passed | AX snapshot: "15 thousand", "42 kilometers per hour", "2.4 megabytes", "1 hour, 2 minutes, 5 seconds" |
| C-13 | Value: `data` element with decimal-literal `value` for numeric input; `span` otherwise | F ttf-machine-value; CL anatomy | Time `<time datetime>` | `renderPart('text-transform-value', …, {tag})` | docs/text-transform.md | V-13 | passed | DOM: DATA value=1234.5 for numeric, SPAN for text |
| C-14 | `truncate` none/start/middle/end (logical); `truncateBy` chars/words; grapheme-safe; one ellipsis; whitespace at cut removed | F ttf-truncation | maplibre `toGraphemes`; local `graphemes` | `foundation/text-transform/truncate.ts` | docs/text-transform.md | V-14 | passed | unit units/joinCut; fixture end/start/middle/words incl. RTL (omission on the left) |
| C-15 | `maxLength` count cap; end when truncate none; middle split head takes extra | F ttf-truncation | ui `formatSearchResultDescription` (fixed count) | `cutByCount` | docs/text-transform.md | V-15 | passed | unit countCut; fixture max-length 3 words → "alpha beta gamma…" |
| C-16 | Fit to available inline size, one line; middle balanced by width; words fallback to graphemes; omission alone when nothing fits | F ttf-fit | none (no reference) | `fit.ts` controller + `fitCut` | docs/text-transform.md | V-16 | passed | resize sweep 400→0 px: whole text, balanced middle, "…" alone at 12/0 px; lone-word fallback to chars |
| C-17 | Re-fit on size, fonts, text, locale, truncation props, reconnection; available size independent of the cut; no block-size change or reflow | F ttf-refit; CL q2 | local text-motion `observeResize`/`observeFonts` | sizer + `observeResize` + `observeFonts` | docs/text-transform.md | V-17 | passed | resize sweep + font-size change at fixed width (sizer RO) + text change; following content shift 0; no RO errors; flex and grid tracks shrink |
| C-18 | Description Tooltip only while truncated and `tooltip` (default true); Value focusable then; out of focus order otherwise; focused Value keeps focus | F ttf-description; CL q3 | Time description binding | shared `DescriptionTooltipController` | docs/text-transform.md | V-18 | passed | real hover opens Tooltip; real Tab visits only truncated values; widening a focused value keeps focus (tabindex -1) and closes the Tooltip; tooltip=false removes both |
| C-19 | Complete accessible text once; shortened presentation hidden; no name on Root; no live region | F ttf-a11y | Time / Key hint visually-hidden pattern | `.visually-hidden` + `aria-hidden` cut | docs/text-transform.md | V-19 | passed | AX tree full text once; cut aria-hidden; popup aria-hidden (describes="none"), no aria-describedby; axe 0 violations |
| C-20 | Locale: explicit `locale`, then owner locale; `lang` changes re-present | F ttf-environment | Time `TimeRefreshScheduler` lang observer | shared `observeLanguage` + `resolveLocale` | docs/text-transform.md | V-20 | passed | lang="de-DE" → 1.234,50 €, lang change to fr-FR re-presents; Time shares observeLanguage ("hace 5 minutos") |
| C-21 | Lifecycle: release observers, tooltip registration, preset subscription; reconnection restores and re-presents | F ttf-lifecycle | Time reconnect | `connectedCallback`/`disconnectedCallback` | docs/text-transform.md | V-21 | passed | remove/re-append refits at the new width; observers released (shared registries) |
| C-22 | Read-only `text`, `accessibleText`, `truncated`; `data-truncated` marker; inherited `invalid`/`data-invalid` | CL q1 | Time `text` getter | getters + host attribute | docs/text-transform.md | V-22 | passed | getters and data-truncated verified in fixture |
| C-23 | Presentation: no surface, inherited typography, tabular figures for numeric presets; parts `text-transform`, `text-transform-value`, `text-transform-description`; part overrides | CL q2, public definition tables | Time family | `families/text-transform.ts`; structural styles | docs/text-transform.md | V-23 | passed | screenshots dark 1440 and light 375; ::part(text-transform-value) override applied; tabular-nums only on numeric; host background transparent; bidi isolate |
| C-24 | Docs, stories (Default first), examples, fixture, changeset | Docs policy | — | `docs/text-transform.md`, `src/stories/text-transform.*` | docs/text-transform.md | V-24 | passed | docs/text-transform.md, stories, 7 examples, canonical example, fixture + browser steps, changeset; Storybook dev and static Docs render |
| C-25 | Shared language observation for Time and Text transform | F env-shared-observation, req-f-time-environment, ttf-environment | Time scheduler `#listen` | `observeLanguage` in `foundation/observation.ts` | n/a (internal) | V-20, V-25 | passed | Time scheduler and Text transform both call observeLanguage; scheduler unit test + browser lang refresh |
| C-26 | Shared description Tooltip binding for Time and Text transform | F req-f-time-tooltip, ttf-description | `TpTime#bindTooltip` | `components/shared/description-tooltip.ts` | n/a (internal) | V-18, V-25 | passed | Time and Text transform use DescriptionTooltipController; popup carries time-description / text-transform-description |

Record spec/reference conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Text transform contract and no cached number formatting/segmentation/case requirement existed | Whole component | Add Foundation §12.4 requirement, §18.23 Text transform, CL §22 Text transform, coverage rows, A.1 evidence | Spec commits `64b9c4fb` (v0.24.1) + `06732c5b` (v0.25.0); user requested the component | passed |
| S-2 | `format` names the options record in Time, Slider, Progress, Meter and NumberField | Property naming | `preset` names the transform, `format` stays the options record, `formatter` the function | User decision 2026-10-14; CL props table | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/foundation/text-transform/` (framework-free): `case.ts` (locale case mapping, capitalize, sentence), `identifier.ts` (word splitting, identifier cases), `number.ts` (numeric input, numeric/bytes/duration presets, long forms), `presets.ts` (built-in table, Consumer registry, `transformText`), `truncate.ts` (units, count cut, fit cut), `index.ts`; `src/components/text-transform/`: `text-transform.ts` (element), `fit.ts` (measurement controller), `index.ts`.
- Supported exports / registration / constituent API impact: new exports `TpTextTransform`, `defineTextPreset` and types (root via `components/index.ts` and `foundation/index.ts`); catalog tuple `['Text transform', 'tp-text-transform', 'presentational-primitive']`; `register.ts` defines the tag; `formatBytes` gains an optional long display (existing callers unchanged).
- Public vocabulary / tokens / parts / presentation review: names from CL §22 Text transform; `preset`/`format`/`formatter`/`locale`/`tooltip` match Time; `truncateBy` tokens `chars`/`words` match Text motion `split`; no new tokens.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Locale resolution | videojs `effectiveLocale`/`findNearestLang` | `src/foundation/services.ts` `resolveLocale` | Reuse unchanged | Time, Citation, Slider, Text transform / V-20 |
| Owner locale change observation | videojs `subscribeAmbientLang` (one shared observer) | `src/foundation/time/scheduler.ts` `TimeRefreshScheduler#listen` (private MutationObserver + `languagechange`) | Extract `observeLanguage(document, cb)` into `foundation/observation.ts` as a shared registry; Time scheduler delegates its language half to it | Time, Text transform / V-20, V-25 |
| Cached number formatting | base-ui `getFormatter` (`formatNumber.ts`) | `src/foundation/intl.ts` `numberFormatter` | Reuse unchanged | Citation, Pagination(own), Slider, Text transform / V-05 |
| Byte sizes | none in references | `src/foundation/format-bytes.ts` `formatBytes` | Repair: optional `display: 'long'` for the accessible long form; default output unchanged | Attachment, File upload, Text transform / V-06, V-25 |
| Durations | media-chrome `formatTime`, videojs `formatTimeAsPhrase` | `src/foundation/duration-format.ts` `formatDuration` | Reuse unchanged (digital/long/short/narrow) | Media player, Time, Text transform / V-06 |
| Grapheme and word segmentation | maplibre `toGraphemes` | `src/foundation/text-split/segment.ts` `segmenter`, `graphemes` | Reuse; module comment updated as shared | Text motion, Text transform / V-03, V-14 |
| Content, size and font observation | — | `src/foundation/observation.ts` `observeSubtree`, `observeResize`, `observeFonts` | Reuse unchanged | Text motion, Text transform / V-01, V-17 |
| Description Tooltip binding | — | `src/components/time/time.ts` `#bindTooltip`/`#tooltipReference` | Extract `DescriptionTooltipController` (`components/shared/description-tooltip.ts`); Time migrates; Citation (Preview card) and Navigation panel (rail tooltips) bind different surfaces and stay as they are | Time, Text transform / V-18, V-25 |
| Diagnostics | — | `src/foundation/element.ts` `TpElement.diagnose` | Reuse | Text transform / V-11 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root `text-transform` | ui new-york-v4 / current library theme | `truncate` utility (`overflow:hidden; text-overflow:ellipsis; white-space:nowrap`) on inline labels | Time host structure (`display:inline`, inherited font/color) | No surface; inline by default; while fitting `inline-block`, `max-inline-size:100%`, `min-inline-size:0`, inherited typography; measured cut replaces CSS clipping so start/middle work | V-23, V-17 |
| Value `text-transform-value` | ui data-table numeric cells (`tabular-nums` via chart tooltip `font-mono tabular-nums`) | `data-table-demo.tsx` currency cell | Time `time` structure (`font-variant-numeric: tabular-nums`) | Tabular figures for numeric presets only; focusable while described via base `[part~='focusable']` ring | V-23, V-18 |
| Description `text-transform-description` | ui tooltip | `tooltip.tsx` | `tp-tooltip` family (Tooltip recipe) | Reused Tooltip; popup registered as the description part like `time-description` | V-18 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Component internals | Description tooltip | `tp-tooltip` (`registerTrigger`, `content`) | `elementDependencies` → `[TpTooltip]`; V-18 | none |
| Component internals | Value | native `data` / `span` | V-13 | contract-required native anatomy (CL anatomy Value) |
| Docs numeric example | Data table | `tp-table` | V-24 | none |
| Docs truncation example | Resizable container | `tp-resizable-panel-group` panels | V-24 | none |
| Docs examples | Labels | `tp-label` / native text | V-24 | none |
| Fixture | Host page layout | native containers (flex, grid, table) | V-17 | deliberate layout-context tests |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; behavior | value property vs text content; mutate text content; set/unset value | value wins; content re-presents without recreating the host | content read/edit/value precedence as expected | MCP fixture api.ts | passed | — |
| V-02 | C-02; behavior | no preset; number value | identity text | identity text | vitest | passed | — |
| V-03 | C-03; behavior | case presets incl. `tr` İ/ı, combining marks, emoji, punctuation | locale-correct mapping; first grapheme only | locale-correct mapping; first grapheme only | vitest + MCP fixture | passed | — |
| V-04 | C-04; behavior | `backgroundColor`, `XMLHttpRequest`, `base64Encode`, `user_id`, `some-thing.else` | specified splits per preset | splits as specified | vitest | passed | — |
| V-05 | C-05; behavior | each numeric preset in en-US, de-DE, ar-EG, ja-JP | locale output equals Intl output | en-US, de-DE and ar-EG outputs equal Intl output (ja-JP not run) | vitest + MCP Storybook | passed | — |
| V-06 | C-06; behavior | bytes 0, 1023, 1536, 5e9; durations 65, 3725 digital/long/short | binary units; digital/spoken | binary units and digital/spoken durations | vitest | passed | — |
| V-07 | C-07; behavior | `"12345678901234567890.123"`, bigint, `"1e3"`, `"abc"` | precision preserved; invalid flagged | exact decimal text; unreadable text invalid | vitest + MCP fixture | passed | — |
| V-08 | C-08; behavior | preset currency + currency attr + format override; format alone; decimals | merge order honored | merge order honored | vitest + MCP fixture | passed | — |
| V-09 | C-09; behavior | formatter using `apply` and returning `{text, accessibleText}` | composed output; accessible text used | composed output and accessible text | vitest + MCP fixture | passed | — |
| V-10 | C-10; behavior | define/replace/release preset with mounted users; unknown then defined; built-in name rejected | users re-present; TypeError for reserved | users re-present; reserved names throw | vitest + MCP fixture | passed | — |
| V-11 | C-11; behavior | invalid numeric text, negative bytes, missing currency, invalid unit, bad format, throwing formatter | specified fallbacks; one diagnostic each | one diagnostic per case with fallbacks | vitest + MCP diagnostic collector | passed | — |
| V-12 | C-12; accessibility | compact, unit narrow, bytes, digital duration | AX tree shows long form once | long forms once in the AX tree | MCP take_snapshot | passed | — |
| V-13 | C-13; behavior | numeric vs text presets | `data[value]` vs `span` | data[value] vs span | MCP evaluate | passed | — |
| V-14 | C-14; behavior | start/middle/end × chars/words, emoji/combining text | grapheme-safe cuts, one ellipsis, no edge whitespace | grapheme-safe cuts, one ellipsis, trimmed edges | vitest + MCP fixture | passed | — |
| V-15 | C-15; behavior | max-length 0/1/5/len with each position, truncate none | count rules | count rules hold | vitest + MCP fixture | passed | — |
| V-16 | C-16; behavior / visual | container widths 0, 40, 120, full; words with one long word | max fit; balanced middle; fallback; omission alone | max fit, balanced middle, word fallback, omission alone | MCP evaluate resize sweep | passed | — |
| V-17 | C-17; visual / interaction | real container resize; font load; flex, grid and table cells; following content position | re-fit, no RO loop errors, no block-size change | refits; no RO errors; no shift; font-load event not exercised (no web font in the fixture), font metric change covered by the sizer observer | MCP evaluate + console | passed | — |
| V-18 | C-18; interaction / accessibility | real Tab and hover on truncated vs fitting text; tooltip=false; shrink then grow while focused | tooltip only while truncated; focus kept | tooltip only while truncated; focus kept | MCP press_key/hover + evaluate | passed | — |
| V-19 | C-19; accessibility | truncated values in AX tree; axe run | full text once; cut hidden; no violations | full text once; axe 0 violations (dark and light) | MCP snapshot + axe-core | passed | — |
| V-20 | C-20, C-25; behavior | explicit locale; change ancestor `lang` and `<html lang>` | re-present without recreating host | re-presents in place | MCP fixture | passed | — |
| V-21 | C-21; behavior | disconnect/reconnect, preset redefined while disconnected | observers released; restored on reconnect | released and restored | MCP fixture | passed | — |
| V-22 | C-22; behavior | read getters; marker | values and `data-truncated` match | getters and marker match | MCP fixture | passed | — |
| V-23 | C-23; visual / customization | light/dark, RTL, 375 px, `::part(text-transform-value)` override, tabular figures | no surface; inherited typography; override applies | no surface, inherited typography, override applies, RTL omission on the left | MCP screenshots tmp/component-verification/text-transform/2026-10-14/ | passed | — |
| V-24 | C-24; documentation | Storybook Docs page and examples | base example + API complete; examples render with library components | Docs and examples render with Table and Resizable panel group; static build OK | MCP Storybook :6006 and static :6107; npm run build-storybook | passed | — |
| V-25 | C-25, C-26, C-06; regression | Time stories/tooltip/lang refresh; Attachment/File upload byte text | unchanged behavior | Time tooltip, lang and content refresh pass; description part now registered; Attachment/File upload byte text unchanged by unit test (not browser-checked) | npm test + MCP fixture (Time) | passed | — |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Diff: `TpTime` lost its private MutationObserver (now `observeSubtree(…, {content, attributes:false})`), its tooltip fields/`#bindTooltip` (now `DescriptionTooltipController`), and `TimeRefreshScheduler` its private lang observer (now `observeLanguage`); `TpTextTransform` uses the same three owners plus `numberFormatter`, `formatBytes(…,'long')`, `formatDuration`, `graphemes`/`segmenter`. Browser (fixture :5199): Time `lang="es"` re-render ("hace 5 minutos"), Time content edit re-render, Time tooltip opens and its popup now carries `…-time-description` (repaired: registration on `tp-open-change-complete`; before, the popup was absent at registration time and never got the part); Text transform popup carries `…-text-transform-description`. |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Screenshot (dark, 1440 px): inline text with inherited font/colour, no surface (host background transparent); cut text with `…` on one line like the CSS `truncate` utility; description is the library Tooltip (default recipe, arrow, wraps long names); focus ring from the base `[part~='focusable']` rule with `--tp-radius-sm`; tabular figures only on numeric presets. |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | `tooltip=false` keeps the cut and removes Tooltip and focus stop; `truncate` start/middle/end and `truncate-by` words each verified; `max-length` with `truncate=none` cuts inline without measurement; `currency`/`decimals`/`format` shortcuts verified; `::part(text-transform-value)` override applied (rgb(220,38,38), underline). |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live spec read and amended (v0.25.0, `06732c5b`); references at base-ui `5b495488d`, ui `63c1308d1`; scope from the user request and decisions. |
| 1. Capability mapping                 | passed  | C-01–C-26 map every CL property, read-only property, rule and failure of §18.23 to implementation, docs and scenarios; S-1, S-2 resolved. |
| 2. Architecture and composition reuse | passed  | Family dependency, presentation source and composition reuse maps complete; shared repairs: `observeLanguage`, `DescriptionTooltipController`, `formatBytes` long display. |
| 3. Behavior                           | passed | Fixture api.ts 39 assertions pass (source and `?package`); 34 foundation unit tests; real resize, content, locale, preset and lifecycle checks. |
| 4. Presentation and customization     | passed | Parts and keys from the family; `::part(text-transform-value)` override; tabular figures only on numeric presets; Tooltip description part registered. |
| 5. Accessibility                      | passed | AX snapshots (full text once, long forms), real Tab/hover/focus-keeping, axe 0 violations dark and light. No screen-reader run. |
| 6. Visual and interaction inspection  | passed | Dark 1440, light 375 (page minimum width 400 is the theme), RTL, flex/grid, resize sweep, tooltip screenshot; Storybook examples inspected. |
| 7. Documentation and demo reuse       | passed | docs/text-transform.md complete API; Default story + Controls; 7 examples composing Table, Resizable panel group; static Docs build renders. |
| 8. Regression and reconciliation      | passed | npm test 224 files pass; npm run lint pass; tsc pass; npm run build pass; build-storybook pass; standalone define registers only tp-text-transform + tp-tooltip; Time regression checked. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: New `tp-text-transform` (presets for case, identifier case, numbers, currency, percent, compact, scientific, unit, bytes, duration; `format`/`formatter`; `defineTextPreset`; measured start/middle/end truncation by chars or words with `max-length`; full-text Tooltip). Shared owners: `observeLanguage` (Time scheduler migrated), `observeSubtree({content, attributes:false})` (Time migrated), `DescriptionTooltipController` (Time migrated; repairs Time's never-registered `time-description` popup part), `formatBytes(…, 'long')`. Spec v0.25.0.
- Actual delivery claim: complete component per Foundation §18.23 and CL §22 Text transform, verified in Chrome only.
- Record checker: implement, verify and complete stages run with `node .agents/skills/tweakpad-component/scripts/check-gates.mjs`.
- Non-browser checks: `npm test` (224 files, 2039 passed), `npm run lint`, `npx tsc -p tsconfig.build.json --noEmit`, `npm run build`, `npm run build-storybook` — all pass.
- Behavior: fixture 39 assertions (source and built package); live resize/content/locale/lifecycle checks.
- Accessibility: AX tree, real keyboard/hover, axe 0 violations; no screen-reader run.
- Visual/customization/motion inspection: screenshots in `tmp/component-verification/text-transform/2026-10-14/` and inline; no motion in this component.
- Documentation and demo composition reuse: Docs page and examples render (dev and static).
- Shared-consumer regressions / package boundaries: Time checked in browser; root exports `TpTextTransform`, `defineTextPreset`, `transformText`, `TEXT_PRESETS`; standalone define OK.
- Required failures or blocked checks: none failing. Not exercised: real web-font `loadingdone` refit (covered indirectly by the sizer observer), ja-JP output, Attachment/File upload in the browser.
- Older out-of-scope gaps: each described value (Time and Text transform alike) creates its own Tooltip; with 500 truncated values the first render costs ~2.4 s (~4.5 ms per Tooltip) versus ~0.2 s with `tooltip="false"`; resize refit is ~47 ms (no tooltip) / ~170 ms (with) for 500. Lazy Tooltip mounting would be a shared Tooltip/description improvement. Lit dev mode logs one "change-in-update" warning per class because the fit re-renders after measuring.
- Changed source revisions / reopened gates: fit batching and stable Tooltip content added after the first verification; fixture and resize checks re-run afterwards.
