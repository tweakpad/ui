# Time — proposed spec amendment

**Status: applied** 2026-10-06 as Spec Blocks commit `8d01eebc` (project 0.3.21, parent `cb2a512e`). The text below is the original draft; the committed version renumbers Time to §18.11 (`sec-1811-time`), and its locale requirement covers date-time and relative-time formatting only, because Media player's `mp-duration` already defines duration formatting.

## UI Foundation Specification (`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`)

### Insert into `sec-18-display-feedback-and-viewport-components` at index 10

#### Time  <!-- sec-1810-time-heading -->
Purpose and limits. `Time` resolves one point in time, calendar value, or duration from Consumer input, publishes a valid machine-readable time value, and presents it as relative, calendar-relative, absolute, or duration text that refreshes as the reference time advances. It does not own value storage, clock synchronization, or scheduling of Consumer work.  <!-- p-f-time-purpose -->
- **REQ** Input resolution MUST accept an instant object, a finite epoch number, or text. A number, or text of nine to thirteen digits optionally prefixed with `@`, MUST be read as epoch seconds when its magnitude is below 100000000000 and as epoch milliseconds otherwise.  <!-- req-f-time-input -->
- **REQ** Text resolution MUST try, in order: the time-element value microsyntaxes (year, month, date, yearless date, week, time, local date-and-time, and global date-and-time with `T` or space separators), ISO 8601 and time-element durations, internet message dates, and finally the host best-effort date parser. A best-effort result MUST be marked loose, and strict resolution MUST reject it.  <!-- req-f-time-text-order -->
- **REQ** The resolved value MUST record its kind: instant, local date-time, date, month, year, yearless date, week, time, or duration. A value without a zone offset MUST be treated as a wall-clock value in the resolved time zone and MUST NOT be shifted by the host offset; a date-only value MUST NOT resolve to midnight UTC.  <!-- req-f-time-kind -->
- **REQ** The rendered time host MUST carry a valid time-element datetime value at the resolved precision. Instants MUST serialize as a global date-and-time; other kinds MUST preserve their own precision. A duration with year or month components, which the time-element duration syntax cannot express, MUST omit the machine value.  <!-- req-f-time-machine-value -->
- **REQ** Unresolvable input MUST omit the machine value, present the Consumer fallback content unchanged, expose an invalid state, and report one actionable diagnostic per distinct input.  <!-- req-f-time-invalid -->
| Mode | Presentation |  <!-- tbl-f-time-modes-h -->
|---|---|
| `auto` (default) | relative while the distance from the reference time is below the threshold (default `P30D`); absolute otherwise |  <!-- tbl-f-time-modes-r0 -->
| `relative` | relative at every distance |  <!-- tbl-f-time-modes-r1 -->
| `calendar` | calendar-day phrases near the reference day; absolute otherwise |  <!-- tbl-f-time-modes-r2 -->
| `absolute` | formatted date and time without relation to the reference time |  <!-- tbl-f-time-modes-r3 -->
| `duration` | a duration value, or the elapsed distance between an instant and the reference time |  <!-- tbl-f-time-modes-r4 -->

