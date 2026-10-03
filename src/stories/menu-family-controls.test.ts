import { describe, expect, it } from 'vitest';
import { configuredSource, sourceImports } from './menu-family-controls.js';

describe('standalone menu-family source', () => {
  it.each(['open', 'value'] as const)(
    'executes current %s properties and the same cancelable controlled owner',
    (lane) => {
      const current = lane === 'open' ? false : 'file';
      const next = lane === 'open' ? true : 'edit';
      const source = configuredSource(
        `${sourceImports}\n<tp-menu label="Commands"><tp-button slot="trigger">Open</tp-button></tp-menu>`,
        { [lane]: current, modal: false, sideOffset: 12, label: '</script>` ${unsafe}' },
        lane,
      );
      expect(source).toContain("import '@tweakpad/ui/register'");
      expect(source).toContain("import '@tweakpad/ui/styles.css'");
      expect(source.match(/<script/gu)).toHaveLength(1);
      const script = source.match(/<script type="module">([\s\S]+)<\/script>/u)![1]!;
      const executable = script.replace(/^\s*import .*;\s*$/gmu, '');
      let values: unknown[] = [];
      let destination: unknown;
      const target = {};
      new Function('html', 'render', 'document', executable)(
        (_strings: TemplateStringsArray, ...parts: unknown[]) => {
          values = parts;
          return parts;
        },
        (_result: unknown, node: unknown) => {
          destination = node;
        },
        { getElementById: () => target },
      );
      expect(destination).toBe(target);
      expect(values).toContain(false);
      expect(values).toContain(12);
      expect(values).toContain('</script>` ${unsafe}');
      const callback = values.find(
        (value): value is (this: Record<string, unknown>, event: unknown) => void =>
          typeof value === 'function',
      )!;
      const owner = { [lane]: current };
      callback.call(owner, { defaultPrevented: false, detail: { cancelled: false, value: next } });
      expect(owner[lane]).toBe(next);
      callback.call(owner, { defaultPrevented: true, detail: { cancelled: true, value: current } });
      expect(owner[lane]).toBe(next);
    },
  );
});
