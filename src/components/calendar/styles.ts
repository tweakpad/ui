import { css } from 'lit';

export const calendarStyles = css`
  :host {
    --tp-calendar-cell-size: var(--tp-control-height-sm);

    display: inline-block;
    max-inline-size: 100%;
  }

  .root {
    display: grid;
    max-inline-size: 100%;
  }

  .months {
    display: flex;
    flex-wrap: wrap;
    position: relative;
  }

  :host([orientation='vertical']) .months {
    flex-direction: column;
  }

  /* Stack months on narrow viewports, as the reference's flex-col md:flex-row, so the
     calendar box fits one month; wrapping still covers narrow containers. */
  @media (width < 48rem) {
    .months {
      flex-direction: column;
    }
  }

  .month {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .header {
    position: relative;
    display: flex;
    align-items: center;
    min-block-size: var(--tp-calendar-cell-size);
  }

  .caption {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: center;
    min-inline-size: 0;
    padding-inline: var(--tp-calendar-cell-size);
  }

  .caption-label {
    text-align: center;
  }

  .dropdowns {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .navigation {
    position: absolute;
    inset-block-start: 0;
    z-index: 1;
  }

  .previous::part(button-leading-mark) {
    rotate: 180deg;
  }

  :host(:dir(rtl)) .previous::part(button-leading-mark) {
    rotate: 0deg;
  }

  :host(:dir(rtl)) .next::part(button-leading-mark) {
    rotate: 180deg;
  }

  .previous {
    inset-inline-start: 0;
  }

  .next {
    inset-inline-end: 0;
  }

  .navigation::part(button) {
    inline-size: var(--tp-calendar-cell-size);
    block-size: var(--tp-calendar-cell-size);
    min-block-size: 0;
    padding: 0;
  }

  .grid,
  .weeks {
    display: grid;
  }

  .weekdays,
  .week {
    display: grid;
    grid-template-columns: repeat(7, var(--tp-calendar-cell-size));
  }

  .grid[data-week-numbers] :is(.weekdays, .week) {
    grid-template-columns: repeat(8, var(--tp-calendar-cell-size));
  }

  .weekday,
  .week-number {
    display: grid;
    place-items: center;
  }

  .day-cell {
    position: relative;
    isolation: isolate;
    display: grid;
    min-inline-size: 0;
    aspect-ratio: 1;
  }

  .day {
    display: block;
    min-inline-size: 0;
  }

  .day::part(button) {
    inline-size: 100%;
    block-size: var(--tp-calendar-cell-size);
    min-block-size: 0;
    padding: 0;
  }

  .day::part(button-label) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .day:focus-within {
    position: relative;
    z-index: 2;
  }

  .dropdown::part(native-select-control) {
    /* Caption selectors stay compact controls; only cells and navigation follow the cell size. */
    block-size: min(var(--tp-calendar-cell-size), var(--tp-control-height-sm));
    min-block-size: 0;
  }

  .weekday {
    overflow: hidden;
    white-space: nowrap;
  }

  .footer[hidden] {
    display: none;
  }
`;
