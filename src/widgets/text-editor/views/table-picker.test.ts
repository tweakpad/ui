import { describe, expect, it, vi } from 'vitest';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  TABLE_PICKER_DEFAULT,
  TABLE_PICKER_GRID,
  tablePickerValue,
  TextEditorTablePicker,
  type TablePickerHost,
} from './table-picker.js';

function setup(disabled = false) {
  const insert = vi.fn();
  const transients: string[] = [];
  const host: TablePickerHost = {
    strings: () => textEditorStrings,
    disabled: () => disabled,
    insert,
    restoreFocus: () => false,
    requestUpdate: vi.fn(),
    transientOpened: () => void transients.push('opened'),
    transientClosed: () => void transients.push('closed'),
  };
  return { host: { insert, transients }, picker: new TextEditorTablePicker(host) };
}

const anchor = {} as Element;

describe('table picker values', () => {
  it('keeps integers within 1 to 100 rows and 1 to 20 columns', () => {
    expect(TABLE_PICKER_GRID).toBe(8);
    expect(tablePickerValue('rows', 0)).toBe(1);
    expect(tablePickerValue('rows', 250)).toBe(100);
    expect(tablePickerValue('columns', 25)).toBe(20);
    expect(tablePickerValue('columns', 4.6)).toBe(5);
    expect(tablePickerValue('rows', Number.NaN)).toBe(TABLE_PICKER_DEFAULT);
  });
});

describe('TextEditorTablePicker', () => {
  it('opens at 3 by 3 every time', () => {
    const { picker } = setup();
    expect(picker.show({ anchor, surface: 'toolbar', opener: null })).toBe(true);
    expect(picker.open).toBe(true);
    picker.hover(5, 6);
    expect(picker.size).toEqual({ rows: 5, columns: 6 });
    picker.close();
    picker.show({ anchor, surface: 'toolbar', opener: null });
    expect(picker.size).toEqual({ rows: 3, columns: 3 });
  });

  it('inserts the hovered size with the surface that showed it and closes', () => {
    const { host, picker } = setup();
    picker.show({ anchor, surface: 'slash', opener: null });
    picker.hover(2, 4);
    const click = new Event('click');
    picker.insert(click, null);
    expect(host.insert).toHaveBeenCalledWith({ rows: 2, columns: 4 }, 'slash', click, null);
    expect(picker.open).toBe(false);
    // A closed picker inserts nothing.
    picker.insert(click, null);
    expect(host.insert).toHaveBeenCalledTimes(1);
  });

  it('does not open while the widget is disabled', () => {
    const { picker } = setup(true);
    expect(picker.show({ anchor, surface: 'toolbar', opener: null })).toBe(false);
    expect(picker.open).toBe(false);
  });

  it('renders a popover with the grid only while open', () => {
    const { picker } = setup();
    const closed = picker.render();
    expect(closed.values).toContain(false);
    picker.show({ anchor, surface: 'toolbar', opener: null });
    const open = picker.render();
    expect(open.values).toContain(true);
    expect(open.values).toContain(anchor);
  });
});

describe('table picker focus', () => {
  /** Every value of a template tree, nested templates and directive arguments included. */
  const valuesOf = (value: unknown, out: unknown[] = []): unknown[] => {
    if (Array.isArray(value)) value.forEach((entry) => valuesOf(entry, out));
    else if (value && typeof value === 'object' && 'values' in value) {
      for (const entry of (value as { values: unknown[] }).values) {
        out.push(entry);
        valuesOf(entry, out);
      }
    }
    return out;
  };

  it('focuses the Rows field input, and nothing until that field has rendered', () => {
    const { picker } = setup();
    picker.show({ anchor, surface: 'slash', opener: null });
    const values = valuesOf(picker.render());
    const initialFocus = values.find(
      (value): value is () => unknown => typeof value === 'function' && value.length === 0,
    )!;
    // The Rows field renders with the opening, after the popover's initial focus.
    expect(initialFocus()).toBe(false);
    const bindRows = values.find(
      (value): value is (element: unknown) => void =>
        typeof value === 'function' && value.length === 1 && /rowsInput/.test(String(value)),
    );
    const input = { focus: vi.fn(), select: vi.fn(), value: '' };
    bindRows?.({ inputElement: input });
    // Rendered before its NumberField owner showed the size: focused, selected later.
    expect(initialFocus()).toBe(input);
    expect(input.select).not.toHaveBeenCalled();
    input.value = '3';
    expect(initialFocus()).toBe(input);
    // The default size is selected, so typing replaces it.
    expect(input.select).toHaveBeenCalledTimes(1);
  });

  it('keeps its body until the popover has closed, so that focus inside it can return', () => {
    const { picker } = setup();
    picker.show({ anchor, surface: 'slash', opener: null });
    picker.close();
    const closing = valuesOf(picker.render());
    expect(closing).toContain(false);
    expect(closing).toContain(anchor);
    const complete = closing.find(
      (value): value is (event: unknown) => void =>
        typeof value === 'function' && /#shown = null/.test(String(value)),
    )!;
    const target = {};
    complete({ target, currentTarget: target, detail: { open: false } });
    expect(valuesOf(picker.render())).not.toContain(anchor);
  });
});

describe('table picker as a transient surface (uwg-te-req-surfaces-6)', () => {
  it('reports its opening, so that another surface closes, and its closing', () => {
    const { host, picker } = setup();
    picker.show({ anchor, surface: 'toolbar', opener: null });
    expect(host.transients).toEqual(['opened']);
    picker.close();
    picker.close();
    expect(host.transients).toEqual(['opened', 'closed']);
    picker.show({ anchor, surface: 'toolbar', opener: null });
    picker.insert(new Event('click'), null);
    expect(host.transients).toEqual(['opened', 'closed', 'opened', 'closed']);
  });
});

describe('table picker open lane (uwg-te-tab-reasons r12, r13)', () => {
  it('records the opening reason and each closing reason, and passes its opening reason on', () => {
    const lanes: unknown[] = [];
    const opened: unknown[] = [];
    const picker = new TextEditorTablePicker({
      strings: () => textEditorStrings,
      disabled: () => false,
      insert: vi.fn(),
      restoreFocus: () => false,
      requestUpdate: vi.fn(),
      transientOpened: (_owner, close, reason) => void opened.push([close, reason]),
      lane: (open, reason) => void lanes.push({ open, reason }),
    });
    picker.show({ anchor, surface: 'toolbar', opener: null, reason: 'trigger-press' });
    picker.close('escape-key');
    picker.show({ anchor, surface: 'slash', opener: null, reason: 'item-press' });
    picker.insert(new Event('click'), null);
    picker.show({ anchor, surface: 'api', opener: null });
    // Another surface opening closes it through the register with the reason that opens it.
    (opened.at(-1) as [(reason?: string) => void, string])[0]('hotkey');
    expect(lanes).toEqual([
      { open: true, reason: 'trigger-press' },
      { open: false, reason: 'escape-key' },
      { open: true, reason: 'item-press' },
      { open: false, reason: 'item-press' },
      { open: true, reason: 'imperative-action' },
      { open: false, reason: 'hotkey' },
    ]);
    expect(opened.map((entry) => (entry as unknown[])[1])).toEqual([
      'trigger-press',
      'item-press',
      'imperative-action',
    ]);
  });
});
