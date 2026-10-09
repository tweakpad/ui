import { describe, expect, it } from 'vitest';
import { targetOf } from '../anchored-surface/anchored-surface.js';
import { TpTooltip } from './tooltip.js';

/** Minimal element stand-in: a tag, an optional shadow tree and a `[popover]` ancestor flag. */
interface FakeElement {
  readonly localName: string;
  shadowRoot: FakeRoot | null;
  inPopover?: boolean;
  closest(selector: string): FakeElement | null;
}
interface FakeRoot {
  readonly nodes: FakeElement[];
  querySelector(selector: string): FakeElement | null;
  querySelectorAll(selector: string): FakeElement[];
}

const CONTROLS = new Set(['button', 'input', 'focusable']);
function element(localName: string, nodes?: FakeElement[], inPopover = false): FakeElement {
  const self: FakeElement = {
    localName,
    shadowRoot: null,
    inPopover,
    closest: (selector) => (selector === '[popover]' && self.inPopover ? self : null),
  };
  if (nodes)
    self.shadowRoot = {
      nodes,
      querySelector: (selector) =>
        selector === '*' ? (nodes[0] ?? null) : (controls(nodes)[0] ?? null),
      querySelectorAll: (selector) => (selector === '*' ? nodes : controls(nodes)),
    };
  return self;
}
const controls = (nodes: FakeElement[]) => nodes.filter((node) => CONTROLS.has(node.localName));
const resolve = (host: FakeElement) => targetOf(host as unknown as HTMLElement) as unknown;

describe('trigger control resolution (anchored surfaces)', () => {
  it('uses the host shadow control, else the host (unchanged single-level behavior)', () => {
    const native = element('button');
    expect(resolve(native)).toBe(native);
    const inner = element('button');
    const button = element('tp-button', [element('span'), inner]);
    expect(resolve(button)).toBe(inner);
    const badge = element('tp-badge', [element('span'), element('tp-icon', [element('svg')])]);
    expect(resolve(badge)).toBe(badge);
  });

  it('reaches the control of a library control composed in the host shadow root', () => {
    const inner = element('button');
    const mediaButton = element('tp-media-play-button', [
      element('tp-button', [inner]),
      element('tp-icon', [element('svg')]),
    ]);
    expect(resolve(mediaButton)).toBe(inner);
  });

  it('ignores controls inside a composed top-layer surface', () => {
    const popup = element('focusable', undefined, true);
    const triggerControl = element('button');
    const host = element('tp-media-volume-popover', [
      element('tp-popover', [element('slot'), element('div', undefined, true), popup]),
      element('tp-media-mute-button', [element('tp-button', [triggerControl])]),
    ]);
    expect(resolve(host)).toBe(triggerControl);
    const onlySurface = element('host', [element('tp-popover', [popup])]);
    expect(resolve(onlySurface)).toBe(onlySurface);
  });
});

customElements.define('tp-tooltip-unit', class extends TpTooltip {});
const createTooltip = () => new (customElements.get('tp-tooltip-unit')!)() as TpTooltip;
type DescribingTooltip = TpTooltip & {
  readonly exposesTriggerDescription: boolean;
  popupProperties(): Record<string, unknown>;
};

describe('tp-tooltip describes', () => {
  it('describes its trigger by default', () => {
    const tooltip = createTooltip() as DescribingTooltip;
    expect(tooltip.describes).toBe('trigger');
    expect(tooltip.exposesTriggerDescription).toBe(true);
    expect(tooltip.popupProperties()['role']).toBe('tooltip');
    expect(tooltip.popupProperties()['aria-hidden']).toBeUndefined();
  });

  it('is visual only with describes="none": no description, hidden content', () => {
    const tooltip = createTooltip() as DescribingTooltip;
    tooltip.describes = 'none';
    expect(tooltip.exposesTriggerDescription).toBe(false);
    expect(tooltip.popupProperties()['aria-hidden']).toBe('true');
  });
});
