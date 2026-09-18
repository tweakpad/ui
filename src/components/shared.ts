import { css } from 'lit';

export const controlStyles = css`
  .control {
    appearance: none;
    min-height: var(--tp-control-height-md);
    padding: var(--tp-space-2) var(--tp-space-3);
    border: var(--tp-border-width) var(--tp-border-style) var(--tp-input);
    border-radius: var(--tp-radius-sm);
    color: var(--tp-foreground);
    background: var(--tp-background);
    font: inherit;
  }

  .control:disabled {
    cursor: not-allowed;
  }

  .control:not(:disabled, [aria-disabled='true']):hover {
    border-color: var(--tp-accent);
  }

  .surface {
    padding: var(--tp-space-3);
    border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
    border-radius: var(--tp-radius-lg);
    color: var(--tp-popover-foreground);
    background: var(--tp-popover);
    box-shadow: var(--tp-shadow-lg);
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
