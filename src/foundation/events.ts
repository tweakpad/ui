import type { ChangeReason, ValueChangeDetail } from './types.js';

/**
 * Dispatches a `CustomEvent` on `target` with the library defaults: bubbling and composed
 * unless `init` says otherwise, with `detail` always applied last. Returns the
 * `dispatchEvent` result, so a cancelable event reports `false` once a listener prevents it.
 */
export function dispatchTpEvent<T>(
  target: EventTarget,
  type: string,
  detail: T,
  init: CustomEventInit<T> = {},
): boolean {
  return target.dispatchEvent(
    new CustomEvent(type, {
      bubbles: true,
      composed: true,
      ...init,
      detail,
    }),
  );
}

export interface TpChangeEventOptions {
  /** Structural invariant repairs notify after commit and cannot be canceled. */
  cancelable?: boolean;
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
  // Source targets can belong to another owner window after adoption.
  const eventTrigger =
    (origin.target as Node | null)?.nodeType === 1 ? (origin.target as Element) : undefined;
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

/**
 * The `tp-value-change` event a component fires as its value changes, with the new and previous
 * value and the reason of the change.
 */
export class TpValueChangeEvent<T> extends CustomEvent<ValueChangeDetail<T>> {
  static readonly eventName = 'tp-value-change';

  constructor(
    value: T,
    previousValue: T,
    reason: ChangeReason,
    sourceEvent?: Event,
    options: TpChangeEventOptions = {},
    eventName: string = TpValueChangeEvent.eventName,
  ) {
    super(eventName, {
      bubbles: true,
      composed: true,
      cancelable: options.cancelable ?? true,
      detail: changeDetail(value, previousValue, reason, sourceEvent, options),
    });
  }

  override preventDefault(): void {
    super.preventDefault();
    if (this.cancelable) this.detail.cancelled = true;
  }
}

/**
 * The `tp-value-commit` event a component fires when a value change is complete, such as at the end
 * of a drag or when a field loses focus.
 */
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

/**
 * The cancelable `tp-open-change` event a component fires when it is about to open or close; cancel
 * it to keep the current state.
 */
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
