# Component implementation and evidence record — Time

## Delivery and source record

- Component(s) / public identity: Time, `tp-time` (`TpTime`), presentational-primitive; Foundation time engine (`resolveTime`, `formatTime`, `formatPattern`, `parseDuration`, `TimeRefreshScheduler`) and cached locale formatters.
- Requested work / claim: complete new component plus migration of the Message timestamp and current demo compositions to it (user, 2026-10-05: "implement it", then option 2 "implement now against the draft").
- Scope source: user request to create a configurable time/date field over a native `<time datetime>` with relative and absolute presets, custom templates, best-effort parsing, interval refresh, a configurable description defaulting to `dd/MM/yy` 24h, and replacement of internal usage in control compositions; decisions recorded 2026-10-05: tooltip makes the host focusable, calendar phrases through a `messages` dictionary, no zone suffix in the default description.
- In-scope changes and existing gaps: new `src/foundation/time/`, `src/foundation/date-locale.ts`, `src/components/time/`, Message timestamp, stories/docs/fixtures; Calendar formatter caching (shared owner repair). Calendar ignoring ancestor `lang` and carousel's local visibility handling are older out-of-scope gaps.
- Repository baseline / unrelated changes: `development` @ 99fe411, clean at start. Another agent's untracked `plans/components/media-player/` is preserved and untouched.
- Live project / document IDs and revisions: Spec Blocks `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`; Foundation `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`, read through direct MCP tools on 2026-10-05. No Time contract exists. Drafted amendment: `plans/components/time/spec-amendment.md` (not applied; candidate under concurrent player/calendar editing, write rejected as stale).
- Owning contracts / dependencies / vocabulary: draft `sec-1810-time` (Time behavior), `ucl22-time`, `ucl22-message-q4`; existing `sec-124-locale-and-form-services`, `sec-122-scheduling-and-cleanup`, `sec-167-tooltip`, `ucl19-tooltip`, `ucl22-shared` (presentational primitives may adopt focus only through an existing contract), `sec-71-semantic-invariants`.
- Local Base UI / Floating UI / shadcn evidence: `../specification/external/` (not git-checked in this run). Base UI `docs/src/components/ReleaseTimeline/ReleaseTimeline.tsx` (`<time dateTime>` + module `Intl.DateTimeFormat`), `packages/react/src/internals/temporal/*` (format keys; date-only vs `T` parsing), `packages/utils/src/formatNumber.ts` (formatter cache). shadcn `apps/v4/registry/bases/{base,radix}/examples/message-example.tsx:515`, `item-example.tsx`, `examples/base/bubble-tooltip.tsx`, `blocks/sidebar-09`. Tweakpane `packages/core/src/common/binding/ticker/{ticker,interval,manual}.ts`, `common/converter/parser.ts` (`composeParsers`). No relative-time implementation exists upstream.
- Tool readiness: Spec Blocks MCP connected (reads only). Chrome DevTools MCP registered.
- Browser / server / build under test: Storybook dev server from this checkout (source imports).
- Evidence directory: `tmp/component-verification/time/2026-10-05/`
- Durable verification fixtures / served URLs: Storybook `Components/Time` and `Components/Message`; unit tests `src/foundation/time/time.test.ts`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Input: Date, epoch (s < 1e11 else ms), `@digits`, Temporal-like `epochMilliseconds` | draft `req-f-time-input` | Base UI `TemporalAdapterDateFns.date()`; timeago `toDate` | `resolveTime` (`parse.ts`); `datetime` property | docs/time.md Input | V-01, V-20 | passed | vitest 23/23; browser Date/epoch assignment in stories |
| C-02 | Text order: microsyntaxes, durations, internet message date, loose `Date.parse`; `strict` rejects loose | draft `req-f-time-text-order` | Tweakpane `composeParsers` | `resolveTime`, `strict` | docs/time.md Input | V-01 | passed | vitest parser order, strict, loose cases |
| C-03 | Kind recorded; zone-less values are wall clock; dates never UTC midnight | draft `req-f-time-kind` | Base UI temporal adapter date-only rule | `ResolvedTime.kind/wall/instant` | docs/time.md Input | V-01, V-05 | passed | vitest date-only Honolulu/Auckland; docs Due dates `datetime="2026-10-05"` |
| C-04 | Valid `datetime` machine value per precision; Y/M durations omit it | draft `req-f-time-machine-value` | Base UI ReleaseTimeline `dateTime` | `<time datetime>` in `time-value` | docs/time.md intro | V-02 | passed | browser `datetime` attributes for instant/date/month/yearless/week/time/duration observed |
| C-05 | Invalid input: fallback content, `invalid`/`data-invalid`, one diagnostic per input | draft `req-f-time-invalid` | GitHub relative-time fallback | slot fallback, `tp-diagnostic` | docs/time.md Input | V-03 | passed | browser: fallback text, `data-invalid`, no datetime, single `invalid-datetime` diagnostic |
| C-06 | Modes `auto` (default, threshold `P30D`), `relative`, `calendar`, `absolute`, `duration` | draft `tbl-f-time-modes` | GitHub `format`/`threshold` | `mode`, `threshold` | docs/time.md Presentation | V-04, V-06 | passed | vitest + docs example texts |
| C-07 | Relative unit boundaries, floor/round, promotion | draft `req-f-time-relative-units` | date-fns `formatDistanceStrict`; Luxon `toRelative` | `rounding` | docs/time.md Presentation | V-04 | passed | vitest boundaries and promotion |
| C-08 | Now threshold `PT10S`, precision, tense clamp | draft `req-f-time-now` | GitHub `precision`/`tense` | `nowThreshold`, `precision`, `tense` | docs/time.md API | V-04 | passed | vitest precision/tense/now threshold |
| C-09 | `Intl.RelativeTimeFormat` numeric `auto`, style long/short/narrow; long accessible text | draft `req-f-time-relative-format`, `req-f-time-accessible` | GitHub `format-style` | `numeric`, `relativeStyle`, visually hidden long form | docs/time.md API | V-04, V-12 | passed | browser: narrow "3m ago" exposes "3 minutes ago" in a11y tree |
| C-10 | Date precision compares calendar days; coarse kinds absolute | draft `req-f-time-precision-kinds` | date-fns `intlFormatDistance` | `formatTime` date branch | docs/time.md Presentation | V-05 | passed | vitest + docs Due dates today/in 3 days/yesterday |
| C-11 | Calendar phrases via `messages` with English defaults | draft `req-f-time-calendar`, `ucl22-time-q2` | moment `calendar()`; date-fns `formatRelative` | `messages` | docs/time.md API | V-06 | passed | vitest + docs Spanish override "Hoy a las 21:52" |
| C-12 | Absolute precedence formatter > pattern > format > preset (`datetime`); 9 presets reduced to precision | draft `req-f-time-absolute` | Discord styles; shadcn `PPP` | `formatter`, `pattern`, `format`, `preset` | docs/time.md Presentation | V-07 | passed | vitest + docs presets/patterns |
| C-13 | LDML patterns, quoted literals, localized digits, Y/D/unsupported diagnosed literally | draft `req-f-time-pattern` | date-fns `format` tokens | `formatPattern` | docs/time.md Presentation | V-07 | passed | vitest; browser pattern diagnostic for YYYY |
| C-14 | Durations via `Intl.DurationFormat` with list fallback; elapsed duration mode | draft `req-f-time-duration` | media-chrome `formatAsTimePhrase` | `durationFormatter`, `mode="duration"` | docs/time.md Presentation | V-08 | passed | vitest + docs "1 hour, 30 minutes" (native Intl.DurationFormat) |
| C-15 | Locale explicit then owner `lang`; time zone; hour cycle; environment re-render | draft `req-f-time-environment` | `resolveLocale` | `locale`, `timeZone`, `hourCycle` | docs/time.md API | V-09 | passed | browser: html lang es, time-zone Asia/Tokyo, hour-cycle h23 re-rendered same node |
| C-16 | Refresh policy `auto`/interval (min 1000)/`none`; explicit `now` disables | draft `tbl-f-time-refresh` | Tweakpane `IntervalTicker`/`ManualTicker` | `updateInterval`, `now` | docs/time.md Refresh | V-10 | passed | browser: ticks at second boundaries; fixed `now` and absolute do not schedule (code + vitest nextChange) |
| C-17 | One shared scheduler per window; recompute delay; pause hidden; refresh on visible | draft `req-f-time-scheduler` | GitHub `dateObserver` | `TimeRefreshScheduler` | docs/time.md Refresh | V-10, V-11 | passed | vitest hidden/visible single timer; browser live ticks |
| C-18 | Text replaced only on change; `tp-time-update {text, previousText, value}`; no live region | draft `req-f-time-update` | GitHub `relative-time-updated` | `willUpdate` emit | docs/time.md Events | V-10 | passed | browser: one `tp-time-update` per change, no live region |
| C-19 | Description: Tooltip, focusable host, default `dd/MM/yy HH:mm` reduced to precision, pattern/formatter, disabled removes tab stop | draft `req-f-time-tooltip`, `ucl22-time-q3` | shadcn `bubble-tooltip.tsx` | `tooltip`, `tooltipPattern`, `tooltipFormatter`; composed `tp-tooltip` | docs/time.md Description | V-12, V-13 | passed | browser: Tab focus, tooltip "05/10/26 22:46", aria description, Escape, hover; tooltip=false/no tab stop |
| C-20 | Parts `time`, `time-value`, `time-description`; `data-presentation`, `data-kind` | draft `ucl22-time-public-definition` | n/a (Tweakpad parts) | bindings, definition, `registerPart` | docs/time.md Composition | V-14 | passed | browser: ::part(time-value) and partContracts styleHook applied; data-presentation/data-kind present |
| C-21 | Teardown: scheduler, tooltip trigger, observers | draft `req-f-time-teardown` | Tweakpane `dispose()` | `disconnectedCallback` | docs/time.md Refresh | V-15 | passed | browser: removed element does not refresh; reinsertion refreshes and rebinds tooltip (after fix) |
| C-22 | Message `timestamp` renders through Time; unresolvable text unchanged | draft `ucl22-message-q4` | shadcn message-example timestamp span | `TpMessage.timestamp` | docs/message.md | V-16 | passed | browser: Message header "Ada 2 minutes ago" via tp-time; workspace messages |
| C-23 | Cached locale date/relative/duration formatting service | draft `req-f-locale-time-formatting` | Base UI `formatNumber.ts` cache | `date-locale.ts`, `LocaleService.date/relativeTime/duration` | docs/time.md Composition | V-17 | passed | vitest 547/547 incl. calendar; Calendar story captions unchanged |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | No Time contract in Foundation or Component Library; Message has no timestamp clause | Message, catalog coverage maps | Apply `plans/components/time/spec-amendment.md` | User chose option 2 (implement against draft); spec write withheld due to concurrent candidate edits | blocked |
| S-02 | Draft does not yet state that the description is omitted when it equals the visible text, nor the `week` message | C-11, C-19 | Add both to `req-f-time-tooltip` / `ucl22-time-q2` when applying the amendment | Implementation choice to avoid redundant tab stops | pending |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/foundation/time/{parse,format,scheduler}.ts` (renderer-independent behavior), `src/foundation/date-locale.ts` (cached Intl formatters, shared owner), `src/components/time/time.ts` (Lit binding, Tooltip composition, scheduling registration).
- Supported exports / registration / constituent API impact: `TpTime` via `components/primitives.ts`, `register.ts`, `elements.ts`; types via `components/index.ts`; engine via `foundation/index.ts`. Message `timestamp` type widened from string to `TimeInput` (attribute behavior unchanged).
- Public vocabulary / tokens / parts / presentation review: names mirror the draft contract; `locale`/`format` follow slider/progress usage; `messages` follows Calendar `messages`; no new tokens.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | --------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Description surface | shadcn `bubble-tooltip.tsx` composes Tooltip | `src/components/tooltip/tooltip.ts` `TpTooltip.registerTrigger`, pattern in `navigation-panel/parts.ts` | Reuse Tooltip; Time owns only `tabindex` on its `<time>` and registers `time-description` on `popupElement` like Data visualization | `tp-time`; V-12, V-13 |
| Locale formatting cache | Base UI `packages/utils/src/formatNumber.ts` | `src/foundation/number-locale.ts` `numberFormatter`; `LocaleService.date` (uncached) | New `date-locale.ts` beside `number-locale.ts`; `LocaleService.date` repaired to use it; Calendar adapter and month labels migrated | `foundation/calendar.ts`, `components/calendar/calendar.ts`, `tp-time`; V-17, V-18 |
| Scheduling | Tweakpane `IntervalTicker`; GitHub shared observer | `src/foundation/services.ts` `Scheduler` (per-owner timers, no visibility) | Shared per-window `TimeRefreshScheduler` (one timer, visibility/language aware); `Scheduler` unchanged because it has no shared-target model | `tp-time`; V-10, V-11 |
| Locale ownership | — | `services.ts` `resolveLocale` | Reused unchanged | `tp-time`; V-09 |
| Timestamp in Message | shadcn message-example header span | `src/components/message/message.ts` raw `<time part="timestamp">` | Replaced by `<tp-time part="timestamp" exportparts="time-value">` | `tp-message`; V-16 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| Root `time` / Value `time-value` | shadcn bases/base, current library theme | `message-example.tsx:515` `ml-auto font-normal`; `item-example.tsx` `text-sm text-muted-foreground` (context-owned color/size) | Context recipes: `message-header`, `list-item-*` | Time inherits font and color; adds only tabular numerals, `nowrap`, shared focus ring | V-14, V-16 |
| Description `time-description` | shadcn bases/base | `bubble-tooltip.tsx` `TooltipContent` | Tooltip recipe (`tooltip-content`) | Reused unchanged; part registered for overrides | V-12 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| `tp-time` internals | description tooltip | `tp-tooltip` `registerTrigger`, `content` | V-12 | none |
| `tp-time` internals | time value | native `<time>` | V-02 | contract-required native anatomy |
| `tp-message` header | timestamp | `tp-time` | V-16 | none |
| `time.examples.ts` Due dates | list rows | `tp-list-item` footer slot | V-19 | none |
| `time.examples.ts` Message timestamp | message | `tp-message` | V-16 | none |
| `examples.ts` preview card / message fixtures | timestamps | `tp-time`, `tp-message` | V-19 | none |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| -- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-02, C-03; unit | parser cases | kinds, instants, loose/strict as specified | 23 parser/format/scheduler tests pass | `npx vitest run src/foundation/time` | passed | Observed: 23 parser/format/scheduler tests pass (`npx vitest run src/foundation/time`) |
| V-02 | C-04; DOM | instant, date, duration values | `<time datetime>` matches machine value | datetime attributes match machine values for every kind | MCP evaluate on Time Docs | passed | Observed: datetime attributes match machine values for every kind (MCP evaluate on Time Docs) |
| V-03 | C-05; DOM/event | `datetime="sometime yesterday"` | fallback text, `data-invalid`, one diagnostic | fallback "sometime yesterday", data-invalid, no datetime, one diagnostic | MCP evaluate | passed | Observed: fallback "sometime yesterday", data-invalid, no datetime, one diagnostic (MCP evaluate) |
| V-04 | C-06, C-07, C-08, C-09; unit + visual | relative fixtures | expected text per boundary | boundary texts match; docs show "22 seconds ago", "yesterday", "3m ago" | vitest; tmp/component-verification/time/2026-10-05/v19-examples-1.png | passed | Observed: boundary texts match; docs show "22 seconds ago", "yesterday", "3m ago" (vitest; tmp/component-verification/time/2026-10-05/v19-examples-1.png) |
| V-05 | C-03, C-10; unit | date-only in other zones | calendar day preserved | Honolulu and Auckland cases keep calendar day | vitest | passed | Observed: Honolulu and Auckland cases keep calendar day (vitest) |
| V-06 | C-06, C-11; unit + visual | calendar fixtures, Spanish messages | phrases and overrides | "Today at 9:52 PM", "Last Friday at 10:52 PM", "Hoy a las 21:52" | vitest; MCP evaluate | passed | Observed: "Today at 9:52 PM", "Last Friday at 10:52 PM", "Hoy a las 21:52" (vitest; MCP evaluate) |
| V-07 | C-12, C-13; unit + visual | presets/patterns example | localized absolute text; diagnostics | presets and pattern "Mon 5 Oct 2026 at 14:30"; YYYY diagnosed | vitest; tmp/component-verification/time/2026-10-05/v19-examples-1.png | passed | Observed: presets and pattern "Mon 5 Oct 2026 at 14:30"; YYYY diagnosed (vitest; tmp/component-verification/time/2026-10-05/v19-examples-1.png) |
| V-08 | C-14; unit + visual | `PT1H30M`, elapsed | localized durations | "1 hour, 30 minutes"; elapsed "2 hours, 5 minutes" | vitest; MCP | passed | Observed: "1 hour, 30 minutes"; elapsed "2 hours, 5 minutes" (vitest; MCP) |
| V-09 | C-15; browser | change `lang`, `time-zone`, `hour-cycle` | re-render without recreation | es "5 oct 2026, 16:30" then Tokyo "23:30"; same node | MCP evaluate | passed | Observed: es "5 oct 2026, 16:30" then Tokyo "23:30"; same node (MCP evaluate) |
| V-10 | C-16, C-17, C-18; browser | live relative values crossing a minute | text updates, one event per change | 57→58→59 s→"1 minute ago" at +524/+1523/+2524 ms; 4 events | MCP evaluate | passed | Observed: 57→58→59 s→"1 minute ago" at +524/+1523/+2524 ms; 4 events (MCP evaluate) |
| V-11 | C-17; unit | hidden/visible document | timer cleared, refresh on visible | one timer; cleared while hidden; refresh all on visible | vitest fake timers | passed | Browser tab-visibility switch not exercised through MCP; unit evidence only |
| V-12 | C-09, C-19; accessibility | keyboard Tab to value | focus ring, tooltip with `dd/MM/yy HH:mm`, description relationship, Escape closes | Tab focuses value, ring visible, tooltip "05/10/26 22:46" as description, Escape closes keeping focus, hover opens after delay | MCP real keys; tmp/component-verification/time/2026-10-05/v12-focus-tooltip.png | passed | Accessibility-tree evidence; no screen reader run |
| V-13 | C-19; behavior | `tooltip="false"`, description equal to text | no tooltip, no tab stop | tooltip=false, durations, weeks, equal text: no tabindex | MCP evaluate | passed | Observed: tooltip=false, durations, weeks, equal text: no tabindex (MCP evaluate) |
| V-14 | C-20; presentation | `::part(time-value)` and `partContracts` override | style applied | underline via ::part and red via partContracts applied | MCP evaluate | passed | Observed: underline via ::part and red via partContracts applied (MCP evaluate) |
| V-15 | C-21; lifecycle | remove/reinsert element | no timer leak; refresh resumes | detached text frozen, reinsertion "1 minute ago", tooltip by keyboard | MCP evaluate + real Tab | passed | Initially failed (stale on reconnect); fixed in connectedCallback and rerun |
| V-16 | C-22; composition | Message with Date and free text | Time in header; free text unchanged | header "Ada 2 minutes ago" in message-header muted style | MCP; tmp/component-verification/time/2026-10-05/v19-examples-2.png | passed | Observed: header "Ada 2 minutes ago" in message-header muted style (MCP; tmp/component-verification/time/2026-10-05/v19-examples-2.png) |
| V-17 | C-23; unit | locale service, calendar tests | cached formatters, calendar unchanged | 547 tests pass | `npx vitest run` | passed | Observed: 547 tests pass (`npx vitest run`) |
| V-18 | C-23; regression | Calendar story | captions and month labels unchanged | October 2026 grid unchanged; picker label tp-time "Oct 5, 2026", no nested tab stop, focus returns to button | MCP real click/Enter; tmp/component-verification/time/2026-10-05/v18-calendar.png | passed | Observed: October 2026 grid unchanged; picker label tp-time "Oct 5, 2026", no nested tab stop, focus returns to button (MCP real click/Enter; tmp/component-verification/time/2026-10-05/v18-calendar.png) |
| V-19 | C-01, C-10; docs | Storybook Time docs examples | examples render with real components | all docs examples render with real components | MCP; tmp/component-verification/time/2026-10-05/v19-examples-*.png | passed | Observed: all docs examples render with real components (MCP; tmp/component-verification/time/2026-10-05/v19-examples-*.png) |
| V-20 | C-01; theme/RTL | dark theme, `dir="rtl"` | inherits color; logical layout | RTL Arabic flows right-to-left; dark theme inherits color | MCP; tmp/component-verification/time/2026-10-05/v20-rtl-dark.png | passed | Observed: RTL Arabic flows right-to-left; dark theme inherits color (MCP; tmp/component-verification/time/2026-10-05/v20-rtl-dark.png) |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| -- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `dateTimeFormatter` used by `LocaleService.date`, `foundation/calendar.ts` adapter and `components/calendar/calendar.ts` month labels; Message renders `tp-time` (old raw `<time>` removed); demo `toLocaleDateString`/`Intl.DateTimeFormat` label code replaced in workspace and calendar picker. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Message header and list footer inherit context recipes (v19-examples-2.png); description uses Tooltip recipe (v12-focus-tooltip.png). |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Description toggled independently of mode/preset (tooltip=false keeps absolute text); tooltip-pattern independent of pattern (docs Description example). |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | blocked | Live spec read through direct MCP (HEAD 8440bff); no Time contract exists. Amendment drafted in `spec-amendment.md` but not applied (S-01). User authorized implementing against the draft; adoption into the live spec remains required. |
| 1. Capability mapping | passed | C-01–C-23 map every draft requirement, property, event, part and composition to implementation, docs and scenarios; S-02 records two draft refinements. |
| 2. Architecture and composition reuse | passed | Family map names Tooltip, number-locale/LocaleService, Scheduler, resolveLocale and Message owners with consumers; presentation map traces shadcn timestamp spans and bubble tooltip to context recipes and the Tooltip recipe. |
| 3. Behavior | passed | V-01–V-11, V-15 pass; reconnect defect found and fixed. |
| 4. Presentation and customization | passed | V-14 part/partContracts overrides; V-16, V-20 inherited context presentation. |
| 5. Accessibility | passed | Semantic tree and real keyboard (V-12, V-13); axe on Time Docs: no Time violations (only Storybook control contrast and docs landmarks). No screen-reader run. |
| 6. Visual and interaction inspection | passed | Screenshots v12, v18, v19-1/2, v20 inspected in light, dark and RTL. |
| 7. Documentation and demo reuse | passed | docs/time.md, docs/message.md, Time stories/examples; demos migrated to tp-time (list-item, message, preview card, workspace, calendar picker); toast story uses formatTime. |
| 8. Regression and reconciliation | passed | vitest 547/547; lint clean except pre-existing format warning in src/components/field/field.ts (unchanged at HEAD); `npm run build` passes and dist exports TpTime/resolveTime/formatTime/TimeRefreshScheduler; Calendar, Message, workspace inspected. Playwright-based `test:browser`/`test:package` not run per MCP-only rule. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup (built dist import verified).
- [x] Generator handling and changed tests preserve the intended documentation (`tp-time` authored exception; stories test list).

## Completion / handoff

- Change summary: Foundation time engine (parse, format, shared scheduler), cached locale formatters, `tp-time`, Message timestamp migration, demo migrations, docs and stories.
- Actual delivery claim: implementation verified against the drafted amendment; not conformant to the live spec until S-01 is applied.
- Record checker: `--stage implement` and `--stage verify` BLOCKED only by Gate 0 (S-01); not treated as cleared.
- Non-browser checks: vitest 547/547; lint (pre-existing field.ts format warning); `npm run build` passes.
- Behavior: V-01–V-11, V-15 passed.
- Accessibility: tree + real keyboard + axe; no screen reader.
- Visual/customization/motion inspection: passed (no motion of its own; Tooltip motion reused).
- Documentation and demo composition reuse: passed.
- Shared-consumer regressions / package boundaries: Calendar, Message, workspace, built exports passed.
- Required failures or blocked checks: S-01 spec adoption
- Older out-of-scope gaps: Calendar ignores ancestor `lang`; carousel keeps local visibility handling.
- Changed source revisions / reopened gates: pending
