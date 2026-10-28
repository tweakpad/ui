import { readFileSync } from 'node:fs';
import type { CSSResultGroup } from 'lit';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ComponentDefinition } from '../../presentation/definition.js';
import { presentationKeys } from '../../presentation/family.js';
import { buttonPresentation } from '../../presentation/families/button.js';
import { toggleGroupPresentation } from '../../presentation/families/toggle-group.js';
import { togglePresentation } from '../../presentation/families/toggle.js';
import { buttonSizes } from '../../presentation/recipes/core/button.js';
import { toggleCoreAppearance } from '../../presentation/recipes/core/toggle.js';
import { controlSizePresentation } from '../../presentation/recipes/shared/variant.js';
import {
  toggleGroupAppearance,
  toggleGroupJoinedPresentation,
} from '../../presentation/recipes/toggle-group.js';
import { TpButton } from '../button/button.js';
import type { TpToggleGroup } from '../toggle-group/toggle-group.js';
import { TpToggle, type ToggleSelectionOwner, type ToggleSize } from './toggle.js';

const sizes = ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'];
const iconSizes = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const;
const toggleEdges = {
  start: ':host([data-icon-inline-start]) &',
  end: ':host([data-icon-inline-end]) &',
};
const heights = {
  'icon-xs': 'var(--tp-control-height-xs)',
  'icon-sm': 'var(--tp-control-height-sm)',
  icon: 'var(--tp-control-height-md)',
  'icon-lg': 'var(--tp-control-height-lg)',
};

const sizeAxis = (definition: ComponentDefinition) =>
  definition.axes?.find((axis) => axis.name === 'size');
const story = (name: string) =>
  readFileSync(new URL(`../../stories/${name}.stories.ts`, import.meta.url), 'utf8');
const cssText = (styles: CSSResultGroup | undefined): string =>
  Array.isArray(styles)
    ? styles.map((entry: CSSResultGroup) => cssText(entry)).join('\n')
    : styles && 'cssText' in styles
      ? styles.cssText
      : '';
