Time renders a native `<time datetime>` for one date, time or duration and presents it as relative ("5 minutes ago", "in 3 days"), calendar ("Yesterday at 16:20"), absolute or duration text. Relative text refreshes on a shared schedule, and a description tooltip shows the full date and time.

```html
<tp-time datetime="2026-10-05T14:30:00Z"></tp-time>
```

Input is resolved best-effort and keeps its precision. A date-only value stays on its calendar day in every time zone; it never becomes midnight UTC. The `<time>` element always carries a valid machine-readable `datetime` at that precision. Time does not store values or synchronize clocks.

## Input

`datetime` accepts a `Date`, an epoch number, text, or a Temporal-like object with `epochMilliseconds` or an ISO `toString()`. When `datetime` is unset, the element's text content is read, so server-rendered text such as `<tp-time>2026-10-05T14:30Z</tp-time>` upgrades in place.

Resolution order:

1. `Date` and objects with `epochMilliseconds`.
2. Numbers, and text of 9–13 digits optionally prefixed with `@`: epoch seconds below `100000000000`, milliseconds otherwise.
3. Time-element microsyntaxes: `2026` (year), `2026-10` (month), `2026-10-05` (date), `--10-05` or `10-05` (yearless), `2026-W40` (week), `14:30[:05[.123]]` (time), `2026-10-05T14:30` or with a space (local date-time), and the same with `Z` or `±HH:MM` (instant).
4. Durations: `PT1H30M`, `P1DT2H`, `P1Y2M`, or `1h 30m`, `3w 2d`.
5. Internet message dates: `Mon, 05 Oct 2026 14:30:00 GMT`.
6. The browser's best-effort parser, marked loose. Set `strict` to reject it.

A local date-time without an offset is a wall-clock value in the resolved time zone. Unresolvable input keeps the authored content, sets `invalid`/`data-invalid`, omits `datetime`, and emits one `tp-diagnostic` per distinct input.

## Presentation

| `mode`           | Presentation                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `auto` (default) | Relative while closer than `threshold` (default `P30D`); absolute otherwise.                                          |
| `relative`       | Relative at every distance.                                                                                           |
| `calendar`       | `messages` phrases for today, yesterday, tomorrow and six days either way; absolute otherwise.                        |
| `absolute`       | Formatted date and time.                                                                                              |
| `duration`       | A duration value, or the elapsed distance between an instant and now as the two largest units ("2 hours, 5 minutes"). |

Relative text uses `Intl.RelativeTimeFormat` with one unit. Boundaries are 60 seconds, 60 minutes, 24 hours, 7 days, 30 days and 365 days. `rounding="floor"` (default) shows "1 hour ago" until two hours have passed; `round` rounds to the nearest count and promotes to the next unit at a boundary. Distances below `now-threshold` (default `PT10S`) or below one `precision` unit read "now". With `numeric="auto"` (default) the locale may say "yesterday" or "last week".

Dates (`2026-10-05`) compare calendar days in the time zone: "today", "in 3 days", "last week". Times, months, years, yearless dates and weeks are always absolute at their own precision.

Absolute text resolves in this order: `formatter`, then `pattern`, then `format`, then `preset`.

| `preset`             | en-US example                      |
| -------------------- | ---------------------------------- |
| `time`               | 2:30 PM                            |
| `time-seconds`       | 2:30:00 PM                         |
| `date`               | 10/5/26                            |
| `date-medium`        | Oct 5, 2026                        |
| `date-long`          | October 5, 2026                    |
| `datetime` (default) | Oct 5, 2026, 2:30 PM               |
| `datetime-long`      | October 5, 2026 at 2:30 PM         |
| `full`               | Monday, October 5, 2026 at 2:30 PM |
| `iso`                | the machine value                  |

Presets drop fields finer than the value: `datetime` on a date-only value shows only the date.

`pattern` uses Unicode date-field symbols, localized through `Intl`: `y`, `yy`, `yyyy`; `M`, `MM`, `MMM`, `MMMM`, `MMMMM` (`L` is equivalent); `d`, `dd`; `E`–`EEE`, `EEEE`, `EEEEE`; `a`; `h`, `hh`, `H`, `HH`, `K`, `k`; `m`, `mm`; `s`, `ss`; `S`–`SSS`; `z`, `zzzz`; `X`–`XXX`, `x`–`xxx`. Quote literal text: `"d MMM 'at' HH:mm"`, with `''` for an apostrophe. Week-year `Y`, day-of-year `D` and other unsupported letters render literally and emit a `tp-diagnostic`. Moment-style `YYYY-MM-DD` is therefore visibly wrong rather than silently giving a different year; write `yyyy-MM-dd`.

## Description

While `tooltip` is enabled (default), Time composes Tooltip. The `<time>` becomes keyboard-focusable and shows `tooltip-pattern` (default `dd/MM/yy HH:mm`, 24-hour) on hover or focus. The default pattern is reduced to the value's precision: `dd/MM/yy` for dates, `HH:mm` for times, `MM/yy` for months. No description or tab stop is added when it would repeat the visible text, or for durations and weeks. `tooltip="false"` removes both. Use `tooltipFormatter` for full control.

## API — `tp-time`

