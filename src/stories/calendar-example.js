import { html } from 'lit';
import { clockIcon } from '../icons/clock.js';
import { applyDatePickerTrigger } from './date-picker-trigger.js';

const isoDate = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (iso, days) => {
  const [year, month, day] = iso.split('-').map(Number);
  return isoDate(new Date(year, month - 1, day + days));
};
const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
const weekend = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return [0, 6].includes(new Date(year, month - 1, day).getDay());
};

// Application behavior only. Calendar, Button, Card, Field, Input and Popover keep their owners.
export function setupCalendarExample(root) {
  const cleanups = [];
  const listen = (node, name, callback) => {
    node.addEventListener(name, callback);
    cleanups.push(() => node.removeEventListener(name, callback));
  };
  for (const icon of root.querySelectorAll('tp-icon[data-calendar-icon]')) icon.icon = clockIcon;

  for (const calendar of root.querySelectorAll('tp-calendar[data-controlled]')) {
    // A controlled owner accepts each proposal synchronously.
    listen(calendar, 'tp-value-change', (event) => {
      if (!event.defaultPrevented) calendar.value = event.detail.value;
    });
    listen(calendar, 'tp-displayed-month-change', (event) => {
      if (!event.defaultPrevented) calendar.displayedMonth = event.detail.value;
    });
  }

  for (const button of root.querySelectorAll('tp-button[data-preset-days]')) {
    listen(button, 'click', () => {
      const calendar = button.closest('tp-card').querySelector('tp-calendar');
      const date = addDays(calendar.today, Number(button.dataset.presetDays));
      calendar.value = date;
      calendar.displayedMonth = monthStart(date);
    });
  }

  for (const calendar of root.querySelectorAll('tp-calendar[data-booked]')) {
    const [from, to] = calendar.dataset.booked.split('/');
    const booked = new Set();
    for (let date = from; date <= to; date = addDays(date, 1)) booked.add(date);
    calendar.disabledDates = booked;
    calendar.dayModifiers = { booked };
    // The strike-through is visual; the accessible name carries the same information.
    calendar.messages = {
      day: (day) => (day.modifiers.booked ? `${day.label}, booked` : day.label),
    };
    calendar.renderDay = (day) =>
      day.modifiers.booked ? html`<s>${Number(day.date.slice(8))}</s>` : undefined;
  }

  for (const calendar of root.querySelectorAll('tp-calendar[data-prices]')) {
    calendar.renderDay = (day) =>
      html`${Number(day.date.slice(8))}${
        day.outside
          ? ''
          : html`<span style="font-size:var(--tp-text-xs);opacity:0.7"
              >${weekend(day.date) ? '$120' : '$100'}</span
            >`
      }`;
  }

  for (const calendar of root.querySelectorAll('tp-calendar[data-arabic]')) {
    calendar.messages = {
      previous: (_month, caption) => `الشهر السابق، ${caption}`,
      next: (_month, caption) => `الشهر التالي، ${caption}`,
      monthDropdown: 'الشهر',
      yearDropdown: 'السنة',
      weekNumberHeader: 'رقم الأسبوع',
      validity: (code) => (code === 'value-missing' ? 'اختر تاريخًا.' : 'اختر تاريخًا متاحًا.'),
    };
  }

  for (const popover of root.querySelectorAll('tp-popover[data-date-picker]')) {
    const calendar = popover.querySelector('tp-calendar');
    const label = popover.querySelector('tp-time');
    const trigger = popover.querySelector('tp-button[slot="trigger"]');
    applyDatePickerTrigger(trigger, true);
    // Opening moves focus to the calendar's current day (Calendar focus delegates to it).
    popover.initialFocus = calendar;
    listen(calendar, 'tp-value-change', (event) => {
      if (event.defaultPrevented) return;
      applyDatePickerTrigger(trigger, !event.detail.value);
      // Time keeps the date-only value on its calendar day and shows its content while empty.
      label.datetime = event.detail.value ?? undefined;
      popover.close();
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
