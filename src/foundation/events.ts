import type { ChangeReason, ValueChangeDetail } from './types.js';

export class TpValueChangeEvent<T> extends CustomEvent<ValueChangeDetail<T>> {
  static readonly eventName = 'tp-value-change';

  constructor(value: T, previousValue: T, reason: ChangeReason, sourceEvent?: Event) {
    super(TpValueChangeEvent.eventName, {
      bubbles: true,
      composed: true,
      detail: {
        value,
        previousValue,
        reason,
        ...(sourceEvent ? { sourceEvent } : {}),
      },
    });
  }
}

export class TpOpenChangeEvent extends CustomEvent<ValueChangeDetail<boolean>> {
  static readonly eventName = 'tp-open-change';

  constructor(value: boolean, previousValue: boolean, reason: ChangeReason, sourceEvent?: Event) {
    super(TpOpenChangeEvent.eventName, {
      bubbles: true,
      composed: true,
      detail: {
        value,
        previousValue,
        reason,
        ...(sourceEvent ? { sourceEvent } : {}),
      },
    });
  }
}
