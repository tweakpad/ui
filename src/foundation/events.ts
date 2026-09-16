import type { ChangeReason, ValueChangeDetail } from './types.js';

export interface TpChangeEventOptions {
  allowPropagation?: boolean;
  metadata?: Record<string, unknown>;
  trigger?: Element;
}

function changeDetail<T>(
  value: T,
  previousValue: T,
  reason: ChangeReason,
  sourceEvent?: Event,
  options: TpChangeEventOptions = {},
): ValueChangeDetail<T> {
  const origin = sourceEvent ?? new Event('tp-programmatic-source');
  const eventTrigger =
    typeof Element === 'undefined' || !(origin.target instanceof Element)
      ? undefined
      : origin.target;
  const trigger = options.trigger ?? eventTrigger;
  return {
    value,
    previousValue,
    reason,
    sourceEvent: origin,
    ...(trigger ? { trigger } : {}),
    cancelled: false,
    allowPropagation: options.allowPropagation ?? false,
    ...(options.metadata ? { metadata: options.metadata } : {}),
  };
}

export class TpValueChangeEvent<T> extends CustomEvent<ValueChangeDetail<T>> {
  static readonly eventName = 'tp-value-change';

  constructor(
    value: T,
    previousValue: T,
    reason: ChangeReason,
    sourceEvent?: Event,
    options: TpChangeEventOptions = {},
  ) {
    super(TpValueChangeEvent.eventName, {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: changeDetail(value, previousValue, reason, sourceEvent, options),
    });
  }

  override preventDefault(): void {
    super.preventDefault();
    this.detail.cancelled = true;
  }
}

export class TpValueCommitEvent<T> extends CustomEvent<ValueChangeDetail<T>> {
  static readonly eventName = 'tp-value-commit';

  constructor(
    value: T,
    previousValue: T,
    reason: ChangeReason,
    sourceEvent?: Event,
    options: TpChangeEventOptions = {},
  ) {
    super(TpValueCommitEvent.eventName, {
      bubbles: true,
      composed: true,
      detail: changeDetail(value, previousValue, reason, sourceEvent, options),
    });
  }
}

export class TpOpenChangeEvent extends CustomEvent<ValueChangeDetail<boolean>> {
  static readonly eventName = 'tp-open-change';

  constructor(value: boolean, previousValue: boolean, reason: ChangeReason, sourceEvent?: Event) {
    super(TpOpenChangeEvent.eventName, {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: changeDetail(value, previousValue, reason, sourceEvent),
    });
  }

  override preventDefault(): void {
    super.preventDefault();
    this.detail.cancelled = true;
  }
}
