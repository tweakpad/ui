import { describe, expect, it } from 'vitest';
import { runLayoutPasses } from '../../foundation/layout-batch.js';
import { OverflowFitController, type OverflowFitHost, type OverflowFitState } from './fit.js';

const box = (left: number, width: number, top = 0, height = 20): DOMRectReadOnly => ({
  left,
  top,
  width,
  height,
  x: left,
  y: top,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
});

const STYLE = {
  writingMode: 'horizontal-tb',
  paddingInlineStart: '0px',
  paddingInlineEnd: '0px',
  borderInlineStartWidth: '0px',
  borderInlineEndWidth: '0px',
  marginInlineStart: '0px',
  marginInlineEnd: '0px',
  display: 'block',
  flexGrow: '0',
};

/**
 * A list that takes its inline size from its sizer's intrinsic maximum, as a flex item in a wide
 * row does, with Items of fixed widths laid out in one row.
 */
function intrinsicList(widths: number[], staleMax: number) {
  const view = { getComputedStyle: () => STYLE };
  const ownerDocument = { defaultView: view };
  const properties = new Map<string, string>([['--_tp-overflow-max', `${staleMax}px`]]);
  const sizer = {
    ownerDocument,
    style: {
      getPropertyValue: (name: string) => properties.get(name) ?? '',
      setProperty: (name: string, value: string) => void properties.set(name, value),
    },
  };
  const element = (rect: () => DOMRectReadOnly) => ({
    ownerDocument,
    isConnected: true,
    getRootNode: () => ({}),
    getClientRects: () => [rect()],
    getBoundingClientRect: rect,
    style: { setProperty: () => undefined, removeProperty: () => undefined },
  });
  const width = () => Number.parseFloat(properties.get('--_tp-overflow-max') ?? '0');
  const list = element(() => box(0, width()));
  const items = widths.map((size, index) =>
    element(() =>
      box(
        widths.slice(0, index).reduce((sum, value) => sum + value, 0),
        size,
      ),
    ),
  );
  const pool = element(() => box(0, width(), 0, 0));
  const gapProbe = element(() => box(0, 0, 0, 0));
  return { list, items, pool, gapProbe, sizer, width };
}

function fitHost() {
  const adopted: number[] = [];
  let settled = 0;
  const host = {
    isConnected: true,
    ownerDocument: {},
    shadowRoot: {},
    addController: () => undefined,
    removeController: () => undefined,
    requestUpdate: () => undefined,
    updateComplete: Promise.resolve(true),
    adoptShown: (shown: number) => void adopted.push(shown),
    partitionSettled: () => void settled++,
    probeCounts: () => false,
    itemDiagnostic: () => undefined,
  };
  return { host: host as unknown as OverflowFitHost, adopted, settled: () => settled };
}

describe('overflow fit', () => {
  it('ovl-refit: measures again once its intrinsic size changed, so a stale size never presents a partition', () => {
    // Three 100 px Items replace the Items that sized the list at 100 px.
    const list = intrinsicList([100, 100, 100], 100);
    const { host, adopted, settled } = fitHost();
    const controller = new OverflowFitController(host);
    const state = {
      items: list.items,
      shown: 3,
      maxRows: 1,
      limit: undefined,
      from: 'end',
      count: null,
      countShown: false,
      countSource: undefined,
      countPresents: 0,
      list: list.list,
      sizer: list.sizer,
      pool: list.pool,
      gapProbe: list.gapProbe,
    } as unknown as OverflowFitState;
    controller.sync(state);
    runLayoutPasses();
    // The pass grew the intrinsic size to the row and left the choice to the next pass.
    expect(list.width()).toBe(300);
    expect(adopted).toEqual([]);
    expect(settled()).toBe(0);
    runLayoutPasses();
    // Measured at the new size, every Item fits: nothing moves to the pool.
    expect(adopted).toEqual([]);
    expect(settled()).toBe(1);
  });

  it('an update after the removal observes nothing until the host connects again', () => {
    const observed: unknown[] = [];
    const unobserved: unknown[] = [];
    const fonts: unknown[] = [];
    class FakeResizeObserver {
      observe(target: unknown): void {
        observed.push(target);
      }
      unobserve(target: unknown): void {
        unobserved.push(target);
      }
      disconnect(): void {}
    }
    const view = { getComputedStyle: () => STYLE, ResizeObserver: FakeResizeObserver };
    const ownerDocument = {
      defaultView: view,
      fonts: {
        addEventListener: (_: string, listener: unknown) => void fonts.push(listener),
        removeEventListener: () => undefined,
      },
    };
    const element = () => ({ ownerDocument, isConnected: false, getRootNode: () => ({}) });
    const { host } = fitHost();
    (host as { isConnected: boolean }).isConnected = false;
    (host as unknown as { ownerDocument: unknown }).ownerDocument = ownerDocument;
    const controller = new OverflowFitController(host);
    const state = {
      items: [element(), element()],
      shown: 2,
      maxRows: 1,
      count: null,
      countSource: undefined,
      list: element(),
      sizer: element(),
      pool: element(),
      gapProbe: element(),
    } as unknown as OverflowFitState;
    controller.sync(state);
    expect(observed).toEqual([]);
    expect(fonts).toEqual([]);
    // The reconnection observes the kept state.
    (host as { isConnected: boolean }).isConnected = true;
    controller.hostConnected();
    expect(observed).toHaveLength(4);
    expect(fonts).toHaveLength(1);
    (host as { isConnected: boolean }).isConnected = false;
    controller.hostDisconnected();
    expect(unobserved).toHaveLength(4);
  });
});
