import { css } from 'lit';

// Optional elevation is a shared presentation property, independent of component variants.
export const elevatedProperty = { type: Boolean, reflect: true } as const;

export const elevationStyles = css`
  :host {
    --_tp-elevation-shadow: var(--tp-shadow-none);
  }

  :host([elevated]) {
    --_tp-elevation-shadow: var(--tp-shadow-md);
  }
`;
