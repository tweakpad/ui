import type { TemplateResult } from 'lit';
import { describe, expect, it } from 'vitest';
import type { ThemeSwitcherSize } from './types.js';
import { TpThemeSwitcher } from './theme-switcher.js';

/** The value bound to the Toggle group's `size` attribute in one render of the group variant. */
function groupSize(size: ThemeSwitcherSize): unknown {
  const switcher = new TpThemeSwitcher();
  switcher.variant = 'group';
  switcher.size = size;
  const template = (switcher as unknown as { render(): TemplateResult }).render();
  const index = template.strings.findIndex((text) => /<tp-toggle-group[^>]*\ssize=$/.test(text));
  expect(index).toBeGreaterThanOrEqual(0);
  return template.values[index];
}

describe('Theme switcher group variant', () => {
  it('uses `icon-sm` at `sm` and `icon` at `default` (`uwg-te-toggle-group-req-icon`)', () => {
    expect(groupSize('sm')).toBe('icon-sm');
    expect(groupSize('default')).toBe('icon');
  });
});
