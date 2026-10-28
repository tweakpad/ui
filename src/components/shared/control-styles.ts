import { css, unsafeCSS } from 'lit';
import type { CSSResult } from 'lit';

/** Checkbox, Radio and Tree view check indicators: the box that carries selection paint. */
export const selectionBoxStyles = css`
  .box {
    display: inline-grid;
    flex: none;
    place-items: center;
    inline-size: var(--tp-icon-size-md);
    block-size: var(--tp-icon-size-md);
  }
`;

/** Shadow-tree `[hidden]` content is removed; `hidden="until-found"` content stays searchable. */
export const hiddenStyles = css`
  [hidden]:not([hidden='until-found']) {
    display: none !important;
  }
`;

/** A comma-separated list of class selectors, such as `.thumb, .handle`. */
const handleSelectorPattern = /^\.[a-z][\w-]*(?:\s*,\s*\.[a-z][\w-]*)*$/i;

/** A range handle's native input keeps focus and orientation without layout or pointer handling. */
const rangeInputStyles = css`
  input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  input[aria-orientation='vertical'] {
    writing-mode: vertical-lr;
  }
`;

/**
 * Range handles (Slider thumbs, color and easing surface handles): each handle extends its hit
 * area to the minimum target size over its hidden native input.
 */
export function rangeHandleStyles(handles: string): CSSResult {
  if (!handleSelectorPattern.test(handles))
    throw new Error(`rangeHandleStyles: unsupported selector list "${handles}"`);
  const hit = handles
    .split(',')
    .map((selector) => `${selector.trim()}::after`)
    .join(',');
  return css`
    ${unsafeCSS(
      `${hit}{content:'';position:absolute;` +
        'inset:min(calc(var(--tp-space-2) * -1), calc((100% - var(--tp-target-size-min)) / 2))}',
    )}
    ${rangeInputStyles}
  `;
}
