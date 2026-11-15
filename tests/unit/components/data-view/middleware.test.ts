import { nothing } from 'lit';
import { describe, expect, it } from 'vitest';
import {
  DATA_VIEW_BUILT_IN_LAYERS,
  dataViewLayerCss,
  runDataViewHook,
} from '../../../../src/components/data-view/middleware.js';
import type {
  DataViewCellContext,
  DataViewColumn,
  DataViewMiddleware,
} from '../../../../src/components/data-view/types.js';

interface Row {
  id: string;
  name: string;
}

function cell(column: DataViewColumn<Row>, layers: DataViewMiddleware<Row>[]) {
  const context: DataViewCellContext<Row> = {
    row: { id: 'r1', name: 'Alder' },
    rowId: 'r1',
    rowIndex: 0,
    column,
    columnIndex: 0,
    value: 'Alder',
    text: 'Alder',
    selected: false,
    focused: false,
    pinned: null,
    renderText: () => runDataViewHook(layers, 'text', context),
  };
  return context;
}

describe('runDataViewHook', () => {
  it('runs layers outermost first, each wrapping what next returns', () => {
    const order: string[] = [];
    const layers: DataViewMiddleware<Row>[] = [
      { cell: (_, next) => (order.push('outer'), `[${String(next())}]`) },
      { cell: (_, next) => (order.push('inner'), `(${String(next())})`) },
      { cell: () => (order.push('base'), 'text') },
    ];
    expect(runDataViewHook(layers, 'cell', cell({ id: 'name', header: 'Name' }, layers))).toBe(
      '[(text)]',
    );
    expect(order).toEqual(['outer', 'inner', 'base']);
  });

  it('skips layers without the hook and stops at a layer that does not call next', () => {
    let reached = false;
    const layers: DataViewMiddleware<Row>[] = [
      { name: 'other', columnHeader: (_, next) => next() },
      { cell: () => 'replaced' },
      { cell: () => ((reached = true), 'built-in') },
    ];
    expect(runDataViewHook(layers, 'cell', cell({ id: 'name', header: 'Name' }, layers))).toBe(
      'replaced',
    );
    expect(reached).toBe(false);
  });

  it('renders nothing past the last layer', () => {
    const layers: DataViewMiddleware<Row>[] = [{ cell: (_, next) => next() }];
    expect(runDataViewHook(layers, 'cell', cell({ id: 'name', header: 'Name' }, layers))).toBe(
      nothing,
    );
  });

  it('lets a text layer reach column renderers through renderText', () => {
    const layers = [
      { text: (context: DataViewCellContext<Row>) => context.text.toUpperCase() },
      ...(DATA_VIEW_BUILT_IN_LAYERS as DataViewMiddleware<Row>[]),
    ];
    const column: DataViewColumn<Row> = {
      id: 'name',
      header: 'Name',
      render: (_, context) => `<b>${String(context.renderText())}</b>`,
    };
    expect(runDataViewHook(layers, 'cell', cell(column, layers))).toBe('<b>ALDER</b>');
  });

  it('uses a column renderer before the default text', () => {
    const layers = DATA_VIEW_BUILT_IN_LAYERS as DataViewMiddleware<Row>[];
    const column: DataViewColumn<Row> = { id: 'name', header: 'Name', render: (row) => row.id };
    expect(runDataViewHook(layers, 'cell', cell(column, layers))).toBe('r1');
  });
});

describe('dataViewLayerCss', () => {
  it('nests each layer with css under the root part, in order', () => {
    expect(
      dataViewLayerCss([
        { css: 'mark { color: red; }' },
        { name: 'none' },
        { css: '  ' },
        { css: '.a { color: blue; }' },
      ]),
    ).toBe(
      '[part~="data-view"] {\nmark { color: red; }\n}\n[part~="data-view"] {\n.a { color: blue; }\n}',
    );
  });

  it('drops css that would close the rule it is nested in', () => {
    expect(dataViewLayerCss([{ css: '} body { color: red; }' }])).toBe('');
  });
});
