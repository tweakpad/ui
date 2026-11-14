import { describe, expect, it } from 'vitest';
import {
  elementApi,
  repeatedValues,
  unlistedChoices,
  type Manifest,
} from '../../../src/docs/api.js';
import {
  reachedSymbols,
  signatureTokens,
  symbolCard,
  type ApiTypes,
} from '../../../src/docs/api-types.js';

const manifest = (inheritedFrom: string) =>
  ({
    schemaVersion: '1.0.0',
    modules: [
      {
        kind: 'javascript-module',
        path: 'src/example.ts',
        declarations: [
          {
            kind: 'class',
            name: 'TpExample',
            tagName: 'tp-example',
            members: [
              { kind: 'field', name: 'own', description: 'Declared here.' },
              {
                kind: 'field',
                name: 'shared',
                description: 'From the base.',
                inheritedFrom: { name: inheritedFrom },
              },
              { kind: 'method', name: 'reset', inheritedFrom: { name: inheritedFrom } },
            ],
            attributes: [{ name: 'shared-attribute', inheritedFrom: { name: inheritedFrom } }],
          },
        ],
      },
    ],
  }) as unknown as Manifest;

describe('element API rows', () => {
  it('leaves out what a shared library base declares', () => {
    const api = elementApi(manifest('TpElement'), 'tp-example')!;
    expect(api.properties.map((row) => row.name)).toEqual(['own']);
    expect(api.methods).toEqual([]);
    expect(api.attributes).toEqual([]);
  });

  it("lists what the Motion › Text base declares as each element's own", () => {
    const api = elementApi(manifest('TextRevealElement'), 'tp-example')!;
    expect(api.properties.map((row) => row.name)).toEqual(['own', 'shared']);
    expect(api.methods.map((row) => row.name)).toEqual(['reset']);
    expect(api.attributes.map((row) => row.name)).toEqual(['shared-attribute']);
  });
});

const control = {
  schemaVersion: '1.0.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/control.ts',
      declarations: [
        {
          kind: 'class',
          name: 'TpControl',
          tagName: 'tp-control',
          members: [
            {
              kind: 'field',
              name: 'value',
              attribute: 'value',
              type: { text: 'string' },
              inheritedFrom: { name: 'TpFormElement' },
            },
            { kind: 'field', name: 'items', type: { text: 'readonly Item[]' } },
            { kind: 'field', name: 'defaultItems', type: { text: 'readonly Item[] | undefined' } },
            {
              kind: 'method',
              name: 'setValue',
              description: 'Sets the value.',
              parameters: [
                { name: 'value', type: { text: 'string' } },
                { name: 'reason', default: "'programmatic'", type: { text: 'ChangeReason' } },
              ],
              return: { type: { text: 'boolean' } },
            },
          ],
          attributes: [
            {
              name: 'value',
              fieldName: 'value',
              type: { text: 'string' },
              inheritedFrom: { name: 'TpFormElement' },
            },
            { name: 'name', fieldName: 'name', inheritedFrom: { name: 'TpFormElement' } },
            {
              name: 'mode',
              fieldName: 'mode',
              type: { text: 'Mode', values: ['a', 'b'] },
              default: "'a'",
              description: 'The mode.',
            },
            {
              name: 'default-mode',
              fieldName: 'defaultMode',
              type: { text: 'Mode | undefined', values: ['a', 'b'] },
              description: 'Starting mode.',
            },
            {
              name: 'size',
              fieldName: 'size',
              type: { text: 'Size' },
              description: 'Size.',
            },
          ],
        },
      ],
    },
  ],
} as unknown as Manifest;

