import { describe, expect, it, vi } from 'vitest';
import { FloatingTree } from './floating-tree.js';
import { TpOpenChangeEvent, TpValueChangeEvent, TpValueCommitEvent } from './events.js';
import { computeSurfacePosition, detectOverflow, rect } from './positioning.js';
import { ObservableStore } from './store.js';
import { TypeaheadController } from './typeahead.js';
import { ValidationController, aggregateValidity } from './validation.js';

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
});

describe('ObservableStore', () => {
  it('publishes one atomic change for a batch', () => {
    const store = new ObservableStore(0);
    const subscriber = vi.fn();
    store.subscribe(subscriber);
    store.batch(() => {
      store.set(1, 'input');
      store.set(2, 'selection');
    });
    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenCalledWith({ value: 2, previousValue: 0, reason: 'selection' });
  });
});

describe('ValidationRun', () => {
  it('publishes a pending run and its terminal snapshot', async () => {
    const controller = new ValidationController<string>([
      (value) => ({ valid: value.length > 0, message: 'Required', flags: { valueMissing: true } }),
      (value) => ({ valid: value.length >= 3, message: 'Too short', flags: { tooShort: true } }),
    ]);
    const run = controller.validate('a', 'name');
    expect(run.status).toBe('pending');
    await expect(run.completion).resolves.toMatchObject({
      generation: 1,
      status: 'invalid',
      fieldResults: [{ identity: 'name', valid: false, errors: ['Too short'] }],
    });
  });

  it('settles a superseded run as cancelled', async () => {
    let release: (() => void) | undefined;
    const controller = new ValidationController<string>([
      async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return null;
      },
    ]);
    const first = controller.validate('first');
    const second = controller.validate('second');
    await expect(first.completion).resolves.toMatchObject({ status: 'cancelled' });
    release?.();
    controller.cancel();
    await expect(second.completion).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('aggregates messages and validity flags', () => {
    expect(
      aggregateValidity([
        { valid: false, message: 'Required', flags: { valueMissing: true } },
        { valid: false, message: 'Bad input', flags: { badInput: true } },
      ]),
    ).toEqual({
      valid: false,
      message: 'Required\nBad input',
      flags: { valueMissing: true, badInput: true },
    });
  });
});

describe('TypeaheadController', () => {
  it('wraps through enabled matching items', () => {
    const controller = new TypeaheadController();
    const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Charlie' },
    ];
    expect(controller.search(items, 'c', 0)).toBe(2);
    controller.reset();
    expect(controller.search(items, 'a', 2)).toBe(0);
    controller.reset();
  });
});

describe('FloatingTree', () => {
  it('dismisses descendants before their ancestor', () => {
    const order: string[] = [];
    const tree = new FloatingTree();
    const element = {} as HTMLElement;
    tree.register({ id: 'root', element, dismiss: () => order.push('root') });
    tree.register({ id: 'child', parentId: 'root', element, dismiss: () => order.push('child') });
    tree.dismissBranch('root', 'escape');
    expect(order).toEqual(['child', 'root']);
  });
});

describe('positioning', () => {
  const clipping = rect(0, 0, 500, 500);

  it('places and offsets an aligned surface', () => {
    const result = computeSurfacePosition(rect(100, 100, 80, 40), rect(0, 0, 120, 60), clipping, {
      placement: 'bottom-start',
      offset: 8,
    });
    expect(result).toMatchObject({ x: 100, y: 148, placement: 'bottom-start' });
    expect(result?.stageData.offset).toEqual({ x: 0, y: 8, placement: 'bottom-start' });
  });

  it('flips to the first fitting opposite placement', () => {
    const result = computeSurfacePosition(rect(100, 450, 80, 30), rect(0, 0, 120, 80), clipping, {
      placement: 'bottom-start',
      offset: 8,
    });
    expect(result?.placement).toBe('top-start');
    expect(result?.y).toBe(362);
    expect(result?.stageData.flip?.candidates.map((candidate) => candidate.placement)).toEqual([
      'bottom-start',
      'bottom-end',
      'top-start',
      'top-end',
    ]);
  });

  it('resolves horizontal alignment from writing direction', () => {
    const result = computeSurfacePosition(
      rect(100, 100, 80, 40),
      rect(0, 0, 120, 60),
      clipping,
      { placement: 'bottom-start', offset: 0 },
      'rtl',
    );
    expect(result?.x).toBe(60);
  });

  it('reports signed overflow and rejects non-finite geometry', () => {
    expect(detectOverflow(rect(-10, 20, 40, 30), clipping)).toEqual({
      top: -20,
      right: -470,
      bottom: -450,
      left: 10,
    });
    expect(
      computeSurfacePosition(rect(Number.NaN, 0, 10, 10), rect(0, 0, 10, 10), clipping),
    ).toBeNull();
  });
});
