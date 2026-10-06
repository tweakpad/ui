# Calendar

`tp-calendar` displays one or more month grids and selects a single date, several dates or a date range. Dates are date-only ISO strings (`YYYY-MM-DD`); there are no `Date` objects and no time-zone conversion, so a selected 20th never becomes the 19th. Day and navigation controls are actual Button components; caption selectors are actual Native Select components.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpCalendar } from '@tweakpad/ui';
```

```html
<tp-calendar label="Date" name="date" default-value="2026-06-12"></tp-calendar>
```

Build a date picker by putting a Calendar in a Popover with a Button trigger. Close the Popover after accepting `tp-value-change`. Label the trigger with a Time (`mode="absolute" preset="date-long" tooltip="false"`) and set its `datetime` to the selected value: Time's `preset`, `pattern`, `format`, `locale` and `time-zone` configure the date text, and its content is the placeholder until a date is chosen. Combine a date with a time in application code, using Field-labelled time Inputs.

## Selection

| Property / attribute                                                  | Type                                 | Default         | Behavior                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `selectionMode` / `selection-mode`                                    | `single`, `multiple`, `range`        | `single`        | Single replaces the selected date. Multiple toggles dates. Range starts on the first activation and completes on the second. |
| `value` / `value`                                                     | `CalendarValue`                      | omitted         | Controlled selection. Omitted means uncontrolled.                                                                            |
| `defaultValue` / `default-value`                                      | `CalendarValue`                      | undefined       | Initial and reset selection for an uncontrolled calendar.                                                                    |
| `min`, `max`                                                          | ISO date                             | empty           | Selection bounds. Dates outside them are disabled but still displayed.                                                       |
| `disabledDates`                                                       | `Set<string>` or `(date) => boolean` | undefined       | Disabled dates: displayed, not focusable, not selectable.                                                                    |
| `unavailableDates`                                                    | `Set<string>` or `(date) => boolean` | undefined       | Like disabled dates, with a separate `data-unavailable` marker.                                                              |
| `hiddenDates`                                                         | `Set<string>` or `(date) => boolean` | undefined       | Empty cells that keep the grid geometry.                                                                                     |
| `minimumSelectionCount` / `minimum-selection-count`                   | number                               | `0`             | Multiple mode. Removals below the minimum are rejected; a smaller selection reports a custom validity error.                 |
| `maximumSelectionCount` / `maximum-selection-count`                   | number                               | `Infinity`      | Multiple mode. Further additions are rejected.                                                                               |
| `minimumNights`, `maximumNights` / `minimum-nights`, `maximum-nights` | number                               | `0`, `Infinity` | Range mode length limits, in nights between `from` and `to`.                                                                 |
| `rangeExclusion` / `range-exclusion`                                  | `reject`, `restart`                  | `reject`        | Range completion that would span an excluded date is rejected, or restarts the range at the activated date.                  |

`CalendarValue` is `string` (single), `string[]` (multiple) or `{ from, to? }` (range). As attributes, multiple values are separated by spaces or commas, and a range is written `from/to`:

```html
<tp-calendar selection-mode="multiple" default-value="2026-06-03 2026-06-10"></tp-calendar>
<tp-calendar selection-mode="range" default-value="2026-01-12/2026-02-11"></tp-calendar>
```

A range with only `from` is incomplete; its anchor is both range start and range end. Programmatic and controlled values are validated against the same bounds, exclusions, counts and night limits as activation.

Supply `value` for a controlled lifetime and assign the accepted value synchronously in a `tp-value-change` listener or `onValueChange`. Leaving it unchanged rejects the proposal. Canceling the event rejects it in either mode.

```ts
calendar.value = '2026-06-12';
calendar.addEventListener('tp-value-change', (event) => {
  if (!event.defaultPrevented) calendar.value = event.detail.value;
});
```

## Navigation and layout

| Property / attribute                                                      | Type                                                     | Default    | Behavior                                                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `displayedMonth` / `displayed-month`                                      | ISO date                                                 | omitted    | Controlled first displayed month. Any date in the month is accepted.                                       |
| `defaultDisplayedMonth` / `default-displayed-month`                       | ISO date                                                 | empty      | Initial month. Otherwise the first selected date, then `today`.                                            |
| `visibleMonths` / `visible-months`                                        | positive integer                                         | `1`        | Consecutive months shown side by side; they wrap when space is narrow.                                     |
| `pagedNavigation` / `paged-navigation`                                    | boolean                                                  | `false`    | Previous/next move by `visibleMonths` instead of one month.                                                |
| `navigationStart`, `navigationEnd` / `navigation-start`, `navigation-end` | ISO date                                                 | empty      | Navigation bounds, independent of selection bounds. They also disable out-of-bounds caption choices.       |
| `disabledNavigation` / `disabled-navigation`                              | `disable`, `hide`                                        | `disable`  | Unavailable previous/next controls are disabled or removed.                                                |
| `captionLayout` / `caption-layout`                                        | `label`, `dropdown`, `dropdown-months`, `dropdown-years` | `label`    | Month and year text, or Native Select controls for both, the month only or the year only.                  |
| `showOutsideDays`                                                         | boolean                                                  | `true`     | Show leading and trailing days of adjacent months. Set the property to `false` to leave their cells empty. |
| `fixedWeeks` / `fixed-weeks`                                              | boolean                                                  | `false`    | Always render six weeks instead of the month's natural four to six.                                        |
| `showWeekNumber` / `show-week-number`                                     | boolean                                                  | `false`    | Add a week-number column using the locale's week rules. Requires the adapter's `weekNumber`.               |
| `buttonVariant` / `button-variant`                                        | Button variant                                           | `ghost`    | Variant of the previous and next Buttons.                                                                  |
| `locale` / `locale`                                                       | BCP 47 tag                                               | empty      | Formatting locale. Empty uses the document language, then the browser language.                            |
| `weekStartsOn` / `week-starts-on`                                         | `0`–`6`, or `-1`                                         | `-1`       | First weekday (0 is Sunday). `-1` uses the locale.                                                         |
| `today` / `today`                                                         | ISO date                                                 | local date | The date marked as today.                                                                                  |
| `label` / `label`                                                         | string                                                   | `Date`     | Accessible name of the calendar group.                                                                     |

Without navigation bounds, the year dropdown offers the current year minus 100 through the current year. That list does not restrict selection. With navigation bounds, a month choice is disabled when that month cannot be displayed, and a year choice is disabled when none of its months can be; the displayed year always stays available. Choosing a year keeps the displayed month when it can be shown; if that month of the chosen year is outside the bounds, the change lands on the nearest month of that year that can be shown. Either way it is a normal `tp-displayed-month-change` proposal.

`displayedMonthValue` returns the first displayed month. Navigation emits a cancelable `tp-displayed-month-change` with `{ value, previousValue, sourceEvent }`; a controlled owner assigns `displayedMonth` synchronously to accept it.

## Customization

| Property          | Type                                               | Behavior                                                                                                                                                            |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderDay`       | `(day: CalendarDayState) => unknown`               | Lit content inside the day Button. Return `undefined` for the default number. The Button keeps its accessible date name, focus and activation.                      |
| `formatters`      | `CalendarFormatters`                               | Optional `caption`, `monthDropdown`, `yearDropdown`, `weekday`, `day` and `weekNumber` display functions. They never change date identity.                          |
| `dayModifiers`    | `Record<string, Set<string> \| (date) => boolean>` | Named date sets published as `data-<name>` day markers and `day.modifiers`. Names are lowercase; built-in marker names are ignored.                                 |
| `messages`        | `CalendarMessages`                                 | User-facing control names and validity messages. See [Localization](#localization).                                                                                 |
| `calendarAdapter` | `CalendarAdapter`                                  | Date arithmetic and formatting. Defaults to `gregorianCalendarAdapter`. Supply an adapter for another calendar system; implement `weekNumber` to show week numbers. |

`CalendarDayState` contains `date`, `month`, `label`, `selected`, `today`, `outside`, `disabled`, `unavailable`, `focused`, `rangeStart`, `rangeMiddle`, `rangeEnd` and `modifiers`.

Day content must be passive. The day Button is the only activation and focus target, so custom content cannot add interactive descendants: links, buttons, form controls, library controls, `tabindex` or editable elements, and interactive ARIA roles are unsupported. Such content produces a `calendar-interactive-day-content` diagnostic. Put extra accessible information in `messages.day` instead.

Modifier names must be lowercase (`a-z`, `0-9`, `-`). They cannot reuse a built-in marker: `date`, `hidden`, `selected`, `today`, `outside`, `disabled`, `unavailable`, `focused`, `focus-visible`, `range-start`, `range-middle`, `range-end`, `roving` or `calendar-part`. Such names are ignored with a `calendar-ignored-day-modifier` diagnostic, so `data-date` and the built-in state markers are never replaced.

```ts
const booked = new Set(['2026-01-12', '2026-01-13']);
calendar.disabledDates = booked;
calendar.dayModifiers = { booked };
calendar.renderDay = (day) =>
  day.modifiers.booked ? html`<s>${Number(day.date.slice(8))}</s>` : undefined;
```

The `footer` slot adds content below the months. Empty footers take no space.

### Cell size

`--tp-calendar-cell-size` sets the size of every day, weekday, week-number and navigation cell. It defaults to `--tp-control-height-sm`. Increase it for custom day content, responsively if needed:

```css
tp-calendar.roomy {
  --tp-calendar-cell-size: calc(var(--tp-spacing) * 12);
}
@media (min-width: 48rem) {
  tp-calendar.roomy {
    --tp-calendar-cell-size: calc(var(--tp-spacing) * 14);
  }
}
```

The calendar has no surface fill of its own: the page, Card or Popover around it provides one. Add a border or fill on the host, or style the `calendar` part.

## Localization

`locale` formats captions, weekdays, day numbers and accessible dates through `Intl`; it never changes the calendar system (supply a `calendarAdapter` for that). `label` names the calendar group. Every other user-facing string comes from `messages`, a `CalendarMessages` object whose entries fall back to English. Assign a new object to update it.

| Message            | Type                                     | Default                                    |
| ------------------ | ---------------------------------------- | ------------------------------------------ |
| `previous`, `next` | `string` or `(month, caption) => string` | `Previous <caption>`, `Next <caption>`     |
| `monthDropdown`    | `string`                                 | `Month`                                    |
| `yearDropdown`     | `string`                                 | `Year`                                     |
| `weekNumberHeader` | `string`                                 | `Week number`                              |
| `day`              | `(day: CalendarDayState) => string`      | The adapter's accessible date, `day.label` |
| `validity`         | `(code: CalendarValidityCode) => string` | English messages per code                  |

`month` is the first day of the month the control navigates to, and `caption` its locale-formatted name. `CalendarValidityCode` is `value-missing`, `excluded-date`, `selection-count`, `range-excluded-date` or `range-nights`; the message is reported through `checkValidity()`, `reportValidity()` and Field. Diagnostics from `tp-diagnostic` are developer-facing and stay in English.

```ts
calendar.locale = 'fr';
calendar.label = 'Date de livraison';
calendar.messages = {
  previous: (_month, caption) => `Mois précédent, ${caption}`,
  next: (_month, caption) => `Mois suivant, ${caption}`,
  monthDropdown: 'Mois',
  yearDropdown: 'Année',
  weekNumberHeader: 'Numéro de semaine',
  validity: (code) =>
    code === 'value-missing' ? 'Choisissez une date.' : 'Choisissez une date disponible.',
};
```

Use `day` to announce information that is otherwise only visual, such as a custom modifier:

```ts
calendar.messages = { day: (day) => (day.modifiers.booked ? `${day.label}, booked` : day.label) };
```

## Events and methods

| Event                       | Detail                                                     | Behavior                                                                                                  |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tp-value-change`           | `{ value, previousValue, reason, sourceEvent, cancelled }` | Cancelable. `reason` is `selection` for day activation, `programmatic` for `setValue()` and `form-reset`. |
| `tp-displayed-month-change` | `{ value, previousValue, sourceEvent }`                    | Cancelable. Emitted by previous/next, caption selectors and keyboard movement into another month.         |
| `tp-diagnostic`             | `{ code, message, severity }`                              | Developer diagnostics. See below.                                                                         |

Diagnostic codes:

- `calendar-invalid-configuration` (`error`): invalid bounds or limits, rejected programmatic selections, and switches between controlled and uncontrolled. Invalid bounds or limits disable selection and report a custom validity error.
- `calendar-week-number-unavailable` (`warning`): `showWeekNumber` is set, but the adapter has no `weekNumber(date, weekStartsOn, minimalDays)`. The week-number column is omitted. Selection, keyboard use and form validity are not affected.
- `calendar-ignored-day-modifier` (`warning`): a `dayModifiers` name is invalid or reuses a built-in marker.
- `calendar-interactive-day-content` (`warning`): `renderDay` content contains interactive or focusable descendants.

`onValueChange` and `onDisplayedMonthChange` receive the same events before listeners. `setValue(value, sourceEvent?)` proposes a programmatic selection and returns whether it was committed. `selection` returns a copy of the committed selection.

## Forms and states

`name`, `disabled`, `readOnly` (`readonly`), `required`, `invalid`, `formOwner` (`form`), Field association, `checkValidity()` and `reportValidity()` come from `TpFormElement`. The form value is the single date, one repeated entry per date in multiple mode, or `from` and `to` entries for a range. Reset restores `defaultValue`. Required reports `valueMissing` (message `messages.validity('value-missing')`) with no selection and prevents clearing a non-empty selection. Read-only keeps navigation and focus but rejects selection. Disabled removes the calendar from focus and submission.

## Keyboard

One day is in the tab order: the focused, selected, today or first available date. Arrow keys move by day and week, mirrored horizontally in right-to-left layouts. Home and End move to the start and end of the week, Page Up and Page Down by month, and Shift with Page Up or Page Down by year. Movement skips disabled and hidden dates and reveals other months within the navigation bounds. Enter and Space activate the focused day.

## Parts and markers

All parts accept the common `partContracts` surface (`renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `elementReference`, `content`) and presentation dictionary keys of the same name.

