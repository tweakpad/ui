import { css } from 'lit';

/** Layout, containment, and hit regions. Appearance belongs to the dictionary. */
export const dialogStyles = css`
  :host,
  .portal {
    display: contents;
  }

  .overlay {
    position: fixed;
    inset: 0;
    margin: 0;
    padding: 0;
    border: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: auto;
  }

  .overlay::backdrop,
  .content::backdrop {
    background: transparent;
  }

  .content {
    position: fixed;
    inset: 0;
    margin: auto;
    gap: 0;
    inline-size: min(calc(var(--tp-spacing) * 160), calc(100% - var(--tp-space-8)));
    max-inline-size: none;
    max-block-size: calc(100dvh - var(--tp-space-8));
    min-inline-size: 0;
    overflow: auto;
    overflow-wrap: anywhere;
    overscroll-behavior: contain;
  }

  .content:has(.header[hidden]):has(.body[hidden]):has(.footer[hidden]) {
    min-block-size: calc(var(--tp-control-height-sm) + var(--tp-space-4));
  }

  .content[open] {
    display: grid;
  }

  .overlay[data-closed],
  .content[aria-hidden='true'] {
    pointer-events: none;
  }

  .header,
  .body,
  .footer {
    padding: var(--tp-space-5);
  }

  .body {
    padding-block-start: 0;
  }

  .content[data-header-hidden] .body {
    padding-block-start: var(--tp-space-5);
  }

  .content[data-header-hidden]:has(.corner-close) .body {
    padding-block-start: calc(var(--tp-control-height-sm) + var(--tp-space-4));
  }

  .header {
    display: grid;
    gap: var(--tp-space-2);
  }

  .media {
    justify-self: start;
    display: flex;
  }

  .header:has(~ .corner-close) {
    padding-inline-end: calc(var(--tp-space-5) + var(--tp-space-8));
  }

  .corner-close {
    position: absolute;
    inset-block-start: var(--tp-space-2);
    inset-inline-end: var(--tp-space-2);
  }

  .title,
  .description {
    margin: 0;
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--tp-space-2);
  }

  .footer slot {
    display: contents;
  }

  [hidden] {
    display: none !important;
  }

  @media (width < 32rem) {
    .footer {
      flex-direction: column-reverse;
      align-items: stretch;
    }
  }
`;
