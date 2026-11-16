import { readdirSync, readFileSync } from 'node:fs';
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

/** The one reorder engine: the only modules that decide and draw where a dragged item lands. */
const REORDER_ENGINE = [
  'src/foundation/drag-drop/reorder/engine.ts',
  'src/foundation/drag-drop/reorder/render.ts',
];

/** Every component and widget source. */
function componentSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(root + dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts')) files.push(path);
    }
  };
  walk('src/components');
  walk('src/widgets');
  return files;
}

describe('one reorder engine', () => {
  it('decides where a dragged item lands with the shared landing rules', () => {
    for (const path of REORDER_ENGINE) {
      const source = read(path);
      expect(source, `${path} uses the shared landing rules`).toMatch(/from '\.\.\/landing\.js'/);
      // A side decided against a shape's center, or a line placed by its own midpoint, is a second
      // definition of the rules.
      expect(source.match(/>=\s*\w+\.center\.[xy]/g), `${path} decides a side itself`).toBeNull();
      expect(
        source.match(/\(\w+\.(bottom|right|top|left)\s*\+\s*\w+\.(top|left)\)\s*\/\s*2/g),
        `${path} places a line itself`,
      ).toBeNull();
    }
  });

  it('is the only owner of a reorder: no component projects, lines up or glides one itself', () => {
    // A component that reorders is a container of the engine; the session, the projected order,
    // the side and slot, the landing line and the glides are the engine's, so a list and a tree
    // cannot drift apart.
    const owned =
      /from '[./]*foundation\/drag-drop\/landing\.js'|\b(arrayMove|landingSide|landingLine|landingTarget|dragMotion|placeRow)\b|'sort-displacement'/;
    for (const path of componentSources())
      expect(read(path).match(owned)?.[0] ?? null, `${path} runs a reorder of its own`).toBeNull();
  });

  it('serves every component that reorders', () => {
    for (const path of [
      'src/components/drag-drop-list/drag-drop-list.ts',
      'src/components/tree-view/reorder.ts',
    ]) {
      const source = read(path);
      expect(source, `${path} is a container of the reorder engine`).toMatch(
        /new ReorderContainer\b/,
      );
      expect(source, `${path} draws the reorder line`).toMatch(/\bplaceReorderLine\(/);
      expect(source, `${path} plays the reorder glides`).toMatch(/new ReorderGlides\(/);
    }
  });
});

/** Every module that starts drags of its own. */
const DRAGGING_MODULES = [
  'src/components/tree-view/reorder.ts',
  'src/components/drag-drop-list/drag-drop-list.ts',
  'src/foundation/drag-drop/reorder/engine.ts',
  'src/components/data-view/data-view.ts',
  'src/widgets/file-explorer/file-explorer.ts',
  'src/widgets/text-editor/views/block-drag.ts',
];

describe('one drag feedback', () => {
  it('shows every drag: no component turns it off and moves the dragged item itself', () => {
    for (const path of DRAGGING_MODULES) {
      const source = read(path);
      expect(source.match(/feedback:\s*'none'/g), `${path} turns the drag feedback off`).toBeNull();
      // Following the pointer, lifting and placing the dragged item belong to the drag feedback.
      expect(
        source.match(/\.style\.(translate|position|zIndex|transform)\s*=/g),
        `${path} positions a dragged item itself`,
      ).toBeNull();
    }
  });
});
