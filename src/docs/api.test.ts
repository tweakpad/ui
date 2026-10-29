import { describe, expect, it } from 'vitest';
import { elementApi, type Manifest } from './api.js';

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
