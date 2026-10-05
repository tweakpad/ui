import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  CarouselController,
  carouselInputKind,
  carouselTimerEventType,
  type CarouselInput,
} from './controller.js';
import type { ValueChangeDetail } from '../types.js';
import { carouselItems } from './model.js';

class Host extends EventTarget implements ReactiveControllerHost {
  updateComplete = Promise.resolve(true);
  addController(_controller: ReactiveController): void {
    void _controller;
  }
  removeController(_controller: ReactiveController): void {
    void _controller;
  }
  requestUpdate(): void {}
}
function fixture(controlled = false) {
  const host = new Host();
  let input: CarouselInput = {
    items: carouselItems(['a', 'b', 'c', 'd']),
    ...(controlled ? { value: 0 } : {}),
  };
  const positions: number[] = [];
  const controller = new CarouselController({
    host,
    read: () => input,
    measure: () => ({
      width: 100,
      height: 100,
      items: input.items
        .filter((item) => !item.hidden)
        .map((item) => ({ index: item.index, size: 100, disabled: item.disabled })),
    }),
    render: () => {},
    move: (position) => {
      positions.push(position);
    },
    cancel() {},
  });
  return {
    host,
    controller,
    positions,
    read: () => input,
    write: (next: Partial<CarouselInput>) => {
      input = { ...input, ...next };
    },
  };
}

