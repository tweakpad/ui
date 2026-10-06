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
