import { css } from 'lit';

export const controlStyles = css`
  .control {
    appearance: none;
    border: 1px solid var(--tp-color-border, currentcolor);
    border-radius: var(--tp-radius-sm, 0.375rem);
    color: inherit;
    background: var(--tp-color-surface, Canvas);
    font: inherit;
    min-height: 2.25rem;
    padding: 0.45rem 0.75rem;
  }

  .control:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .control:not(:disabled):hover {
    border-color: color-mix(
      in srgb,
      var(--tp-color-accent, Highlight) 65%,
      var(--tp-color-border, currentcolor)
    );
  }

  .surface {
    border: 1px solid var(--tp-color-border, currentcolor);
    border-radius: var(--tp-radius-md, 0.625rem);
    color: var(--tp-color-text, CanvasText);
    background: var(--tp-color-surface, Canvas);
    box-shadow: var(--tp-shadow-overlay, 0 12px 40px rgb(0 0 0 / 20%));
    padding: 0.75rem;
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