| Part                                                                      | Element                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `calendar`                                                                | Root group. Markers `data-disabled`, `data-readonly`, `data-required`, `data-invalid`. |
| `calendar-months`, `calendar-month`                                       | All displayed months, and each month section.                                          |
| `calendar-header`                                                         | Navigation and caption arrangement of a month.                                         |
| `calendar-previous`, `calendar-next`                                      | Native buttons inside the navigation Buttons.                                          |
| `calendar-caption`, `calendar-caption-label`                              | Month caption and its text.                                                            |
| `calendar-dropdowns`, `calendar-month-dropdown`, `calendar-year-dropdown` | Caption selectors and their native selects.                                            |
| `calendar-month-grid`                                                     | The `grid` of a month.                                                                 |
| `calendar-weekdays`, `calendar-weekday`                                   | Weekday header row and column headers.                                                 |
| `calendar-weeks`, `calendar-week`, `calendar-week-number`                 | Week row group, rows and week-number headers.                                          |
| `calendar-day`                                                            | Native button inside each day Button.                                                  |
| `calendar-footer`                                                         | Footer slot container.                                                                 |

Day buttons carry `data-date`, `data-selected`, `data-today` (with `aria-current="date"`), `data-outside`, `data-disabled`, `data-unavailable`, `data-focused`, `data-range-start`, `data-range-middle`, `data-range-end` and one `data-<name>` per day modifier.
