import { describe, expect, it, vi } from 'vitest';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import { boldIcon } from '../../../icons/text-formatting.js';
import { templateMarkup } from '../../../template-markup.test.js';

/** Markup with its attribute quotes dropped, static and bound attributes alike. */
const markupOf = (template: unknown) => templateMarkup(template).replaceAll('"', '');
import type { TextEditorActivation } from '../focus.js';
import type { TextEditorToolActivation, TextEditorToolHandlers } from './controls.js';
import type { TextEditorToolbarItem } from './resolve.js';

/** The focus policy's answers, one distinct value per call, and the sources it was asked about. */
const policy = vi.hoisted(() => ({ asked: [] as TextEditorActivation[] }));
vi.mock('../focus.js', () => ({
  activationMovesFocus: (activation: TextEditorActivation) =>
    policy.asked.push(activation) as unknown as boolean,
}));

const { renderToolControl } = await import('./controls.js');

const SHORTCUT: KeyShortcut = { aria: 'Control+B', display: 'Ctrl+B', keys: ['Control', 'B'] };

function toolItem(patch: Partial<TextEditorToolbarItem> = {}): TextEditorToolbarItem {
  return {
    id: 'bold',
    kind: 'toggle',
    control: 'toggle',
    pair: false,
    label: 'Bold',
    text: 'Bold',
    icon: boldIcon,
    display: 'icon',
    active: false,
    value: null,
    disabled: false,
    focusableWhenDisabled: true,
    popup: null,
    expanded: false,
    shortcut: undefined,
    items: [],
    render: undefined,
    ...patch,
  };
}

/** Every binding of a template tree as `[name, value]`, in document order. */
function bindings(value: unknown): [string, unknown][] {
  const out: [string, unknown][] = [];
  const visit = (part: unknown) => {
    if (Array.isArray(part)) return part.forEach(visit);
    if (!part || typeof part !== 'object' || !('strings' in part) || !('values' in part)) return;
    const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
    values.forEach((entry, index) => {
      const name = /([.@?]?[\w-]+)=$/.exec(strings[index]!.trimEnd())?.[1];
      if (name) out.push([name, entry]);
      visit(entry);
    });
  };
  visit(value);
  return out;
}

function recordingHandlers() {
  const activations: TextEditorToolActivation[] = [];
  const handlers: TextEditorToolHandlers = {
    activate: (activation) => void activations.push(activation),
    menuOpenChange: vi.fn(),
    finalFocus: () => true,
  };
  return { handlers, activations };
}

/** A proposal as a Toggle or a Menu item hands it to its callback. */
function proposal<T>(value: T, sourceEvent: object) {
  return { detail: { value, sourceEvent }, preventDefault: vi.fn() };
}

const click = (detail: number) => ({ type: 'click', detail }) as unknown as Event;
const callback = (template: unknown, name: string, index = 0) =>
  bindings(template).filter(([key]) => key === name)[index]![1] as (
    this: unknown,
    ...args: unknown[]
  ) => void;

