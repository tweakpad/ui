import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DRAG_COPY_OPACITY,
  DRAG_GHOST_OPACITY,
} from '../../../../src/foundation/drag-drop/feedback.js';
import { TOKEN_FAMILIES } from '../../../../src/presentation/tokens.js';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string) => readFileSync(root + path, 'utf8');

/** Sources that draw a dragged item or the place it holds. */
const DRAG_SOURCES = [
  'src/components/drag-drop-list/drag-drop-list.ts',
  'src/components/tree-view/reorder.ts',
  'src/components/tree-view/tree-view.ts',
  'src/components/data-view/data-view.ts',
  'src/presentation/recipes/drag-drop-list.ts',
  'src/presentation/recipes/tree-view.ts',
  'src/presentation/recipes/data-view.ts',
];

describe('the shared drag look', () => {
  it('reads both opacities from the theme tokens', () => {
    expect(DRAG_GHOST_OPACITY).toMatch(/^var\(--tp-opacity-drag-ghost, [\d.]+\)$/);
    expect(DRAG_COPY_OPACITY).toMatch(/^var\(--tp-opacity-drag-copy, [\d.]+\)$/);
    expect(TOKEN_FAMILIES.opacity).toEqual(
      expect.arrayContaining(['opacity-drag-ghost', 'opacity-drag-copy']),
    );
    const sheet = read('src/styles.css');
    expect(sheet).toMatch(/--tp-opacity-drag-ghost:\s*[\d.]+;/);
    expect(sheet).toMatch(/--tp-opacity-drag-copy:\s*[\d.]+;/);
  });

  it('is not set again by the components that drag', () => {
    for (const path of DRAG_SOURCES) {
      const source = read(path);
      // A literal opacity next to a drag state is a second definition of the look.
      expect(
        source.match(/(data-preview|data-dragging|drag-ghost|dragging)[^\n]*opacity:\s*'0?\.\d+'/g),
        `${path} sets a drag opacity literal`,
      ).toBeNull();
      expect(
        source.match(/style(?:\.setProperty\('opacity',|\.opacity\s*=)\s*'0?\.\d+'/g),
        `${path} writes an inline opacity literal`,
      ).toBeNull();
    }
  });
});

/** The components that reorder items and mark where a dragged one lands. */
const LANDING_SOURCES = [
  'src/components/drag-drop-list/drag-drop-list.ts',
  'src/components/drag-drop-list/list-controller.ts',
  'src/components/tree-view/reorder.ts',
];

describe('the shared landing rules', () => {
  it('decide where a dragged item lands in every component that reorders', () => {
    for (const path of LANDING_SOURCES) {
      const source = read(path);
      expect(source, `${path} uses the shared landing rules`).toMatch(
        /from '\.\.\/\.\.\/foundation\/drag-drop\/landing\.js'/,
      );
      // A side decided against a shape's center, or a line placed by its own midpoint, is a second
      // definition of the rules.
      expect(source.match(/>=\s*\w+\.center\.[xy]/g), `${path} decides a side itself`).toBeNull();
      expect(
        source.match(/\(\w+\.(bottom|right|top|left)\s*\+\s*\w+\.(top|left)\)\s*\/\s*2/g),
        `${path} places a line itself`,
      ).toBeNull();
    }
  });
});
