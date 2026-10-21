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