describe('text editor tool controls', () => {
  it('renders a button tool as a ghost icon Button of type button, labelled, with its shortcut (ucl16-button-props, uwg-te-req-a11y-2)', () => {
    const template = renderToolControl(
      toolItem({
        id: 'undo',
        kind: 'button',
        control: 'button',
        label: 'Undo',
        text: 'Undo',
        shortcut: SHORTCUT,
      }),
      recordingHandlers().handlers,
    );
    const markup = markupOf(template);
    expect(markup).toMatch(/^<tp-button variant=ghost size=icon type=button data-tool=undo/);
    expect(markup).toContain('>Undo</tp-button');
    expect(bindings(template)).toContainEqual([
      '.partContracts',
      { button: { hostProperties: { 'aria-keyshortcuts': 'Control+B' } } },
    ]);
  });

  it('renders a toggle tool as a ghost icon Toggle with controlled pressed state (ucl16-toggle-q1, uwg-te-req-evt-6)', () => {
    const template = renderToolControl(toolItem({ active: true }), recordingHandlers().handlers);
    expect(markupOf(template)).toMatch(/^<tp-toggle variant=ghost size=icon value= data-tool=bold/);
    expect(bindings(template)).toContainEqual(['.pressed', true]);
    expect(bindings(template)).toContainEqual(['.ariaLabel', 'Bold']);
  });

  it("vetoes a Toggle's own proposal and issues one trigger-press activation, its focus from the policy (uwg-te-req-evt-6, uwg-te-req-a11y-2, uwg-te-req-key-8)", () => {
    const { handlers, activations } = recordingHandlers();
    policy.asked.length = 0;
    const template = renderToolControl(toolItem(), handlers);
    const toggle = { localName: 'tp-toggle' };
    for (const source of [click(0), click(1)]) {
      const event = proposal(true, source);
      callback(template, '.onPressedChange').call(toggle, event);
      expect(event.preventDefault).toHaveBeenCalled();
    }
    expect(policy.asked).toEqual([
      { reason: 'trigger-press', modality: 'keyboard' },
      { reason: 'trigger-press', modality: 'pointer' },
    ]);
    expect(activations).toMatchObject([
      { tool: 'bold', reason: 'trigger-press', surface: 'toolbar', trigger: toggle, focus: 1 },
      { tool: 'bold', reason: 'trigger-press', surface: 'toolbar', trigger: toggle, focus: 2 },
    ]);
    expect(activations[0]).not.toHaveProperty('value');
  });

  it('renders an exclusive pair as one single-selection Toggle group whose pressed member releases itself (uwg-te-req-tools-1, ucl16-toggle-group-q2)', () => {
    const { handlers, activations } = recordingHandlers();
    const members = [toolItem({ id: 'superscript', active: true }), toolItem({ id: 'subscript' })];
    const pair = toolItem({
      id: 'superscript',
      control: 'toggle-group',
      pair: true,
      value: 'superscript',
      items: members,
    });
    const template = renderToolControl(pair, handlers);
    const markup = markupOf(template);
    expect(markup).toMatch(
      /^<tp-toggle-group variant=ghost size=icon data-tool=superscript label= \.value=/,
    );
    expect(markup.match(/<tp-toggle variant= size= value=(\w+) data-tool=\1/g)).toHaveLength(2);
    expect(bindings(template)).toContainEqual(['.value', ['superscript']]);
    const release = proposal(false, click(1));
    callback(template, '.onPressedChange').call({}, release);
    expect(release.preventDefault).toHaveBeenCalled();
    expect(activations.map((activation) => [activation.tool, activation.value])).toEqual([
      ['superscript', undefined],
    ]);
  });

  it('keeps the inline alignment value: the empty proposal is vetoed with no activation, a press activates the radio menu (uwg-te-req-tools-1, uwg-te-req-tools-4)', () => {
    const { handlers, activations } = recordingHandlers();
    const items = ['align-start', 'align-center'].map((id) => toolItem({ id, kind: 'button' }));
    const align = toolItem({
      id: 'align',
      kind: 'radio-menu',
      control: 'toggle-group',
      label: 'Align',
      value: 'align-start',
      items,
    });
    const template = renderToolControl(align, handlers);
    expect(markupOf(template)).toContain('label=Align');
    const empty = proposal(false, click(1));
    callback(template, '.onPressedChange', 0).call({}, empty);
    const press = proposal(true, click(1));
    callback(template, '.onPressedChange', 1).call({}, press);
    expect([
      empty.preventDefault.mock.calls.length,
      press.preventDefault.mock.calls.length,
    ]).toEqual([1, 1]);
    expect(activations.map((activation) => [activation.tool, activation.value])).toEqual([
      ['align', 'align-center'],
    ]);
  });

  it('renders menu tools as unportaled, non-modal Menus behind default-size triggers named by aria-label (uwg-te-req-pres-1, uwg-te-req-surfaces-6, uwg-te-req-a11y-6)', () => {
    const { handlers } = recordingHandlers();
    const items = [toolItem({ id: 'paragraph', kind: 'toggle' })];
    const template = renderToolControl(
      toolItem({
        id: 'block-type',
        kind: 'radio-menu',
        control: 'menu',
        label: 'Block type',
        items,
      }),
      handlers,
    );
    const markup = markupOf(template);
    expect(markup).toMatch(/^<tp-menu \.portal=false \.modal=false label=Block type/);
    expect(markup).toContain(
      '<tp-button slot=trigger variant=ghost size=default data-tool=block-type',
    );
    expect(markup).toContain('<tp-icon slot=icon-start');
    expect(markup).toContain('<tp-icon slot=icon-end');
    expect(bindings(template)).toContainEqual(['.ariaLabel', 'Block type']);
    expect(bindings(template).find(([name]) => name === '.finalFocus')![1]).toBe(
      handlers.finalFocus,
    );
    const openChange = callback(template, '@tp-open-change');
    const menu = {};
    openChange({ target: {}, currentTarget: menu });
    openChange({ target: menu, currentTarget: menu });
    expect(vi.mocked(handlers.menuOpenChange).mock.calls.map(([target]) => target)).toEqual([menu]);
  });

  it('exposes a dialog popup and a disabled state on the control (uwg-te-req-a11y-2, uwg-te-req-tools-2)', () => {
    const template = renderToolControl(
      toolItem({ id: 'link', kind: 'link', control: 'button', popup: 'dialog', disabled: true }),
      recordingHandlers().handlers,
    );
    expect(bindings(template)).toContainEqual([
      '.partContracts',
      {
        button: {
          hostProperties: {
            'aria-keyshortcuts': null,
            'aria-haspopup': 'dialog',
            'aria-expanded': 'false',
          },
        },
      },
    ]);
    expect(bindings(template)).toContainEqual(['.disabled', true]);
  });

  it('activates a color tool without its menu with no value (uwg-te-req-tools-4)', () => {
    const { handlers, activations } = recordingHandlers();
    const template = renderToolControl(
      toolItem({ id: 'highlight', kind: 'color', control: 'menu' }),
      handlers,
    );
    expect(markupOf(template)).not.toContain('<tp-menu');
    const button = {};
    callback(template, '@click')({ ...click(1), currentTarget: button });
    expect(activations).toMatchObject([
      { tool: 'highlight', reason: 'trigger-press', trigger: button },
    ]);
    expect(activations[0]).not.toHaveProperty('value');
  });

  it('renders a custom tool from its context (uwg-te-par-tools-1)', () => {
    const template = renderToolControl(
      toolItem({ id: 'stamp', kind: 'custom', control: 'custom', render: () => 'STAMP' }),
      recordingHandlers().handlers,
    );
    expect(markupOf(template)).toBe('<span class=toolbar-custom data-tool=stamp>STAMP</span>');
  });
});