| Property / attribute                 | Type; default                                                        | Behavior                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `datetime`                           | `TimeInput`; text content                                            | Value to present.                                                                                 |
| `strict`                             | boolean; `false`                                                     | Reject best-effort browser parsing.                                                               |
| `mode`                               | `auto \| relative \| calendar \| absolute \| duration`; `auto`       | Presentation. Reflected.                                                                          |
| `threshold`                          | duration text; `P30D`                                                | Distance at which `auto` becomes absolute.                                                        |
| `preset`                             | see above; `datetime`                                                | Named absolute format.                                                                            |
| `pattern`                            | string; `''`                                                         | Unicode date-field pattern; overrides `format` and `preset`.                                      |
| `format`                             | `Intl.DateTimeFormatOptions` (property only)                         | Explicit absolute options; overrides `preset`.                                                    |
| `formatter`                          | `(context: TimeFormatContext) => string` (property only)             | Replaces absolute text.                                                                           |
| `relativeStyle` / `relative-style`   | `long \| short \| narrow`; `long`                                    | Relative and duration length. Abbreviated text keeps a long accessible form.                      |
| `numeric`                            | `auto \| always`; `auto`                                             | Permit "yesterday"-style phrases.                                                                 |
| `tense`                              | `auto \| past \| future`; `auto`                                     | Clamp the other direction to "now".                                                               |
| `precision`                          | `second \| minute \| hour \| day \| week \| month \| year`; `second` | Smallest relative unit.                                                                           |
| `rounding`                           | `floor \| round`; `floor`                                            | Relative rounding.                                                                                |
| `nowThreshold` / `now-threshold`     | duration text; `PT10S`                                               | Distance presented as "now".                                                                      |
| `locale`                             | string; closest `lang`                                               | Formatting locale.                                                                                |
| `timeZone` / `time-zone`             | IANA zone; browser zone                                              | Zone for instants and calendar-day comparison.                                                    |
| `hourCycle` / `hour-cycle`           | `h11 \| h12 \| h23 \| h24`; locale                                   | Hour presentation for presets and `format`.                                                       |
| `updateInterval` / `update-interval` | `auto \| none \|` milliseconds; `auto`                               | `auto` refreshes when the text can next change; a number refreshes at that period (minimum 1000). |
| `now`                                | `TimeInput` (property only)                                          | Fixed reference instant; disables automatic refresh.                                              |
| `messages`                           | `Partial<TimeMessages>` (property only); `{}`                        | Calendar and week phrases (below).                                                                |
| `tooltip`                            | boolean; `true`                                                      | Description and tab stop. `tooltip="false"` disables.                                             |
| `tooltipPattern` / `tooltip-pattern` | string; `dd/MM/yy HH:mm`                                             | Description pattern.                                                                              |
| `tooltipFormatter`                   | `(context: TimeFormatContext) => string` (property only)             | Replaces description text.                                                                        |
| `value` (read only)                  | `ResolvedTime \| null`                                               | Resolved `kind`, `instant`/`wall`, `machine` value and `loose` flag.                              |
| `text` (read only)                   | string                                                               | Presented text.                                                                                   |

`TimeMessages` entries are text with `{time}`, `{weekday}`, `{date}`, `{week}` and `{year}` placeholders, or functions of a `TimeMessageContext`. Defaults: `today` "Today at {time}", `yesterday` "Yesterday at {time}", `tomorrow` "Tomorrow at {time}", `lastWeekday` "Last {weekday} at {time}", `nextWeekday` "{weekday} at {time}", `week` "Week {week}, {year}". Relative words, month and weekday names come from `Intl` and need no messages. Diagnostics stay in English.

```js
const time = document.querySelector('tp-time');
time.mode = 'calendar';
time.messages = { today: 'Hoy a las {time}', yesterday: 'Ayer a las {time}' };
time.formatter = ({ date }) => date.toLocaleDateString('es', { dateStyle: 'medium' });
```

### Events

| Event            | Detail                          | When                                                                         |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `tp-time-update` | `{ text, previousText, value }` | After the presented text changes following the first render. Not cancelable. |
| `tp-diagnostic`  | `{ code, message }`             | Unresolvable input or an unsupported pattern symbol; once per distinct case. |

Updates are never announced through a live region.

## Refresh

All Time elements in a window share one timer. Each element schedules its next refresh for when its text can next change: every second under a minute, at the next minute boundary under an hour, and so on, up to one hour. Absolute presentations do not refresh. The timer stops while the page is hidden and every element refreshes when it becomes visible, after a `languagechange`, or when a `lang` attribute in the document changes. Changes to `lang` inside other shadow roots apply at the next refresh.

## Composition and presentation

Message's `timestamp` renders a Time with defaults; use the Message `header` slot with your own `tp-time` for other options. Use Time inside List item footers, Table cells, Card or Alert text, Preview card content and Tooltip triggers wherever a date is displayed. For strings outside the DOM, such as a Toast description, use the exported `resolveTime` and `formatTime`.

Parts: `time` (Root, the host), `time-value` (the native `<time>`), and `time-description` (the Tooltip content). The value inherits font and color from its context, uses tabular numerals, and does not wrap. Focus uses the shared ring. The description uses Tooltip's presentation. Customize through `partContracts` or `::part(time-value)`. Root exposes `data-presentation` (`relative`, `calendar`, `absolute`, `duration` or `invalid`); the value also exposes `data-kind`.

Exported class: `TpTime`. Exported functions: `resolveTime`, `formatTime`, `formatPattern`, `parseDuration`, `TimeRefreshScheduler`. Exported types: `TimeInput`, `ResolvedTime`, `TimeKind`, `TimeMode`, `TimePreset`, `TimeStyle`, `TimeMessages`, `TimeFormatContext`. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.
