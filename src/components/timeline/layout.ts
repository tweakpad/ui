import { unsafeCSS } from 'lit';

/** Inline size below which responsive is vertical and vertical alternation collapses to end. */
export const TIMELINE_BREAKPOINT = '40rem';

const horizontal = ":host([orientation='horizontal'])";
const responsive = ":host([orientation='responsive'])";
const wide = `@container tp-timeline (width >= ${TIMELINE_BREAKPOINT})`;
const narrow = `@container tp-timeline (width < ${TIMELINE_BREAKPOINT})`;

// Horizontal rules apply to orientation=horizontal and to responsive above the
// breakpoint; generating both keeps one source for the horizontal geometry.
const both = (rules: (host: string) => string) =>
  unsafeCSS(`${rules(horizontal)}\n${wide}{${rules(responsive)}}`);

/** Root: three named tracks shared with every Item through subgrid. */
export const timelineListStyles = [
  unsafeCSS(`
    /* Browsers map an align attribute to text-align even on custom elements. */
    :host {
      display: block;
      min-inline-size: 0;
      text-align: inherit;
    }

    :host([orientation='responsive']),
    :host([align^='alternate']) {
      container: tp-timeline / inline-size;
    }

    .list {
      display: grid;
      grid-template-columns: [tl-start] auto [tl-rail] auto [tl-end] minmax(0, 1fr);
      min-inline-size: 0;
    }

    :host([align='start']) .list {
      grid-template-columns: [tl-start] minmax(0, 1fr) [tl-rail] auto [tl-end] auto;
    }

    :host([align^='alternate']) .list {
      grid-template-columns: [tl-start] minmax(0, 1fr) [tl-rail] auto [tl-end] minmax(0, 1fr);
    }

    ${narrow} {
      :host([align^='alternate']:not([orientation='horizontal'])) .list {
        grid-template-columns: [tl-start] auto [tl-rail] auto [tl-end] minmax(0, 1fr);
      }
    }

    ::slotted(:not(tp-timeline-item)) {
      grid-column: 1 / -1;
    }
  `),
  both(
    (host) => `
      ${host} .list {
        grid-template-columns: none;
        grid-template-rows: [tl-start] auto [tl-rail] auto [tl-end] auto;
        grid-auto-flow: column;
        grid-auto-columns: minmax(var(--tp-timeline-item-min-size, 8rem), 1fr);
      }

      ${host} ::slotted(:not(tp-timeline-item)) {
        grid-column: auto;
        grid-row: 1 / -1;
      }
    `,
  ),
];

const sides = (scope: string, side: 'start' | 'end') => {
  const content = side === 'end' ? 'tl-end' : 'tl-start';
  const opposite = side === 'end' ? 'tl-start' : 'tl-end';
  return `
    ${scope} .content {
      grid-column: ${content};
      padding-inline: ${side === 'end' ? 'var(--_rail-gap) 0' : '0 var(--_rail-gap)'};
    }

    ${scope} .opposite {
      grid-column: ${opposite};
      padding-inline: ${side === 'end' ? '0 var(--_rail-gap)' : 'var(--_rail-gap) 0'};
      text-align: ${side === 'end' ? 'end' : 'start'};
    }
  `;
};

