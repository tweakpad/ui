import { describe, expect, it } from 'vitest';
import { TpOpenChangeEvent, TpValueChangeEvent, TpValueCommitEvent } from './events.js';

describe('change events', () => {
  it('allows a consumer to cancel a value request', () => {
    const target = new EventTarget();
    const event = new TpValueChangeEvent('next', 'previous', 'programmatic');
    target.addEventListener(TpValueChangeEvent.eventName, (request) => request.preventDefault());
    expect(target.dispatchEvent(event)).toBe(false);
    expect(event.detail.cancelled).toBe(true);
    expect(event.detail.sourceEvent.type).toBe('tp-programmatic-source');
  });

  it('allows a consumer to cancel an open request', () => {
    const target = new EventTarget();
    const event = new TpOpenChangeEvent(true, false, 'programmatic');
    target.addEventListener(TpOpenChangeEvent.eventName, (request) => request.preventDefault());
    expect(target.dispatchEvent(event)).toBe(false);
    expect(event.detail.cancelled).toBe(true);
  });

  it('publishes commit metadata without exposing a cancelable default action', () => {
    const event = new TpValueCommitEvent([20, 60], [10, 60], 'keyboard', undefined, {
      metadata: { activeThumbIndex: 0 },
    });
    expect(event.cancelable).toBe(false);
    expect(event.detail.metadata).toEqual({ activeThumbIndex: 0 });
  });

  it('retains an element source target from a different realm', () => {
    const target = { nodeType: 1 } as Element;
    const source = new Event('change');
    Object.defineProperty(source, 'target', { value: target });
    const event = new TpValueChangeEvent('next', 'previous', 'input', source);
    expect(event.detail.sourceEvent).toBe(source);
    expect(event.detail.trigger).toBe(target);
    const explicit = { nodeType: 1 } as Element;
    expect(
      new TpValueChangeEvent('next', 'previous', 'input', source, { trigger: explicit }).detail
        .trigger,
    ).toBe(explicit);
  });
});
