import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalog } from '../../../src/catalog.js';
import { widgetCatalog } from '../../../src/widgets/catalog.js';

const workspace = resolve(import.meta.dirname, '../../../src/stories/workspace');

/** Every `tp-*` tag the Atlas workspace sources use, markup or `createElement`. */
function usedTags(directory: string, found = new Set<string>()): Set<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) usedTags(path, found);
    else if (/\.(ts|js)$/u.test(entry.name))
      for (const [, tag] of readFileSync(path, 'utf8').matchAll(/['"<]\s*(tp-[a-z][a-z0-9-]*)/gu))
        found.add(tag!);
  }
  return found;
}

describe('complete catalog demo', () => {
  it('uses every component and widget of the library', () => {
    const used = usedTags(workspace);
    const missing = [...catalog, ...widgetCatalog]
      .map(([, tag]) => tag)
      .filter((tag) => !used.has(tag));
    expect(missing).toEqual([]);
  });
});