/** The `display` values of the rules whose selector is exactly `.control`. */
const controlDisplay = (styles: CSSResultGroup | undefined): string[] =>
  [...cssText(styles).matchAll(/(?:^|[\s}])\.control\s*\{([^}]*)\}/g)].flatMap(([, body = '']) =>
    [...body.matchAll(/(?:^|[;{\s])display\s*:\s*([^;]+)/g)].map(([, value = '']) => value.trim()),
  );

describe('Toggle and Toggle group sizes', () => {
  it('Toggle offers the eight sizes with default `default` (`ucl16-toggle-props-r3c1-p`, `ucl16-toggle-definition-summary-r0c2-p-t`)', () => {
    expect(sizeAxis(togglePresentation.definition)).toEqual({
      name: 'size',
      values: sizes,
      default: 'default',
    });
  });

  it('Toggle publishes a size key per value on the toggle and content parts (`ucl16-toggle-public-definition-detail-r0c2-p-t`, `ucl16-toggle-public-definition-detail-r1c2-p-t`)', () => {
    const keys = presentationKeys(togglePresentation.definition);
    for (const size of sizes) {
      expect(keys).toContain(`toggle-size-${size}`);
      expect(keys).toContain(`toggle-content-size-${size}`);
      expect(togglePresentation.appearance[`toggle-content-size-${size}`]).toEqual([]);
    }
  });

  it('Toggle group offers the eight sizes on its group and item keys (`ucl16-toggle-group-props-r4c1-p`, `ucl16-toggle-group-public-definition-detail-r0c2-p-t`, `ucl16-toggle-group-public-definition-detail-r1c2-p-t`)', () => {
    expect(sizeAxis(toggleGroupPresentation.definition)).toEqual({
      name: 'size',
      values: sizes,
      default: 'default',
    });
    const keys = presentationKeys(toggleGroupPresentation.definition);
    for (const size of sizes) {
      expect(keys).toContain(`toggle-group-size-${size}`);
      expect(keys).toContain(`toggle-group-item-size-${size}`);
    }
  });

  it.each(iconSizes)(
    '%s is a square step of the shared control table (`req-cl-145-size`)',
    (size) => {
      const rules = togglePresentation.appearance[`toggle-size-${size}`];
      expect(rules).toEqual(controlSizePresentation(size, toggleEdges));
      expect(rules).toHaveLength(1);
      expect(rules?.[0]?.declarations).toMatchObject({
        'block-size': heights[size],
        'inline-size': heights[size],
        'min-inline-size': heights[size],
        'padding-inline': '0',
      });
    },
  );

  it('the host box is the size step: the control is a block-level flex box, as the Button control is (`ucl16-toggle-props-r3c1-p`)', () => {
    expect(controlDisplay(TpButton.styles)).toEqual(['flex']);
    expect(controlDisplay(TpToggle.styles)).toEqual(controlDisplay(TpButton.styles));
  });

  it('the xs step keeps a Toggle no narrower than its height (`req-cl-106-icons`)', () => {
    expect(togglePresentation.appearance['toggle-size-xs']).toEqual([
      { declarations: { 'min-inline-size': 'var(--tp-control-height-xs)' } },
      ...controlSizePresentation('xs', toggleEdges),
    ]);
    expect(togglePresentation.appearance['toggle-size-xs']?.[1]?.declarations).toMatchObject({
      'block-size': 'var(--tp-control-height-xs)',
      'font-size': 'var(--tp-text-xs)',
    });
  });

  it('a zero-spacing group keeps icon items square (`req-cl-145-size`)', () => {
    const square = toggleGroupJoinedPresentation(1, 3, 'horizontal', false, false, true);
    expect(square).toEqual({
      'border-start-start-radius': '0',
      'border-start-end-radius': '0',
      'border-end-start-radius': '0',
      'border-end-end-radius': '0',
      'border-inline-start-width': '0',
    });
    expect(toggleGroupJoinedPresentation(0, 3, 'horizontal', false, false, true)).toEqual({
      'border-start-start-radius': 'var(--tp-radius-lg)',
      'border-start-end-radius': '0',
      'border-end-start-radius': 'var(--tp-radius-lg)',
      'border-end-end-radius': '0',
    });
    expect(toggleGroupJoinedPresentation(1, 3, 'horizontal', true, false, false)).toEqual({
      'border-start-start-radius': '0',
      'border-start-end-radius': '0',
      'border-end-start-radius': '0',
      'border-end-end-radius': '0',
      'border-inline-start-width': '0',
      'padding-inline-start': 'var(--tp-space-1-5)',
      'padding-inline-end': 'var(--tp-space-2)',
    });
  });

  it('Toggle and Toggle group take their sizes from the Button size set (`ucl16-toggle-props-r3c1-p`, `ucl16-toggle-group-props-r4c1-p`, `cell-cl-106-axis-2-values-p`)', () => {
    const buttonAxis = sizeAxis(buttonPresentation.definition);
    expect(buttonAxis?.values).toBe(buttonSizes);
    expect(sizeAxis(togglePresentation.definition)?.values).toBe(buttonSizes);
    expect(sizeAxis(toggleGroupPresentation.definition)?.values).toBe(buttonSizes);
    const sizeKeys = (dictionary: object, prefix: string) =>
      Object.keys(dictionary)
        .filter((key) => key.startsWith(prefix))
        .sort();
    const keysOf = (prefix: string) => buttonSizes.map((size) => `${prefix}${size}`).sort();
    for (const prefix of ['toggle-size-', 'toggle-content-size-'])
      expect(sizeKeys(toggleCoreAppearance, prefix)).toEqual(keysOf(prefix));
    for (const prefix of ['toggle-group-size-', 'toggle-group-item-size-'])
      expect(sizeKeys(toggleGroupAppearance, prefix)).toEqual(keysOf(prefix));
    expectTypeOf<(typeof buttonSizes)[number]>().toEqualTypeOf<TpButton['size']>();
    expectTypeOf<ToggleSize>().toEqualTypeOf<TpButton['size']>();
  });

  it('the size unions are the Toggle size (`ucl16-toggle-props-r3c1-p`)', () => {
    expectTypeOf<ToggleSize>().toEqualTypeOf<
      'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'
    >();
    expectTypeOf<TpToggle['size']>().toEqualTypeOf<ToggleSize>();
    expectTypeOf<TpToggleGroup['size']>().toEqualTypeOf<ToggleSize>();
    expectTypeOf<ToggleSelectionOwner['size']>().toEqualTypeOf<ToggleSize>();
  });

  it('the stories offer every size as a control and the documentation shows icon-only Toggles at an icon size (`uwg-te-toggle-req-icon`, `uwg-te-toggle-group-req-icon`)', () => {
    const options = `options: [${sizes.map((size) => `'${size}'`).join(', ')}],`;
    for (const name of ['toggle', 'toggle-group']) {
      const source = story(name);
      const control = source.slice(source.indexOf('    size: {'));
      expect(control.slice(0, control.indexOf('},'))).toContain(options);
    }
    const page = (name: string) =>
      readFileSync(new URL(`../../../docs/components/${name}.mdx`, import.meta.url), 'utf8');
    expect(page('toggle')).toMatch(/<tp-toggle [^>]*size="icon-sm" aria-label="[^"]+"/u);
    expect(page('toggle-group')).toMatch(/<tp-toggle-group [^>]*size="icon"/u);
    expect(page('toggle-group')).toContain('<tp-toggle value="bold" aria-label="Bold">');
  });
});
