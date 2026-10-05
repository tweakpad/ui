# Calendar reference alignment: contract amendment proposal

Reference: https://ui.shadcn.com/docs/components/base/calendar and local
`external/ui/apps/v4/registry/bases/base/ui/calendar.tsx`, examples/base/calendar-*.
The wrapper uses React DayPicker, not a Base UI Calendar primitive. Tweakpad will
retain its Lit implementation and date-only CalendarAdapter with no new runtime dependency.

## Existing authority to preserve

Foundation `sec-149-calendar-date-grid`, controlled-state §5.2, and Library
`ucl17-calendar`: single/multiple/range selection, adapter-owned identity and
arithmetic, independent selection/navigation bounds, excluded-date range policy,
roving focus, controlled proposals, form support and locale-aware presentation.
Single selection continues to replace the selected date as explicitly required by
the Library contract. It will not adopt DayPicker's optional deselection behavior.

## Proposed amendment to ucl17-calendar

Retain existing public names and compatibility. Correct Header to a synthesized
arrangement over Navigation/Caption, Month grid to the repeated Foundation Grid,
and Day to the Foundation DayButton compatibility exposure. Expose the actual
Foundation Months, Month, Caption, CaptionLabel, Dropdowns, MonthDropdown,
YearDropdown, Weekdays, Weekday, Weeks, Week, WeekNumber and Footer with systematic
calendar-* names; do not add new custom-element identities.

Add the following reference-backed public options:

| Property | Attribute | Default | Meaning |
| --- | --- | --- | --- |
| captionLayout | caption-layout | label | label, dropdown, dropdown-months, dropdown-years; independent month/year selectors |
| fixedWeeks | fixed-weeks | false | Render natural complete weeks, or exactly six weeks |
| showWeekNumber | show-week-number | false | Show a locale-aware week-number column |
| buttonVariant | button-variant | ghost | Reuse the existing Button variants for month navigation |
| renderDay | property only | undefined | Replace day content with a Lit template receiving date identity and observable day state; preserve the library day button, semantics, focus and activation |
| formatters | property only | undefined | Optional month-caption, month-dropdown, year-dropdown, weekday, day and week-number display formatters; never change date identity |
| dayModifiers | property only | undefined | Named date sets/predicates published as day data markers, without overriding built-in state |

Month/year options derive from the calendar adapter and navigation bounds. Without
explicit bounds, dropdown choices cover current year minus 100 through current
year (matching the reference); this choice list does not impose selection bounds.
Adapters remain required for non-Gregorian arithmetic; a locale alone must not
silently switch the calendar system. Week numbering uses locale week-start and
minimal-days rules. Add optional adapter week-number support for non-Gregorian
calendars; unsupported week numbering must produce an actionable diagnostic.

Calendar owns a root-scoped `--tp-calendar-cell-size` initialized from the shared
control-height role. All grid cells and navigation controls use it. The documented
public variable permits larger custom-content cells. Footer is optional slotted
content. Presets and time inputs compose existing Button, Card, Field and Input
components; they do not become Calendar selection modes.

## Proposed Foundation clarification

Complete the dropdown, week-number, custom-content and fixed-week policies above
under `sec-149-calendar-date-grid`, retaining its existing canonical anatomy and
all selection/navigation obligations. Hidden days remain absent from navigation
and selection while reserving grid geometry. Interactive custom day descendants
are unsupported because the day remains a single grid activation target.

## Repairs already justified by current contracts

- Remove duplicate month captions and use compact shared presentation.
- Use existing Button and Icon owners for navigation/day interactions.
- Emit `selection` on day activation; retain input sourceEvent.
- Keep focus coherent when controlled month proposals are rejected.
- Validate intervening excluded dates in programmatic ranges as well as clicks.
- Permit an initially empty multiple selection to grow toward minimum count.
- Document actual APIs and replace generated placeholder documentation with a
  canonical example and distinct reference use cases.

This proposal requests a contract amendment, not permission to weaken existing
requirements. No live specification changes have been made yet.

## Amendment 2 (2026-10-05): user-facing message localization

Status: APPLIED to the live specification (Spec Blocks commit ac0db73d, project
version 0.3.15); live `ucl17-calendar` at 0.3.16 carries the `messages` row
(`CalendarMessages` partial dictionary, property only, default `{}`), confirmed by a
direct-tool re-read on 2026-10-05. Originally approved by the user and implemented
locally while the Spec Blocks server (docs-mcp) was unreachable.

Historical note (superseded): not yet applied to the live specification because the
Spec Blocks server was unreachable; to be applied to Library `ucl17-calendar` (and
referenced from Foundation `sec-149-calendar-date-grid` validity text) once direct
tools reconnected.

Precedent: Carousel `messages` (`CarouselMessages`) — a partial dictionary of strings
or functions with English fallbacks. Developer diagnostics remain unlocalized.

| Property | Attribute | Default | Meaning |
| --- | --- | --- | --- |
| messages | property only | {} | `CalendarMessages`; each entry optional, English fallback |

`CalendarMessages` entries:

- `previous`, `next`: `string | (month, caption) => string`; default `Previous <caption>` / `Next <caption>`. `month` is the target month's first day (adapter ISO), `caption` its locale-formatted name.
- `monthDropdown`, `yearDropdown`: string; defaults `Month`, `Year` (selector accessible names).
- `weekNumberHeader`: string; default `Week number` (column header accessible name).
- `day`: `(day: CalendarDayState) => string`; default the adapter accessible date (`day.label`). Accessible name only; does not alter date identity or visible content.
- `validity`: `(code: CalendarValidityCode) => string`, where code is `value-missing | excluded-date | selection-count | range-excluded-date | range-nights`; defaults are the existing English messages.

`locale` continues to format dates only and never selects a calendar system or translations.