describe('API table rules', () => {
  const api = elementApi(control, 'tp-control')!;

  it("lists a form control's value and merges starting values into their setting", () => {
    expect(api.formControl).toBe(true);
    expect(api.attributes.map((row) => [row.name, row.type, row.default, row.values])).toEqual([
      ['value', 'string', '', undefined],
      ['mode', 'Mode', "'a'", ['a', 'b']],
      ['size', 'Size', '', undefined],
    ]);
    expect(api.attributes[1]!.description).toBe('The mode. Uncontrolled start: `default-mode`.');
    expect(api.properties.map((row) => row.name)).toEqual(['items']);
    expect(api.properties[0]!.description).toContain('`defaultItems`');
  });

  it('lists one Properties row per property, attribute-backed first, with its control', () => {
    expect(
      api.members.map((row) => [row.name, row.attribute ?? null, row.type, row.control]),
    ).toEqual([
      ['value', 'value', 'string', 'text'],
      ['mode', 'mode', 'Mode', 'select'],
      ['size', 'size', 'Size', null],
      ['items', null, 'readonly Item[]', null],
    ]);
  });

  it('shows a lone callback without the parentheses that grouped it with undefined', () => {
    const callback = structuredClone(control) as unknown as {
      modules: { declarations: { members: unknown[] }[] }[];
    };
    callback.modules[0]!.declarations[0]!.members.push({
      kind: 'field',
      name: 'renderItem',
      type: { text: '((item: Item, index: number) => unknown) | undefined' },
      description: 'Renders a row.',
    });
    const row = elementApi(callback as unknown as Manifest, 'tp-control')!.members.find(
      (entry) => entry.name === 'renderItem',
    )!;
    expect(row.type).toBe('(item: Item, index: number) => unknown');
    expect(row.control).toBeNull();
  });

  it('types method signatures; a defaulted parameter is optional', () => {
    expect(api.methods[0]!.signature).toBe('setValue(value: string, reason?: ChangeReason)');
    expect(api.methods[0]!.returns).toBe('boolean');
  });

  it('accepts a named type that opens a card', () => {
    const types: ApiTypes = {
      elements: { 'tp-control': { Size: 'src/control.ts#Size' } },
      symbols: {},
    };
    expect(unlistedChoices(api, types)).toEqual([]);
  });

  it('reports a description that repeats the values the type lists', () => {
    const repeated = structuredClone(control) as unknown as Manifest;
    const mode = (
      repeated.modules[0]!.declarations![0]!.attributes as { name: string; description: string }[]
    ).find((attribute) => attribute.name === 'mode')!;
    mode.description = 'Either `a` or `b`.';
    expect(repeatedValues(elementApi(repeated, 'tp-control')!)).toEqual([
      'mode: the description repeats the values the type lists',
    ]);
    expect(repeatedValues(api)).toEqual([]);
  });

  it('reports a named attribute type whose values are not listed', () => {
    expect(unlistedChoices(api)).toEqual([
      'attribute size: Size is not defined in the docs; list its values or use a primitive type',
    ]);
  });
});

describe('type cards', () => {
  const types: ApiTypes = {
    elements: { 'tp-list': { Context: 'a.ts#Context', Options: 'a.ts#Options' } },
    symbols: {
      'a.ts#Options': {
        name: 'Options',
        kind: 'interface',
        declaration: 'interface Options {\n  context: Context;\n}',
        documentation: 'How one item behaves.',
        importFrom: '@tweakpad/ui/list',
        refs: { Context: 'a.ts#Context' },
      },
    },
  };

  it('makes each type name of a signature its own token, carrying its card', () => {
    const tokens = signatureTokens(types, 'tp-list', '(context: Context) => Options | Other');
    expect(tokens.filter((token) => token.ref).map((token) => [token.text, token.ref])).toEqual([
      ['Context', 'a.ts#Context'],
      ['Options', 'a.ts#Options'],
    ]);
    expect(tokens.map((token) => token.text).join('')).toBe(
      '(context: Context) => Options | Other',
    );
  });

  it('gives a card its declaration lines, nested refs and import line', () => {
    const card = symbolCard(types, 'a.ts#Options')!;
    expect(card.lines).toHaveLength(3);
    expect(card.lines[1]!.find((token) => token.ref)?.ref).toBe('a.ts#Context');
    expect(card.importLine).toBe("import type { Options } from '@tweakpad/ui/list';");
    expect(symbolCard(types, 'a.ts#Missing')).toBeUndefined();
  });

  it('collects the cards a page reaches, through the cards themselves', () => {
    expect(reachedSymbols(types, ['tp-list'])).toEqual(['a.ts#Options']);
  });
});
