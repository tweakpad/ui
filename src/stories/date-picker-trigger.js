import { calendarIcon } from '../icons/calendar.js';

/**
 * The shadcn date-picker trigger (base/style-nova `DatePickerSimple`): an outline Button that fills
 * its Field, starts its content, uses the field padding and normal weight, leads with a calendar
 * icon, and mutes its placeholder while no date is chosen. Applied through Button's public `icon`
 * property and `button` part contract, the library equivalent of the upstream class overrides.
 * The label is an authored `tp-time` (upstream `format(date, "PPP")` is `preset="date-long"`), so
 * its preset, pattern, format, locale and time zone stay configurable; its content is the
 * placeholder Time shows until it has a date.
 */
export function datePickerTriggerContracts(empty) {
  return {
    button: {
      styleHook: {
        'justify-content': 'flex-start',
        'font-weight': 'var(--tp-font-normal)',
        'padding-inline': 'calc(var(--tp-spacing) * 2.5)',
        ...(empty ? { color: 'var(--tp-muted-foreground)' } : {}),
      },
    },
  };
}

export function applyDatePickerTrigger(button, empty) {
  button.icon = calendarIcon;
  button.partContracts = datePickerTriggerContracts(empty);
  button.style.display = 'block';
}
