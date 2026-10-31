import { describe, expect, it, vi } from 'vitest';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import { boldIcon, italicIcon } from '../../../icons/text-formatting.js';
import { templateMarkup } from '../../../template-markup.test.js';
import type { TextEditorActivation } from '../focus.js';
import type { TextEditorToolActivation, TextEditorToolHandlers } from './controls.js';
import type { TextEditorToolbarItem } from './resolve.js';

/** The focus policy's answers, one distinct value per call, and the sources it was asked about. */
const policy = vi.hoisted(() => ({ asked: [] as TextEditorActivation[] }));
vi.mock('../focus.js', () => ({
  activationMovesFocus: (activation: TextEditorActivation) =>
    policy.asked.push(activation) as unknown as boolean,
}));

const { renderToolMenuItems, renderToolMenuContent, submenuIcon } = await import('./menu-items.js');

const SHORTCUT: KeyShortcut = { aria: 'Control+B', display: 'Ctrl+B', keys: ['Control', 'B'] };
const markupOf = (template: unknown) => templateMarkup(template).replaceAll('"', '');

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

/** The values bound to `name` in a template tree, in document order. */
function bound(value: unknown, name: string): unknown[] {
  const out: unknown[] = [];
  const visit = (part: unknown) => {
    if (Array.isArray(part)) return part.forEach(visit);
    if (!part || typeof part !== 'object' || !('strings' in part) || !('values' in part)) return;
    const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
    values.forEach((entry, index) => {
      if (strings[index]!.trimEnd().endsWith(` ${name}=`)) out.push(entry);
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

type Callback = (this: unknown, event: unknown) => void;
const proposal = (value: unknown) => ({
  detail: { value, sourceEvent: { type: 'click', detail: 1 } },
  preventDefault: vi.fn(),
});

describe('text editor tool menu entries', () => {
  it('V-588: keeps each entry callback across renders of the same tools, so a render updates no entry', () => {
    const { handlers, activations } = recordingHandlers();
    const items = () => [
      toolItem(),
      toolItem({ id: 'undo', kind: 'button', control: 'button' }),
      toolItem({
        id: 'heading',
        kind: 'radio-menu',
        control: 'menu',
        value: 'h1',
        items: [toolItem({ id: 'h1' }), toolItem({ id: 'h2' })],
      }),
    ];
    const callbacks = (template: unknown) =>
      ['.onCheckedChange', '.onClick', '.onValueChange'].flatMap((name) => bound(template, name));
    const first = callbacks(renderToolMenuItems(items(), handlers));
    expect(first).toHaveLength(3);
    expect(callbacks(renderToolMenuItems(items(), handlers))).toEqual(first);
    for (const [index, value] of callbacks(renderToolMenuItems(items(), handlers)).entries())
      expect(value).toBe(first[index]);
    // A kept callback still activates its own tool.
    (first[0] as Callback).call({}, proposal(true));
    (first[2] as Callback).call({}, proposal('h2'));
    expect(activations.map(({ tool, value }) => [tool, value])).toEqual([
      ['bold', undefined],
      ['heading', 'h2'],
    ]);
  });

  it('renders a button tool as a menu item with its icon and menu shortcut hint (ucl20-menu-q3, uwg-te-req-a11y-2)', () => {
    const markup = markupOf(
      renderToolMenuItems(
        [
          toolItem({
            id: 'undo',
            kind: 'button',
            control: 'button',
            label: 'Undo',
            shortcut: SHORTCUT,
          }),
        ],
        recordingHandlers().handlers,
      ),
    );
    expect(markup).toMatch(/^<tp-menu-item value=undo data-tool=undo variant=\S* \?inset=false/);
    expect(markup).toContain(
      '<tp-icon .icon=[object Object]></tp-icon>Undo<tp-kbd-group data-menu-shortcut',
    );
  });

  it('activates every entry with item-press on the toolbar surface, its focus from the policy, and closes its menu (uwg-te-req-tools-3, uwg-te-req-a11y-6)', () => {
    const { handlers, activations } = recordingHandlers();
    policy.asked.length = 0;
    const template = renderToolMenuItems(
      [toolItem({ id: 'undo', kind: 'button', control: 'button' })],
      handlers,
    );
    expect(bound(template, '.closeOnClick')).toEqual([true]);
    const entry = {};
    const event = { type: 'click', detail: 1 };
    (bound(template, '.onClick')[0] as Callback).call(entry, event);
    expect(policy.asked).toEqual([{ reason: 'item-press' }]);
    expect(activations).toEqual([
      {
        tool: 'undo',
        reason: 'item-press',
        surface: 'toolbar',
        sourceEvent: event,
        trigger: entry,
        focus: 1,
      },
    ]);
  });

  it('renders a toggle tool as a checked checkbox item whose proposal is vetoed before it activates (uwg-te-req-evt-6)', () => {
    const { handlers, activations } = recordingHandlers();
    const template = renderToolMenuItems([toolItem({ active: true })], handlers);
    expect(markupOf(template)).toMatch(/^<tp-menu-checkbox-item value=bold data-tool=bold/);
    expect(bound(template, '.checked')).toEqual([true]);
    const event = proposal(false);
    (bound(template, '.onCheckedChange')[0] as Callback).call({}, event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(activations.map((activation) => [activation.tool, activation.reason])).toEqual([
      ['bold', 'item-press'],
    ]);
  });

  it('gives an exclusive pair two checkbox items (uwg-te-req-tools-1)', () => {
    const members = [toolItem({ id: 'superscript' }), toolItem({ id: 'subscript' })];
    const pair = toolItem({
      id: 'superscript',
      control: 'toggle-group',
      pair: true,
      items: members,
    });
    const markup = markupOf(renderToolMenuItems([pair], recordingHandlers().handlers));
    expect(markup.match(/<tp-menu-checkbox-item value=(\w+)/g)).toEqual([
      '<tp-menu-checkbox-item value=superscript',
      '<tp-menu-checkbox-item value=subscript',
    ]);
  });

  it('gives a radio menu a submenu whose radio group activates it with the chosen item (uwg-te-req-tools-4)', () => {
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
    const template = renderToolMenuItems([align], handlers);
    const markup = markupOf(template);
    expect(markup).toMatch(
      /^<tp-menu \.portal=false \.modal=false label=Align><tp-button slot=trigger variant=ghost/,
    );
    expect(markup).toContain('<tp-menu-radio-group .label=Align .value=align-start');
    expect(markup.match(/<tp-menu-radio-item value=[\w-]+/g)).toHaveLength(2);
    const group = {};
    const event = proposal('align-center');
    (bound(template, '.onValueChange')[0] as Callback).call(group, event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(activations).toMatchObject([
      { tool: 'align', value: 'align-center', reason: 'item-press', trigger: group },
    ]);
  });

  it('gives a menu a submenu of its entries, and its content renders the entries (uwg-te-par-tools-1)', () => {
    const items = [
      toolItem({ id: 'bullet-list' }),
      toolItem({ id: 'ordered-list', icon: italicIcon }),
    ];
    const list = toolItem({ id: 'list-type', kind: 'menu', control: 'menu', label: 'List', items });
    expect(markupOf(renderToolMenuItems([list], recordingHandlers().handlers))).toMatch(
      /^<tp-menu \.portal=false \.modal=false label=List>/,
    );
    const content = markupOf(renderToolMenuContent(list, recordingHandlers().handlers));
    expect(content.match(/<tp-menu-checkbox-item value=[\w-]+/g)).toHaveLength(2);
  });

  it('separates the further item groups of a menu with a separator (uwg-te-tab-tools-r11)', () => {
    const items = [
      toolItem({ id: 'superscript' }),
      toolItem({ id: 'subscript' }),
      toolItem({ id: 'clear-formatting', kind: 'button', control: 'button', separated: true }),
    ];
    const more = toolItem({ id: 'more', kind: 'menu', control: 'menu', label: 'More', items });
    const content = markupOf(renderToolMenuContent(more, recordingHandlers().handlers));
    expect(content.match(/<tp-separator>|data-tool=[\w-]+/g)).toEqual([
      'data-tool=superscript',
      'data-tool=subscript',
      '<tp-separator>',
      'data-tool=clear-formatting',
    ]);
  });

  it('insets entries without an icon (ucl-fl2-menu-props-inset)', () => {
    const template = renderToolMenuItems(
      [toolItem({ id: 'plain', kind: 'button', control: 'button', icon: undefined })],
      recordingHandlers().handlers,
    );
    expect(markupOf(template)).toContain('?inset=true');
  });

  it('shows a destructive tool as a destructive item', () => {
    const items = [
      toolItem({ id: 'delete-block', kind: 'button', control: 'button', tone: 'destructive' }),
      toolItem({ id: 'duplicate-block', kind: 'button', control: 'button', tone: 'default' }),
    ];
    const values = bound(renderToolMenuItems(items, recordingHandlers().handlers), 'variant');
    expect(values.slice(0, 2)).toEqual(['destructive', expect.anything()]);
    expect(values[1]).not.toBe('destructive');
  });

  it("gives a radio menu's trigger without an icon the checked item's icon", () => {
    const items = [
      toolItem({ id: 'paragraph', kind: 'button', icon: boldIcon }),
      toolItem({ id: 'heading-1', kind: 'button', icon: italicIcon }),
    ];
    const turnInto = toolItem({ id: 'turn-into', kind: 'radio-menu', icon: undefined, items });
    expect(submenuIcon({ ...turnInto, value: 'heading-1' })).toBe(italicIcon);
    expect(submenuIcon({ ...turnInto, value: null })).toBeUndefined();
    expect(submenuIcon({ ...turnInto, icon: boldIcon, value: 'heading-1' })).toBe(boldIcon);
  });

  it('binds no final focus and reports no open change on nested menus (uwg-te-req-surfaces-6, uwg-te-req-a11y-6)', () => {
    const list = toolItem({ id: 'list-type', kind: 'menu', control: 'menu', items: [toolItem()] });
    const template = renderToolMenuItems([list], recordingHandlers().handlers);
    expect([bound(template, '.finalFocus'), bound(template, '@tp-open-change')]).toEqual([[], []]);
  });
});
