import { describe, expect, it, vi } from 'vitest';
import type * as Toolbar from '../../../foundation/toolbar.js';
import { templateMarkup } from '../../../template-markup.test.js';

/** Every registration the bar asks of its toolbar: `<kind> <tag.classes> [item kind]`. */
const registrations = vi.hoisted((): string[] => []);

vi.mock('../../../foundation/toolbar.js', async (importOriginal) => {
  const original = await importOriginal<typeof Toolbar>();
  const name = (element: HTMLElement) =>
    [element.localName, ...element.className.split(' ').filter(Boolean)].join('.');
  const registration = { update: () => {}, dispose: () => {} };
  class RecordingToolbar {
    update(): void {}
    dispose(): void {}
    registerItem(element: HTMLElement, options: Toolbar.ToolbarItemOptions) {
      registrations.push(`item ${name(element)} ${options.kind}`);
      return registration;
    }
    registerGroup(element: HTMLElement) {
      registrations.push(`group ${name(element)}`);
      return registration;
    }
  }
  return { ...original, ToolbarController: RecordingToolbar };
});

const { TpFlowControls } = await import('./controls.js');

const rendered = (actions: InstanceType<typeof TpFlowControls>['actions']): string => {
  const bar = new TpFlowControls();
  bar.actions = actions;
  // The menus open toward the canvas from the slot the bar is authored in.
  bar.setAttribute('slot', 'bottom-start');
  return templateMarkup((bar as unknown as { render(): unknown }).render());
};

/** A light-DOM element: its tag, classes and children, matched by `tag.class` selector lists. */
interface Stub {
  readonly localName: string;
  readonly className: string;
  readonly children: readonly Stub[];
  parent: Stub | null;
  querySelectorAll(selectors: string): Stub[];
  querySelector(selectors: string): Stub | null;
  closest(selectors: string): Stub | null;
}

const matches = (element: Stub, selectors: string): boolean =>
  selectors.split(',').some((selector) => {
    const [tag, ...classes] = selector.trim().split('.');
    const own = element.className.split(' ');
    return (!tag || element.localName === tag) && classes.every((name) => own.includes(name));
  });

const stub = (tag: string, children: Stub[] = []): Stub => {
  const [localName = '', ...classes] = tag.split('.');
  const descendants = (element: Stub): Stub[] =>
    element.children.flatMap((child) => [child, ...descendants(child)]);
  const element: Stub = {
    localName,
    className: classes.join(' '),
    children,
    parent: null,
    querySelectorAll: (selectors) =>
      descendants(element).filter((child) => matches(child, selectors)),
    querySelector: (selectors) => element.querySelectorAll(selectors)[0] ?? null,
    closest: (selectors) => {
      for (let node: Stub | null = element; node; node = node.parent)
        if (matches(node, selectors)) return node;
      return null;
    },
  };
  for (const child of children) child.parent = element;
  return element;
};

describe('flow controls bar', () => {
  it('shows the lock, the node library trigger and the tool group at the icon size (`req-cl-145-size`, `uwg-te-toggle-req-icon`, `uwg-te-toggle-group-req-icon`)', () => {
    const text = rendered(['tool', 'lock', 'palette']);
    const opening = [
      ...text.matchAll(
        /<tp-toggle(?:-group)? class="(?:control lock|control palette|tools)"[^>]*>/g,
      ),
    ].map(([tag]) => tag);
    expect(opening).toHaveLength(3);
    for (const tag of opening) expect(tag).toContain(' size="icon"');
    const members = [...text.matchAll(/<tp-toggle class="control" value="[a-z]+"[^>]*>/g)];
    expect(members).toHaveLength(2);
    for (const [tag] of members) expect(tag).not.toContain('size=');
  });

  it('registers its controls as Toolbar items and leaves Toggle groups to register themselves (`uwg-te-toggle-group-req-toolbar`, `node-009977`, `uwg-fl2-req-key-6`)', () => {
    registrations.length = 0;
    // The bar's shadow root: its built-in sets in display order.
    const shadow = stub('', [
      stub('div.controls', [
        stub('tp-input-group.zoom', [
          stub('tp-input.zoom-input.control'),
          stub('tp-menu.zoom-menu', [stub('tp-button.zoom-trigger')]),
        ]),
        stub('tp-button-group.group', [stub('tp-button.control')]),
        stub('tp-toggle-group.tools', [stub('tp-toggle.control'), stub('tp-toggle.control')]),
        stub('tp-toggle.control.lock'),
        stub('tp-toggle.control.palette'),
      ]),
    ]);
    const slotted = [
      stub('tp-button.publish'),
      stub('tp-toggle-group.layers', [stub('tp-toggle.grid'), stub('tp-toggle.rulers')]),
      stub('tp-button-group.history', [
        stub('tp-button.save'),
        stub('tp-toggle.pin'),
        stub('tp-toggle-group.nested', [stub('tp-toggle.nested-member')]),
      ]),
    ];
    const slot = { assignedElements: () => slotted };
    const bar = new TpFlowControls();
    Object.defineProperty(bar, 'renderRoot', {
      value: {
        querySelector: (selectors: string) =>
          selectors === 'slot.items' ? slot : shadow.querySelector(selectors),
        querySelectorAll: (selectors: string) => shadow.querySelectorAll(selectors),
      },
    });
    (bar as unknown as { updated(changed: Map<PropertyKey, unknown>): void }).updated(new Map());
    expect(registrations).toEqual([
      'item tp-input.zoom-input.control input',
      'item tp-button.zoom-trigger button',
      'item tp-button.control button',
      'item tp-toggle.control.lock button',
      'item tp-toggle.control.palette button',
      'item tp-button.publish button',
      'item tp-button.save button',
      'item tp-toggle.pin button',
    ]);
  });

  it('shows each zoom and run command’s shortcut as one menu Kbd group (`uwg-fl-req-key-4`, `ucl20-menu-q3`, `mp-kb-publish`)', () => {
    const text = rendered(['zoom', 'execute']);
    const hint = (...keys: string[]) =>
      `<tp-kbd-group data-menu-shortcut separator="none">${keys
        .map((key) => `<tp-kbd value=${key}></tp-kbd>`)
        .join('')}</tp-kbd-group>`;
    expect(text.match(/<tp-kbd-group[^>]*>.*?<\/tp-kbd-group>/g)).toEqual([
      hint('+'),
      hint('-'),
      hint('shift', '1'),
      hint('shift', '0'),
      hint('mod', 'Enter'),
    ]);
  });
});
