import { describe, expect, it } from 'vitest';
import {
  TpOpenChangeEvent,
  TpValueChangeEvent,
  TpValueCommitEvent,
  dispatchTpEvent,
} from './events.js';

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

describe('dispatchTpEvent', () => {
  it('dispatches a bubbling, composed custom event carrying the detail', () => {
    const target = new EventTarget();
    let received: CustomEvent<{ value: number }> | undefined;
    target.addEventListener('tp-example', (event) => {
      received = event as CustomEvent<{ value: number }>;
    });

    const result = dispatchTpEvent(target, 'tp-example', { value: 1 });

    expect(result).toBe(true);
    expect(received).toBeInstanceOf(CustomEvent);
    expect(received?.type).toBe('tp-example');
    expect(received?.detail).toEqual({ value: 1 });
    expect(received?.bubbles).toBe(true);
    expect(received?.composed).toBe(true);
    expect(received?.cancelable).toBe(false);
  });

  it('lets init override the propagation defaults while detail always wins', () => {
    const target = new EventTarget();
    let received: CustomEvent<string> | undefined;
    target.addEventListener('tp-example', (event) => {
      received = event as CustomEvent<string>;
    });

    dispatchTpEvent(target, 'tp-example', 'detail', {
      bubbles: false,
      composed: false,
      cancelable: true,
      detail: 'ignored',
    });

    expect(received?.bubbles).toBe(false);
    expect(received?.composed).toBe(false);
    expect(received?.cancelable).toBe(true);
    expect(received?.detail).toBe('detail');
  });

  it('reports cancellation of a cancelable event through the return value', () => {
    const target = new EventTarget();
    target.addEventListener('tp-example', (event) => event.preventDefault());

    expect(dispatchTpEvent(target, 'tp-example', null, { cancelable: true })).toBe(false);
    expect(dispatchTpEvent(target, 'tp-example', null)).toBe(true);
  });
});