describe('Carousel selection and lifecycle owner', () => {
  function motionFixture() {
    const host = new Host();
    let value = 0;
    let position = 0;
    let finish = () => {};
    let cancels = 0;
    const moves: Array<{ position: number; speed?: number }> = [];
    const items = carouselItems(['a', 'b', 'c']);
    const controller = new CarouselController({
      host,
      read: () => ({ items, value }),
      readPosition: () => position,
      measure: () => ({
        width: 100,
        height: 100,
        items: items.map((item) => ({ index: item.index, size: 100 })),
      }),
      render() {},
      move: (next, request) => {
        moves.push({
          position: next,
          ...(request.speed === undefined ? {} : { speed: request.speed }),
        });
        if (request.speed === 0) position = next;
        else
          return new Promise<void>((resolve) => {
            finish = resolve;
          });
      },
      cancel() {
        cancels++;
      },
    });
    host.addEventListener('tp-value-change', (event) => {
      value = (event as CustomEvent<{ value: number }>).detail.value;
    });
    return {
      controller,
      moves,
      finish: () => finish(),
      cancels: () => cancels,
      setPosition: (next: number) => {
        position = next;
      },
      setValue: (next: number) => {
        value = next;
      },
    };
  }
  it('keeps controlled acknowledgement updates inside the pending settlement', async () => {
    const f = motionFixture();
    await f.controller.initialize();
    await f.controller.preview(40);
    const navigation = f.controller.next({ reason: 'swipe' });
    await Promise.resolve();
    const cancels = f.cancels();
    const moves = f.moves.length;
    await f.controller.update(true);
    expect(f.cancels()).toBe(cancels);
    expect(f.moves).toHaveLength(moves);
    expect(f.controller.snapshot.animating).toBe(true);
    f.finish();
    expect((await navigation).status).toBe('accepted');
    f.setValue(2);
    await f.controller.update(true);
    expect(f.controller.index).toBe(2);
    expect(f.moves.at(-1)).toEqual({ position: 200, speed: 0 });
    f.controller.release();
  });
  it('interrupts at the rendered position and cancels the superseded settlement', async () => {
    const f = motionFixture();
    await f.controller.initialize();
    const navigation = f.controller.next();
    await Promise.resolve();
    f.setPosition(35);
    expect(f.controller.interruptPreview()).toBe(35);
    expect(f.controller.projection.position).toBe(35);
    expect(f.controller.snapshot.animating).toBe(false);
    expect((await navigation).status).toBe('cancelled');
    await f.controller.preview(45);
    f.finish();
    await Promise.resolve();
    expect(f.controller.projection.position).toBe(45);
    f.controller.release();
  });
  it('keeps same-selection snapback transitioning until physical settlement', async () => {
    const f = motionFixture();
    await f.controller.initialize();
    await f.controller.preview(35);
    const navigation = f.controller.scrollToIndex(0, { reason: 'swipe' });
    await Promise.resolve();
    expect(f.controller.snapshot.animating).toBe(true);
    expect(f.moves.at(-1)).toEqual({ position: 0 });
    f.finish();
    expect((await navigation).status).toBe('unchanged');
    expect(f.controller.snapshot.animating).toBe(false);
    f.controller.release();
  });
  it('restores the committed virtual projection and discards a late preview render', async () => {
    const items = carouselItems(['a', 'b', 'c']);
    const positions: number[] = [];
    const finish: Array<() => void> = [];
    let delay = false;
    const controller = new CarouselController({
      host: new Host(),
      read: () => ({ items, options: { virtual: {} } }),
      measure: () => ({
        width: 100,
        height: 100,
        items: items.map((item) => ({ index: item.index, size: 100 })),
      }),
      render: () => (delay ? new Promise<void>((resolve) => finish.push(resolve)) : undefined),
      move: (position) => {
        positions.push(position);
      },
      cancel() {},
    });
    await controller.initialize();
    delay = true;
    controller.preview(200);
    const restore = controller.restorePreview();
    expect(finish).toHaveLength(2);
    finish[1]!();
    await restore;
    expect(positions.at(-1)).toBe(0);
    const moves = positions.length;
    finish[0]!();
    await Promise.resolve();
    expect(positions).toHaveLength(moves);
    expect(controller.snapshot.previewProgress).toBe(0);
    controller.release();
  });
  it('restores native preview when a direction lock or disabled state rejects settlement', async () => {
    const f = fixture();
    f.write({ options: { interaction: { allowNext: false } } });
    await f.controller.initialize();
    f.controller.preview(100, 'swipe', false);
    expect((await f.controller.settlePreview()).status).toBe('rejected');
    expect(f.positions.at(-1)).toBe(0);
    expect(f.controller.snapshot.previewProgress).toBe(0);
    f.write({ disabled: true });
    f.controller.preview(100, 'swipe', false);
    expect((await f.controller.settlePreview()).status).toBe('rejected');
    expect(f.positions.at(-1)).toBe(0);
    f.controller.release();
  });
  it('reaches the terminal fractional-view snap through the same numeric lane', async () => {
    const f = fixture();
    f.write({ options: { layout: { itemsPerView: 2.5 } } });
    await f.controller.initialize();
    while (f.controller.snapshot.canScrollNext)
      expect((await f.controller.next({ speed: 0 })).status).toBe('accepted');
    expect(f.controller.snapshot.progress).toBe(1);
    expect(f.positions.at(-1)).toBe(60);
    f.controller.release();
  });
  it('retains logical initial selection while hidden, then measures without a fake commit', async () => {
    const host = new Host();
    let width = 0;
    const events: string[] = [];
    const items = carouselItems(['a', 'b', 'c']);
    host.addEventListener('tp-value-commit', () => events.push('commit'));
    const controller = new CarouselController({
      host,
      read: () => ({ items, defaultValue: 1 }),
      measure: () => ({
        width,
        height: 100,
        items: items.map((item) => ({ index: item.index, size: 100 })),
      }),
      render() {},
      move() {},
      cancel() {},
    });
    await controller.initialize();
    expect(controller.snapshot).toMatchObject({
      measured: false,
      selectedIndex: 1,
      selectedId: 'b',
      snapIndex: null,
    });
    width = 100;
    await controller.update();
    expect(controller.snapshot).toMatchObject({ measured: true, selectedIndex: 1 });
    expect(events).toEqual([]);
    controller.release();
  });
  it('retains coherent layout after a throwing measurement resolver', async () => {
    const f = fixture();
    await f.controller.initialize();
    const before = f.controller.configuration;
    f.write({
      options: {
        layout: {
          offsetBefore: () => {
            throw new Error('measurement');
          },
        },
      },
    });
    await f.controller.update();
    expect(f.controller.configuration).toBe(before);
    expect((await f.controller.next()).status).toBe('accepted');
    f.controller.release();
  });
  it('invalidates pending renderer work before releasing a host lifetime', async () => {
    const host = new Host();
    const items = carouselItems(['a', 'b']);
    const moves: number[] = [];
    let finish: (() => void) | undefined;
    let delayed = false;
    const controller = new CarouselController({
      host,
      read: () => ({ items }),
      measure: () => ({
        width: 100,
        height: 100,
        items: items.map((item) => ({ index: item.index, size: 100 })),
      }),
      render: () =>
        delayed
          ? new Promise<void>((resolve) => {
              finish = resolve;
            })
          : undefined,
      move: (position) => {
        moves.push(position);
      },
      cancel() {},
    });
    await controller.initialize();
    delayed = true;
    const pending = controller.next();
    controller.release();
    finish?.();
    expect((await pending).status).toBe('cancelled');
    expect(moves).toEqual([0]);
  });
  it('keeps preview provisional and emits one ordered request/commit/settlement', async () => {
    const f = fixture();
    await f.controller.initialize();
    const events: string[] = [];
    for (const type of ['tp-value-change', 'tp-value-commit', 'tp-carousel-settled'])
      f.host.addEventListener(type, () => events.push(type));
    f.controller.preview(80);
    expect(f.controller.index).toBe(0);
    expect(f.controller.snapshot.previewProgress).toBeGreaterThan(0);
    expect((await f.controller.settlePreview()).status).toBe('accepted');
    expect(f.controller.snapshot.selectedId).toBe('b');
    expect(events).toEqual(['tp-value-change', 'tp-value-commit', 'tp-carousel-settled']);
  });
  it('treats an uncancelled controlled proposal without owner publication as rejected', async () => {
    const f = fixture(true);
    await f.controller.initialize();
    f.controller.preview(100);
    expect((await f.controller.next()).status).toBe('rejected');
    expect(f.controller.index).toBe(0);
    expect(f.positions.at(-1)).toBe(0);
    f.host.addEventListener('tp-value-change', () => f.write({ value: 2 }));
    const result = await f.controller.next();
    expect(result).toMatchObject({ status: 'accepted', index: 2, id: 'c' });
  });
  it('vetoes input, rejects malformed indices and clamps integer requests', async () => {
    const f = fixture();
    await f.controller.initialize();
    expect((await f.controller.scrollToIndex('2' as never)).status).toBe('rejected');
    expect((await f.controller.scrollToIndex(1.5)).status).toBe('rejected');
    expect((await f.controller.scrollToIndex(99)).index).toBe(3);
    f.host.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
    expect((await f.controller.previous()).status).toBe('rejected');
    expect(f.controller.index).toBe(3);
    expect((await f.controller.scrollToIndex(-99)).index).toBe(0);
  });
  it('retains identity across reorder and suspends an unacknowledged controlled correction', async () => {
    const f = fixture(true);
    await f.controller.initialize();
    f.write({ items: carouselItems(['b', 'a', 'c', 'd']) });
    await f.controller.update();
    expect(f.controller.index).toBe(0);
    expect(f.controller.snapshot.selectedId).toBe(null);
    expect((await f.controller.next()).status).toBe('rejected');
    f.write({ value: 1 });
    await f.controller.update(true);
    expect(f.controller.snapshot.selectedId).toBe('a');
  });
  it('preserves selected identity in uncontrolled updates and has a terminal host release', async () => {
    const f = fixture();
    await f.controller.initialize();
    await f.controller.scrollToId('b');
    f.write({ items: carouselItems(['b', 'a', 'c', 'd']) });
    await f.controller.update();
    expect(f.controller.snapshot).toMatchObject({ selectedIndex: 0, selectedId: 'b' });
    f.controller.destroy();
    expect((await f.controller.next()).status).toBe('rejected');
    await f.controller.reinitialize();
    expect(f.controller.snapshot.initialized).toBe(true);
    f.controller.release();
    await f.controller.reinitialize();
    expect(f.controller.snapshot.initialized).toBe(false);
  });
  it('lets disabled owner publication remain authoritative without enabling actions', async () => {
    const f = fixture(true);
    await f.controller.initialize();
    f.write({ disabled: true, value: 2 });
    await f.controller.update(true);
    expect(f.controller.snapshot.selectedIndex).toBe(2);
    expect((await f.controller.previous()).status).toBe('rejected');
  });
  it('cancels stale settlement when a reentrant action publishes a newer destination', async () => {
    const f = fixture();
    await f.controller.initialize();
    let nested: Promise<unknown> | undefined;
    f.host.addEventListener(
      'tp-value-commit',
      () => {
        nested = f.controller.scrollToId('d');
      },
      { once: true },
    );
    const first = await f.controller.next();
    await nested;
    expect(first.status).toBe('cancelled');
    expect(f.controller.snapshot.selectedId).toBe('d');
  });
});