- **REQ** Relative presentation MUST select one unit from second, minute, hour, day, week, month, and year using boundaries of 60 seconds, 60 minutes, 24 hours, 7 days, 30 days, and 365 days after applying the rounding policy, `floor` by default or `round`. A rounded value that reaches the next boundary MUST promote to the next unit.  <!-- req-f-time-relative-units -->
- **REQ** A distance below the now threshold (default `PT10S`) or below one unit of the configured precision MUST present the localized present-moment form. Tense `past` MUST clamp future values to that form, and tense `future` MUST clamp past values.  <!-- req-f-time-now -->
- **REQ** Relative text MUST come from locale relative-time formatting with the configured numeric policy, `auto` by default so that forms such as yesterday are permitted, and style `long`, `short`, or `narrow`.  <!-- req-f-time-relative-format -->
- **REQ** Date-precision values MUST be compared by calendar days in the resolved time zone rather than elapsed time. Time-only, month, year, yearless-date, and week values MUST use absolute presentation at their own precision in every relative mode.  <!-- req-f-time-precision-kinds -->
- **REQ** Calendar presentation MUST compare calendar days in the resolved time zone and use Consumer-replaceable messages for today, yesterday, tomorrow, the previous six days, and the next six days, each receiving the localized time and weekday. Other days MUST use absolute presentation.  <!-- req-f-time-calendar -->
- **REQ** Absolute presentation MUST resolve in this precedence: Consumer formatter, pattern, explicit date-time format options, then named preset, `datetime` by default. Presets MUST include `time`, `time-seconds`, `date`, `date-medium`, `date-long`, `datetime`, `datetime-long`, `full`, and `iso`, and MUST omit fields finer than the value precision.  <!-- req-f-time-absolute -->
- **REQ** Patterns MUST use Unicode date-field symbols with single-quoted literals and a doubled quote for an apostrophe. Week-year and day-of-year symbols and every unsupported letter MUST produce a diagnostic and render as literal text rather than a silently different value. Named and numeric fields MUST be localized.  <!-- req-f-time-pattern -->
- **REQ** Duration presentation MUST use locale duration formatting with the configured style and fall back to localized unit lists where duration formatting is unavailable.  <!-- req-f-time-duration -->
- **REQ** Locale MUST resolve from an explicit locale and then the owner locale in [12.4](#sec-124-locale-and-form-services). Time zone and hour cycle MUST resolve from explicit values and then locale and host defaults. Owner locale changes MUST re-render without recreating the host.  <!-- req-f-time-environment -->
| Refresh policy | Behavior |  <!-- tbl-f-time-refresh-h -->
|---|---|
| `auto` (default) | refreshes when the displayed text can next change; absolute presentation does not refresh |  <!-- tbl-f-time-refresh-r0 -->
| interval in milliseconds | refreshes at that fixed period, never more often than once per second |  <!-- tbl-f-time-refresh-r1 -->
| `none` | never refreshes automatically |  <!-- tbl-f-time-refresh-r2 -->

- **REQ** All instances in one owner environment MUST share one scheduling unit built on [12.2](#sec-122-scheduling-and-cleanup). Each refresh MUST recompute the next delay from the current reference time so delay does not accumulate. Scheduling MUST stop while the owner document is hidden and MUST refresh every registered instance when it becomes visible. An explicit reference time MUST disable automatic refresh.  <!-- req-f-time-scheduler -->
- **REQ** A refresh MUST replace text only when it changes and then publish one update notification carrying the previous and next text. Routine updates MUST NOT be announced through a live region.  <!-- req-f-time-update -->
- **REQ** When the visible text uses an abbreviated style, the accessible text MUST contain the long form.  <!-- req-f-time-accessible -->
- **REQ** An enabled description tooltip MUST follow [16.7](#sec-167-tooltip), MUST make the time host keyboard-focusable, and MUST by default show the pattern `dd/MM/yy HH:mm` reduced to the fields within the value precision. A Consumer pattern or formatter MUST be able to replace that text. A disabled tooltip MUST leave the host out of the focus order.  <!-- req-f-time-tooltip -->
- **REQ** (refinement S-02) A description whose text equals the visible text, and the description of a duration or week value, MUST be omitted together with its focus stop.  <!-- req-f-time-tooltip-redundant -->
- **REQ** (refinement) Reconnecting a disconnected Time MUST re-render against the current reference time and resume refresh and description registration.  <!-- req-f-time-reconnect -->
- **REQ** Destruction MUST unregister from the shared scheduler, release the tooltip registration, and remove environment observers.  <!-- req-f-time-teardown -->

### Insert into `sec-124-locale-and-form-services` at index 4

- **REQ** Locale services MUST provide cached date-time, relative-time, and duration formatting for an explicit or owner locale, time zone, and hour cycle.  <!-- req-f-locale-time-formatting -->

### Insert into `audit-foundation-catalog-coverage-map` at index 11

| row |
|---|
| Time | Time | catalog control | direct public control |  <!-- audit-foundation-catalog-coverage-map-time -->

### Insert into `sec-a1-pinned-upstream-baseline` at index 7

Time evidence: the time element and its datetime value microsyntaxes in the HTML living standard, and ECMAScript internationalization date-time, relative-time, and duration formatting. No behavioral component evidence snapshot provides time presentation; relative-time conventions follow common relative-time element and date-library behavior. These sources are implementation evidence, not runtime dependencies.  <!-- time-evidence-baseline -->

## UI Component Library Specification (`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`)

### Insert into `sec-cl-22-presentational` at index 20

#### Time  <!-- ucl22-time-h -->
A time presents one date, time, or duration as relative, calendar, absolute, or duration text over a machine-readable time value, with an optional full date-time description.  <!-- ucl22-time-purpose -->
Behavioral contract: [Time behavior](#sec-1810-time).  <!-- ucl22-time-basis -->
| Element | Responsibility |  <!-- ucl22-time-anatomy-h -->
|---|---|
| `Root` | Owns the resolved value, presentation policy, and refresh registration. |  <!-- ucl22-time-anatomy-r0 -->
| `Value` | Native time element carrying the machine-readable value and the presented text. |  <!-- ucl22-time-anatomy-r1 -->
| `Description` | Optional Tooltip presenting the full date-time. |  <!-- ucl22-time-anatomy-r2 -->

| Property | Values | Default | Meaning |  <!-- ucl22-time-props-h -->
|---|---|---|---|
| `datetime` | instant object, epoch number, or text | fallback content text | Supplies the value. Unresolvable input keeps the fallback content. |  <!-- ucl22-time-props-r0 -->
| `strict` | true; false | false | Rejects best-effort host parsing. |  <!-- ucl22-time-props-r1 -->
| `mode` | `auto`; `relative`; `calendar`; `absolute`; `duration` | `auto` | Selects the presentation. |  <!-- ucl22-time-props-r2 -->
| `threshold` | duration text | `P30D` | Distance at which `auto` switches to absolute presentation. |  <!-- ucl22-time-props-r3 -->
| `preset` | `time`; `time-seconds`; `date`; `date-medium`; `date-long`; `datetime`; `datetime-long`; `full`; `iso` | `datetime` | Selects a named absolute format. |  <!-- ucl22-time-props-r4 -->
| `pattern` | Unicode date-field pattern | none | Custom absolute format; overrides `format` and `preset`. |  <!-- ucl22-time-props-r5 -->
| `format` | date-time format options (property only) | none | Explicit absolute format options; overrides `preset`. |  <!-- ucl22-time-props-r6 -->
| `formatter` | (context) => text (property only) | none | Replaces absolute text. |  <!-- ucl22-time-props-r7 -->
| `relativeStyle` | `long`; `short`; `narrow` | `long` | Selects relative and duration text length. |  <!-- ucl22-time-props-r8 -->
| `numeric` | `auto`; `always` | `auto` | Permits phrases such as yesterday. |  <!-- ucl22-time-props-r9 -->
| `tense` | `auto`; `past`; `future` | `auto` | Clamps relative direction. |  <!-- ucl22-time-props-r10 -->
| `precision` | `second`; `minute`; `hour`; `day`; `week`; `month`; `year` | `second` | Smallest relative unit. |  <!-- ucl22-time-props-r11 -->
| `rounding` | `floor`; `round` | `floor` | Relative rounding policy. |  <!-- ucl22-time-props-r12 -->
| `nowThreshold` | duration text | `PT10S` | Distance presented as the present moment. |  <!-- ucl22-time-props-r13 -->
| `locale` | locale identifier | owner locale | Formatting locale. |  <!-- ucl22-time-props-r14 -->
| `timeZone` | time-zone identifier | host time zone | Zone for instants and calendar-day comparison. |  <!-- ucl22-time-props-r15 -->
| `hourCycle` | `h11`; `h12`; `h23`; `h24` | locale default | Hour presentation. |  <!-- ucl22-time-props-r16 -->
| `updateInterval` | `auto`; `none`; milliseconds | `auto` | Refresh policy. |  <!-- ucl22-time-props-r17 -->
| `now` | instant (property only) | live clock | Fixed reference time; disables automatic refresh. |  <!-- ucl22-time-props-r18 -->
| `messages` | TimeMessages partial dictionary (property only) | {} | Calendar phrases; each entry is optional with an English fallback. |  <!-- ucl22-time-props-r19 -->
| `tooltip` | true; false | true | Enables the Description. |  <!-- ucl22-time-props-r20 -->
| `tooltipPattern` | Unicode date-field pattern | `dd/MM/yy HH:mm` | Description format, reduced to the value precision. |  <!-- ucl22-time-props-r21 -->
| `tooltipFormatter` | (context) => text (property only) | none | Replaces Description text. |  <!-- ucl22-time-props-r22 -->

- **REQ** Time MUST render a native time element as its Value and MUST NOT own value storage or clock synchronization.  <!-- ucl22-time-q1 -->
- **REQ** The `messages` entries `today`, `yesterday`, `tomorrow`, `lastWeekday`, `nextWeekday`, and `week` (refinement S-02) MUST each accept text with `{time}`, `{weekday}`, `{date}`, `{week}`, and `{year}` placeholders or a function of the formatting context, and MUST default to `Today at {time}`, `Yesterday at {time}`, `Tomorrow at {time}`, `Last {weekday} at {time}`, `{weekday} at {time}`, and `Week {week}, {year}`. Developer diagnostics MUST NOT be localized.  <!-- ucl22-time-q2 -->
- **REQ** The Description MUST follow [Tooltip](#ucl19-tooltip), MUST open for hover and keyboard focus, and MUST NOT carry information required to understand the value.  <!-- ucl22-time-q3 -->
| Public part | Foundation part | Part slot | Exposure |  <!-- ucl22-time-public-definition-h -->
|---|---|---|---|
| Root | none (synthesized) | time | synthesized |  <!-- ucl22-time-public-definition-r0 -->
| Value | none (synthesized) | time-value | synthesized |  <!-- ucl22-time-public-definition-r1 -->
| Description | Tooltip.Root | time-description | renamed |  <!-- ucl22-time-public-definition-r2 -->

| Public control | Kind | Variant axes and defaults | Fixed or re-defaulted foundation properties | Surfaced hidden-part properties |  <!-- ucl22-time-definition-summary-h -->
|---|---|---|---|---|
| Time | presentational-primitive | none | none | none |  <!-- ucl22-time-definition-summary-r0 -->

| Public part | Cardinality and containment | Presentation key inventory |  <!-- ucl22-time-public-definition-detail-h -->
|---|---|---|
| Root | exactly one public owner host per control instance | time |  <!-- ucl22-time-public-definition-detail-r0 -->
| Value | exactly one descendant of Root | time-value |  <!-- ucl22-time-public-definition-detail-r1 -->
| Description | zero or one descendant of Root; present while `tooltip` is enabled | time-description |  <!-- ucl22-time-public-definition-detail-r2 -->


### Insert into `ucl22-message-props` at index 2

| row |
|---|
| `timestamp` | Time `datetime` input; empty | empty | Header metadata presented through [Time](#ucl22-time); unresolvable text is shown unchanged. |  <!-- ucl22-message-props-timestamp -->

### Insert into `ucl22-message` at index 8

- **REQ** A Message `timestamp` MUST render through [Time](#ucl22-time) in the Header and MUST NOT format time independently.  <!-- ucl22-message-q4 -->

### Insert into `audit-complete-coverage-map` at index 62

| row |
|---|
| Time | [Time](#ucl22-time) | presentational-primitive | [Time behavior](#sec-1810-time) | included public control |  <!-- audit-cov-time -->

