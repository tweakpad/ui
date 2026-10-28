import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { TpIcon } from '../components/icon/icon.js';
import { checkIcon } from '../icons/check.js';
import { minusIcon } from '../icons/minus.js';
import type { IconDefinition, IconPath } from '../icons/types.js';
import { nativeChoiceAppearance } from '../presentation/recipes/shared/selection-control.js';
import { importSpecifiers } from '../source-imports.test.js';
import { templateMarkup } from '../template-markup.test.js';

// Each case that reads the shared module imports it, so a missing module fails only those cases.

const src = new URL('../', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(src, file), 'utf8');

interface Drawn {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
}

/**
 * The start tags of markup in document order, each with its attributes unquoted. An attribute
 * without a value is left out: that is a template binding that wrote nothing.
 */
function elements(markup: string): Drawn[] {
  return [...markup.matchAll(/<([a-z]+)\b([^>]*?)\/?>/gu)].map(([, tag = '', inner = '']) => ({
    tag,
    attributes: Object.fromEntries(
      inner
        .trim()
        .split(/ (?=[\w:-]+=)/u)
        .filter(Boolean)
        .map((pair) => {
          const at = pair.indexOf('=');
          return [pair.slice(0, at), pair.slice(at + 1).replace(/^"(.*)"$/u, '$1')] as const;
        })
        .filter(([, value]) => value !== ''),
    ),
  }));
}

class IconProbe extends TpIcon {}
beforeAll(() => {
  customElements.define('tp-icon-graphic-probe', IconProbe);
});

/** What tp-icon renders for a definition. */
function rendered(icon: IconDefinition): Drawn[] {
  const probe = new IconProbe();
  probe.icon = icon;
  return elements(templateMarkup((probe as unknown as { render(): unknown }).render()));
}

/** What the native checkbox's mark draws in a checked (or indeterminate) box. */
function masked(state: 'checked' | 'indeterminate'): Drawn[] {
  const rules = nativeChoiceAppearance('checkbox', 'input');
  const mark = rules.find(({ selector = '' }) =>
    selector.endsWith(
      state === 'checked' ? ':is(:checked, :indeterminate)::after' : ':indeterminate::after',
    ),
  );
  const value = String(mark?.declarations['mask-image']);
  const match = /^url\("data:image\/svg\+xml,([^"]*)"\)$/u.exec(value);
  return elements(decodeURIComponent(match?.[1] ?? ''));
}

/** Drawn elements without the given root attributes. */
function withoutRoot(drawn: Drawn[], names: readonly string[]): Drawn[] {
  return drawn.map((element, index) =>
    index === 0
      ? {
          tag: element.tag,
          attributes: Object.fromEntries(
            Object.entries(element.attributes).filter(([name]) => !names.includes(name)),
          ),
        }
      : element,
  );
}

// The part name and the hiding from the accessibility tree and focus belong to the element;
// a standalone image needs its namespace. Everything else is how the definition is drawn.
const elementOnly = ['part', 'aria-hidden', 'focusable'];
const imageOnly = ['xmlns'];

describe('icon graphic attributes', () => {
  it('the check mark draws its icons with the root and path attributes that tp-icon renders (`ucl22-icon-anatomy-r1-c1-p`, `dcp-roles-table-r5`)', () => {
    for (const [icon, state] of [
      [checkIcon, 'checked'],
      [minusIcon, 'indeterminate'],
    ] as const) {
      const drawn = rendered(icon);
      const mask = masked(state);
      expect(drawn.map(({ tag }) => tag)).toEqual(['svg', ...icon.paths.map(() => 'path')]);
      expect(mask.map(({ tag }) => tag)).toEqual(drawn.map(({ tag }) => tag));
      expect(withoutRoot(mask, imageOnly)).toEqual(withoutRoot(drawn, elementOnly));
      expect(drawn[0]?.attributes).toMatchObject({
        part: 'icon-graphic',
        'aria-hidden': 'true',
        focusable: 'false',
      });
      expect(mask[0]?.attributes).toMatchObject({ xmlns: 'http://www.w3.org/2000/svg' });
    }
  });

  it('draws a definition unfilled, stroked in the current text color with round caps and joins, and writes each path member it sets (`ucl22-icon-q3`, `ucl22-icon-anatomy-r1-c1-p`)', async () => {
    const { iconGraphicAttributes, iconPathAttributes } = await import('./icon-graphic.js');
    expect(iconGraphicAttributes(checkIcon)).toEqual({
      viewBox: checkIcon.viewBox,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    expect(withoutRoot(rendered(checkIcon), elementOnly)[0]?.attributes).toEqual(
      iconGraphicAttributes(checkIcon),
    );

    // Every path member is set, so a member added to IconPath has to be set here too.
    const full: Required<IconPath> = {
      d: 'M1 1h14v14H1z',
      fill: 'currentColor',
      stroke: 'none',
      strokeWidth: 1.5,
      fillRule: 'evenodd',
      clipRule: 'evenodd',
    };
    const bare: IconPath = { d: 'M2 2h4' };
    const icon: IconDefinition = { viewBox: '0 0 16 16', paths: [full, bare] };
    expect(iconPathAttributes(full)).toEqual({
      d: full.d,
      fill: full.fill,
      stroke: full.stroke,
      'stroke-width': full.strokeWidth,
      'fill-rule': full.fillRule,
      'clip-rule': full.clipRule,
    });
    const paths = rendered(icon).slice(1);
    expect(paths.map(({ attributes }) => attributes)).toEqual(
      icon.paths.map((path) =>
        Object.fromEntries(
          Object.entries(iconPathAttributes(path))
            .filter(([, value]) => value !== undefined)
            .map(([name, value]) => [name, String(value)]),
        ),
      ),
    );
    expect(Object.keys(paths[1]?.attributes ?? {})).toEqual(['d']);
  });

  it('tp-icon and the check mark take the drawing attributes from one module (`ucl22-icon-anatomy-r1-c1-p`, `dcp-roles-table-r5`)', async () => {
    const files = ['components/icon/icon.ts', 'presentation/recipes/shared/selection-control.ts'];
    const offenders = files.flatMap((file) => {
      const source = read(file);
      const targets = importSpecifiers(source)
        .filter((specifier): specifier is string => specifier?.startsWith('.') === true)
        .map((specifier) => relative(src, join(src, dirname(file), specifier)));
      return [
        !targets.includes('foundation/icon-graphic.js') && `${file} does not import the module`,
        // Neither writes a root drawing value or maps a path member itself.
        /\b(?:fill|stroke|stroke-linecap|stroke-linejoin)="/u.test(source) &&
          `${file} writes a root drawing value`,
        /\.(?:strokeWidth|fillRule|clipRule)\b/u.test(source) && `${file} maps a path member`,
      ].filter(Boolean);
    });
    expect(offenders).toEqual([]);
    const shared = await import('./icon-graphic.js');
    expect(Object.keys(shared).sort()).toEqual(['iconGraphicAttributes', 'iconPathAttributes']);
  });
});