describe('Carousel reasons, originating events and metadata', () => {
  afterEach(() => vi.useRealTimers());
  const details = (host: EventTarget, type: string) => {
    const list: ValueChangeDetail<number>[] = [];
    host.addEventListener(type, (event) =>
      list.push((event as CustomEvent<ValueChangeDetail<number>>).detail),
    );
    return list;
  };
  it('gives automatic-advance a synthetic timer origin and timer metadata on change and commit', async () => {
    vi.useFakeTimers();
    const f = fixture();
    f.write({ autoplay: 50 });
    const changes = details(f.host, 'tp-value-change');
    const commits = details(f.host, 'tp-value-commit');
    await f.controller.initialize();
    expect(f.controller.autoplay.running).toBe(true);
    await vi.advanceTimersByTimeAsync(60);
    expect(changes).toHaveLength(1);
    const [change] = changes;
    expect(change!.reason).toBe('automatic-advance');
    expect(change!.sourceEvent.type).toBe(carouselTimerEventType);
    expect(change!.sourceEvent.type).not.toBe('tp-programmatic-source');
    expect(change!.metadata).toMatchObject({
      previousId: 'a',
      nextId: 'b',
      snap: 1,
      inputKind: 'timer',
    });
    expect(typeof change!.metadata?.generation).toBe('number');
    expect(commits).toHaveLength(1);
    expect(commits[0]!.reason).toBe('automatic-advance');
    expect(commits[0]!.sourceEvent).toBe(change!.sourceEvent);
    expect(commits[0]!.metadata).toEqual(change!.metadata);
    f.controller.release();
  });
  it('records the input kind of a real source event in proposal and commit metadata', async () => {
    const f = fixture();
    await f.controller.initialize();
    const changes = details(f.host, 'tp-value-change');
    const commits = details(f.host, 'tp-value-commit');
    const key = new Event('keydown');
    await f.controller.next({ reason: 'keyboard', sourceEvent: key });
    expect(changes[0]).toMatchObject({ reason: 'keyboard', sourceEvent: key });
    expect(changes[0]!.metadata).toMatchObject({ inputKind: 'keyboard', nextId: 'b', snap: 1 });
    expect(commits[0]!.metadata).toEqual(changes[0]!.metadata);
    await f.controller.next();
    expect(changes[1]!.metadata).toMatchObject({
      previousId: 'b',
      nextId: 'c',
      inputKind: 'programmatic',
    });
  });
  it('classifies pointer, touch, keyboard-activated clicks, wheel and lifecycle origins', () => {
    const pointer = Object.assign(new Event('pointerup'), { pointerType: 'touch' });
    const keyboardClick = Object.assign(new Event('click'), { pointerType: '', detail: 0 });
    const mouseClick = Object.assign(new Event('click'), { pointerType: 'mouse', detail: 1 });
    expect(carouselInputKind('swipe', pointer)).toBe('touch');
    expect(carouselInputKind('trigger-press', keyboardClick)).toBe('keyboard');
    expect(carouselInputKind('trigger-press', mouseClick)).toBe('mouse');
    expect(carouselInputKind('wheel', new Event('wheel'))).toBe('wheel');
    expect(carouselInputKind('swipe')).toBe('scroll');
    expect(carouselInputKind('disabled')).toBe('lifecycle');
    expect(carouselInputKind('automatic-advance', new Event('tp-programmatic-source'))).toBe(
      'timer',
    );
    expect(carouselInputKind('imperative-action')).toBe('programmatic');
  });
  it('uses the registered disabled reason when the selected item becomes disabled', async () => {
    const f = fixture();
    await f.controller.initialize();
    await f.controller.scrollToId('b');
    const changes = details(f.host, 'tp-value-change');
    f.write({
      items: carouselItems(['a', 'b', 'c', 'd'], {
        getItemOptions: (_value, index) => ({ disabled: index === 1 }),
      }),
    });
    await f.controller.update();
    expect(changes.map((change) => change.reason)).toEqual(['disabled']);
    expect(changes[0]!.metadata).toMatchObject({ previousId: 'b', inputKind: 'lifecycle' });
    expect(f.controller.snapshot.selectedId).not.toBe('b');
    expect(f.controller.snapshot.selectedId).not.toBe(null);
  });
  it('keeps the missing reason when the selected item is removed', async () => {
    const f = fixture();
    await f.controller.initialize();
    await f.controller.scrollToId('d');
    const changes = details(f.host, 'tp-value-change');
    f.write({ items: carouselItems(['a', 'b', 'c']) });
    await f.controller.update();
    expect(changes.map((change) => change.reason)).toEqual(['missing']);
    expect(f.controller.snapshot.selectedId).toBe('c');
  });
});
