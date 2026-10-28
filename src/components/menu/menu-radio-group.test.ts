import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { menuGroupLabel } from './menu-radio-group.js';

/** A child element that may carry `data-menu-label`. */
const child = (label: boolean): Element =>
  ({ hasAttribute: (name: string) => label && name === 'data-menu-label' }) as unknown as Element;

describe('Menu radio group name', () => {
  it('is named by a data-menu-label child only while it has no label of its own', () => {
    const plain = child(false);
    const caption = child(true);
    expect(menuGroupLabel('', [plain, caption, child(true)])).toBe(caption);
    expect(menuGroupLabel('Density', [plain, caption])).toBeNull();
    expect(menuGroupLabel('', [plain])).toBeNull();
  });

  it('names the semantic group, never its host, so a menu holds group and no named generic', () => {
    const source = readFileSync(new URL('./menu-radio-group.ts', import.meta.url), 'utf8');
    expect(source).not.toContain("getAttribute('aria-label')");
    expect(source).toContain("'aria-label': this.label || undefined");
    expect(source).toContain('ariaLabelledByElements');
  });

  it('is labelled through `label` by every consumer in the library, its stories and docs', () => {
    const consumers = [
      '../../widgets/text-editor/tools/menu-items.ts',
      '../../widgets/text-editor/views/color-menu.ts',
      '../../widgets/emoji-picker/views/footer.ts',
      '../../stories/menu.stories.ts',
      '../../stories/menubar.stories.ts',
      '../../stories/workspace/pages/brief.ts',
      '../../stories/workspace/pages/work.ts',
      '../../../docs/components/menu.mdx',
      '../../../docs/components/menubar.mdx',
    ];
    for (const path of consumers) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8');
      expect(source, path).toContain('tp-menu-radio-group');
      expect(source, path).not.toMatch(/<tp-menu-radio-group[^>]*aria-label/u);
    }
  });
});
