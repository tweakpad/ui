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

export const controlStyles = css`
  .control {
    appearance: none;
  }

  .control:disabled {
    cursor: not-allowed;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;

export function eventReason(event: Event): 'keyboard' | 'pointer' | 'input' {
  if (event instanceof KeyboardEvent) return 'keyboard';
  if (event instanceof PointerEvent || event instanceof MouseEvent) return 'pointer';
  return 'input';
}

export function assignedElements(slot: HTMLSlotElement | null): HTMLElement[] {
  return (
    slot
      ?.assignedElements({ flatten: true })
      .filter((item): item is HTMLElement => item instanceof HTMLElement) ?? []
  );
}

export function activateLabeledControl(control: HTMLElement | null): void {
  if (!control || control.matches(':disabled, [disabled]')) return;
  const activatable = control as HTMLElement & { activateFromLabel?: () => void };
  if (typeof activatable.activateFromLabel === 'function') {
    activatable.activateFromLabel();
    return;
  }
  control.focus();
  if (
    control instanceof HTMLButtonElement ||
    (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type))
  ) {
    control.click();
  }
}