/** Item: one subgrid row (vertical) or column (horizontal) across the three tracks. */
export const timelineItemStyles = [
  unsafeCSS(`
    :host {
      --_gap: var(--tp-timeline-gap, var(--tp-space-6));
      --_rail-gap: var(--tp-timeline-rail-gap, var(--tp-space-3));
      --_dot: var(--tp-timeline-dot-size, 0.625rem);
      /* Extra block inset of a vertical Marker, such as a padded first content line. */
      --_offset: var(--tp-timeline-marker-offset, 0px);
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
      min-inline-size: 0;
      text-align: inherit;
    }

    .item {
      position: relative;
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
      min-inline-size: 0;
    }

    .rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      grid-column: tl-rail;
      grid-row: 1;
      min-block-size: 0;
    }

    /* At least one line tall, so any marker centers on the first line of content. */
    .marker {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      min-inline-size: var(--_dot);
      min-block-size: 1lh;
    }

    .dot {
      display: block;
      flex: none;
      box-sizing: border-box;
      inline-size: var(--_dot);
      block-size: var(--_dot);
    }

    .connector {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-block-size: 0;
    }

    .connector[data-hidden] {
      visibility: hidden;
    }

    .before {
      flex: none;
      block-size: var(--_offset);
    }

    .after {
      flex: 1 1 auto;
    }

    .track {
      flex: 1 1 auto;
      inline-size: var(--tp-border-width);
      block-size: auto;
    }

    .fill {
      position: absolute;
      inset: 0;
      margin-inline: auto;
      inline-size: var(--tp-border-width);
      transform: scaleY(0);
      transform-origin: top;
      transition: transform var(--tp-duration-normal) var(--tp-easing-standard);
    }

    .fill[data-status='complete'] {
      transform: scaleY(1);
    }

    /* Slotted markers have no edge of their own, so the line stops short of them. */
    :host([data-custom-marker]) {
      --_marker-gap: var(--tp-space-1);
    }

    .before :is(.track, .fill) {
      margin-block-end: var(--_marker-gap, 0px);
    }

    .after :is(.track, .fill) {
      margin-block-start: var(--_marker-gap, 0px);
    }

    .fill[data-reduced-motion],
    .fill[data-tp-motion-driven~='connector'] {
      transition: none;
    }

    .content,
    .opposite {
      grid-row: 1;
      min-inline-size: 0;
      padding-block-end: var(--_gap);
    }

    .opposite[hidden] {
      display: none;
    }

    :host([data-last]) .content,
    :host([data-last]) .opposite {
      padding-block-end: 0;
    }

    ${sides('.item', 'end')}
    ${sides(".item[data-side='start']", 'start')}
  `),
  both(
    (host) => `
      ${host} {
        grid-column: auto;
        grid-row: 1 / -1;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: subgrid;
      }

      ${host} .item {
        grid-column: 1;
        grid-row: 1 / -1;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: subgrid;
      }

      ${host} .rail {
        flex-direction: row;
        grid-column: 1;
        grid-row: tl-rail;
      }

      ${host} .connector {
        flex: 1 1 0;
        flex-direction: row;
        align-items: center;
        block-size: auto;
      }

      ${host} .track {
        inline-size: auto;
        block-size: var(--tp-border-width);
      }

      ${host} .fill {
        margin-block: auto;
        margin-inline: 0;
        inline-size: auto;
        block-size: var(--tp-border-width);
        transform: scaleX(0);
        transform-origin: left;
      }

      ${host} .before :is(.track, .fill) {
        margin-block-end: auto;
        margin-inline-end: var(--_marker-gap, 0px);
      }

      ${host} .before .track {
        margin-block-end: 0;
      }

      ${host} .after :is(.track, .fill) {
        margin-block-start: auto;
        margin-inline-start: var(--_marker-gap, 0px);
      }

      ${host} .after .track {
        margin-block-start: 0;
      }

      ${host} .fill:dir(rtl) {
        transform-origin: right;
      }

      ${host} .fill[data-status='complete'] {
        transform: scaleX(1);
      }

      ${host} .content,
      ${host} .opposite {
        grid-column: 1;
        padding: 0 calc(var(--_gap) / 2);
        text-align: center;
      }

      ${host} .content {
        grid-row: tl-end;
        padding-block-start: var(--_rail-gap);
      }

      ${host} .opposite {
        grid-row: tl-start;
        padding-block-end: var(--_rail-gap);
      }

      ${host} .item[data-side='start'] .content {
        grid-row: tl-start;
        padding-block: 0 var(--_rail-gap);
      }

      ${host} .item[data-side='start'] .opposite {
        grid-row: tl-end;
        padding-block: var(--_rail-gap) 0;
      }
    `,
  ),
  unsafeCSS(`
    ${narrow} {
      ${sides(":host([data-alternate]:not([orientation='horizontal'])) .item[data-side='start']", 'end')}
    }
  `),
];
