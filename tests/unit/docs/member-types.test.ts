import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// The manifest plugin is a build script (`.mjs`), loaded outside the type graph.
const entry: string = '../../../scripts/manifest/member-types.mjs';
const { scanChoices } = (await import(entry)) as {
  scanChoices(root: string): {
    values(text: string, module: string): string[] | undefined;
    definitions(text: string, module: string): { name: string; text: string }[];
    indexed(text: string, module: string): { text: string; module: string } | undefined;
  };
};

const root = mkdtempSync(join(tmpdir(), 'tp-member-types-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(join(root, 'src'));
writeFileSync(
  join(root, 'src/options.ts'),
  `export type Mode = 'default' | 'clone';
export interface FeedbackOptions {
  feedback?: Mode;
}
export interface ManagerOptions extends FeedbackOptions {
  /** A comment the docs leave out. */
  autoScroll?: boolean;
  sensors?: readonly string[];
}
export type ItemInput = ManagerOptions & { accept?: string | ((source: Element) => boolean) };
`,
);
const types = scanChoices(root);
const module = 'src/options.ts';

describe('manifest member types', () => {
  it('reads an indexed type as the type its property has, through bases and intersections', () => {
    expect(types.indexed("ManagerOptions['feedback']", module)).toEqual({
      text: 'Mode',
      module,
    });
    expect(types.indexed("ItemInput['accept'] | undefined", module)?.text).toBe(
      'string | ((source: Element) => boolean)',
    );
    expect(types.indexed("ManagerOptions['missing']", module)).toBeUndefined();
    expect(types.values('Mode', module)).toEqual(['default', 'clone']);
  });

  it('keeps a definition as its whole declaration, pretty-printed without comments', () => {
    const [definition] = types.definitions('ManagerOptions', module);
    expect(definition).toEqual({
      name: 'ManagerOptions',
      text: [
        'interface ManagerOptions extends FeedbackOptions {',
        '  autoScroll?: boolean;',
        '  sensors?: readonly string[];',
        '}',
      ].join('\n'),
    });
  });
});
