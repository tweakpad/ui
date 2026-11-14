import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ApiTypes } from '../../../src/docs/api-types.js';
// The generator is a build script (`.mjs`), loaded outside the type graph.
const entry: string = '../../../scripts/manifest/api-types.mjs';
const { buildApiTypes } = (await import(entry)) as {
  buildApiTypes(input: { root: string; manifest: object; packageJson: object }): {
    types: ApiTypes;
    problems: string[];
  };
};

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A one-element project: `files` under the root, `src/index.ts` as its package entry. */
function project(files: Record<string, string>, type: string) {
  const root = mkdtempSync(join(tmpdir(), 'tp-api-types-'));
  roots.push(root);
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write(
    'tsconfig.build.json',
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'es2022',
        module: 'es2022',
        lib: ['es2022'],
        types: [],
      },
      include: ['src'],
    }),
  );
  for (const [path, text] of Object.entries(files)) write(path, text);
  const manifest = {
    modules: [
      {
        path: 'src/list.ts',
        declarations: [
          {
            kind: 'class',
            name: 'TpList',
            tagName: 'tp-list',
            members: [
              {
                kind: 'field',
                name: 'getItemOptions',
                type: { text: type },
                description: 'Per-item settings; the context is a `Position`.',
              },
            ],
          },
        ],
      },
    ],
  };
  const packageJson = {
    name: '@scope/ui',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  };
  return buildApiTypes({ root, manifest, packageJson });
}

const options = `
/** What one item of a list may do. */
export interface ItemOptions extends Base {
  /** Whether the item can be dragged. */
  draggable?: boolean;
}
/** The fields every item option set shares. */
export interface Base {
  id: string;
}
/** Where an item sits in its list. */
export type ItemContext<T> = Omit<Position<T>, 'internal'>;
/** A position in a list. */
export interface Position<T> {
  item: T;
  index: number;
  internal: boolean;
}
`;
const list = `
import type { ItemContext, ItemOptions } from './options.js';
export class TpList<T> {
  getItemOptions?: (item: T, context: ItemContext<T>) => ItemOptions;
}
`;

describe('api types from the compiler', () => {
  it('links the type names of a signature and follows bases, aliases and wrapped types', () => {
    const { types, problems } = project(
      {
        'src/options.ts': options,
        'src/list.ts': list,
        'src/index.ts': "export * from './options.js';\nexport { TpList } from './list.js';\n",
      },
      '((item: T, context: ItemContext<T>) => ItemOptions) | undefined',
    );
    expect(problems).toEqual([]);
    expect(types.elements['tp-list']).toEqual({
      ItemContext: 'src/options.ts#ItemContext',
      ItemOptions: 'src/options.ts#ItemOptions',
      // A code span of the description names a type too.
      Position: 'src/options.ts#Position',
    });
    expect(types.names['ItemOptions']).toBe('src/options.ts#ItemOptions');
    const card = types.symbols['src/options.ts#ItemOptions']!;
    expect(card.kind).toBe('interface');
    expect(card.declaration).toBe(
      'interface ItemOptions extends Base {\n  draggable?: boolean;\n}',
    );
    expect(card.documentation).toBe('What one item of a list may do.');
    expect(card.importFrom).toBe('@scope/ui');
    expect(card.refs).toEqual({ Base: 'src/options.ts#Base' });
    expect(types.symbols['src/options.ts#ItemContext']!.refs).toEqual({
      Position: 'src/options.ts#Position',
    });
    expect(types.symbols['src/options.ts#Position']).toBeDefined();
  });

  it('fails a reached type that no package entry exports', () => {
    const { problems } = project(
      {
        'src/options.ts': options,
        'src/list.ts': list,
        'src/index.ts':
          "export type { ItemOptions } from './options.js';\nexport { TpList } from './list.js';\n",
      },
      '((item: T, context: ItemContext<T>) => ItemOptions) | undefined',
    );
    expect(
      problems.some((problem) =>
        problem.startsWith('ItemContext (src/options.ts) is not exported'),
      ),
    ).toBe(true);
  });

  it('fails a reached type without a doc comment', () => {
    const { problems } = project(
      {
        'src/options.ts': options.replace('/** Where an item sits in its list. */\n', ''),
        'src/list.ts': list,
        'src/index.ts': "export * from './options.js';\nexport { TpList } from './list.js';\n",
      },
      '((item: T, context: ItemContext<T>) => ItemOptions) | undefined',
    );
    expect(problems).toEqual([
      'ItemContext (src/options.ts) has no doc comment; reached from tp-list.getItemOptions',
    ]);
  });
});
