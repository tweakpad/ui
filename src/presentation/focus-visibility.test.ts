import { describe, expect, it } from 'vitest';
import { attachmentPresentation } from './families/attachment.js';
import { checkboxPresentation } from './families/checkbox.js';
import { commandPalettePresentation } from './families/command-palette.js';
import { emojiPickerPresentation } from './families/emoji-picker.js';
import { fileUploadPresentation } from './families/file-upload.js';
import { inputPresentation } from './families/input.js';
import { inputGroupPresentation } from './families/input-group.js';
import { menuPresentation } from './families/menu.js';
import { navigationMenuPresentation } from './families/navigation-menu.js';
import { oneTimeCodeFieldPresentation } from './families/one-time-code-field.js';
import { radioGroupPresentation } from './families/radio-group.js';
import { selectPresentation } from './families/select.js';
import { sliderPresentation } from './families/slider.js';
import { switchPresentation } from './families/switch.js';
import { textAreaPresentation } from './families/text-area.js';
import type { PresentationFamily } from './family.js';
import { resolveComponentPresentation, serializeDeclarations } from './resolver.js';
import type { PresentationRule } from './resolver.js';

// Focus visibility (WCAG 2.2 SC 2.4.7 and SC 1.4.11): a focused control, invalid or not, and
// a highlighted command row keep a full-strength ring. The CSS is produced the way the
// controller emits it, so rule order (later equal-specificity rules win) is part of the check.

const ring = 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)';
const invalidRing = 'var(--tp-ring-width) var(--tp-border-style) var(--tp-destructive)';
const inset = 'outline-offset:calc(-1 * var(--tp-ring-width))';

const css = (family: PresentationFamily, part: string, axes: Record<string, unknown> = {}) => {
  const resolved = resolveComponentPresentation(family.definition, axes, family.appearance);
  const rules: readonly PresentationRule[] = [
    ...(resolved.parts[part] ?? []),
    ...(family.structure[part] ?? []),
  ];
  const target = `[part~="${part}"]`;
  return rules
    .map((rule) => {
      const selector = rule.selector?.includes('&')
        ? rule.selector.replaceAll('&', target)
        : target + (rule.selector ?? '');
      return `${selector}{${serializeDeclarations(rule.declarations)}}`;
    })
    .join('\n');
};

/** `later` is emitted after `earlier`, so it wins at equal specificity. */
const expectOrder = (text: string, earlier: string, later: string) => {
  expect(text).toContain(earlier);
  expect(text).toContain(later);
  expect(text.indexOf(later)).toBeGreaterThan(text.indexOf(earlier));
};

describe('invalid controls keep a full-strength focus ring', () => {
  it('rings a focused invalid Input and Text area after the invalid paint', () => {
    for (const [family, part] of [
      [inputPresentation, 'input'],
      [textAreaPresentation, 'text-area'],
    ] as const) {
      const text = css(family, part);
      expectOrder(
        text,
        `[part~="${part}"][aria-invalid="true"]{`,
        `[part~="${part}"][aria-invalid="true"]:focus-visible{outline:${invalidRing}}`,
      );
    }
  });

  it('rings a focused invalid Input group after the invalid paint', () => {
    expectOrder(
      css(inputGroupPresentation, 'input-group'),
      '[part~="input-group"][data-invalid]{',
      `[part~="input-group"][data-invalid]:focus-within{outline:${invalidRing}}`,
    );
  });

  it('rings a focused invalid Checkbox and Radio box in the destructive color', () => {
    for (const [family, part] of [
      [checkboxPresentation, 'checkbox'],
      [radioGroupPresentation, 'radio-group-item'],
    ] as const) {
      const text = css(family, part);
      expectOrder(
        text,
        `[part~="${part}"][data-invalid] > .box{`,
        `[part~="${part}"][data-invalid]:focus-visible > .box{outline-color:var(--tp-destructive)}`,
      );
      expect(text).not.toContain('var(--tp-destructive) 20%');
    }
  });

  it('rings a focused invalid Select trigger, File upload and One-time code slot', () => {
    expect(css(selectPresentation, 'select-trigger')).toContain(
      '[data-invalid]:focus-visible{outline-color:var(--tp-destructive)}',
    );
    expect(css(fileUploadPresentation, 'file-upload-dropzone')).toContain(
      `[part~="file-upload-dropzone"][data-invalid][data-focus-visible]{border-color:var(--tp-destructive);outline:${invalidRing};outline-offset:0}`,
    );
    expectOrder(
      css(oneTimeCodeFieldPresentation, 'one-time-code-field-slot'),
      '[part~="one-time-code-field-slot"][data-invalid]{',
      `[part~="one-time-code-field-slot"][data-invalid][data-active]{outline:${invalidRing}}`,
    );
  });
});

describe('focus rings are painted at full strength', () => {
  it('rings a focused Navigation menu trigger and link', () => {
    for (const part of ['navigation-menu-trigger', 'navigation-menu-link']) {
      const text = css(navigationMenuPresentation, part);
      expect(text).toContain(`[part~="${part}"]:focus-visible{outline:${ring};outline-offset:0}`);
      expect(text).not.toContain('var(--tp-ring) 50%, transparent)');
    }
  });

  it('rings an Attachment card holding keyboard focus', () => {
    expectOrder(
      css(attachmentPresentation, 'attachment-root'),
      '[part~="attachment-root"]:focus-within{',
      `[part~="attachment-root"]:has(:focus-visible, [data-focus-visible]){outline:${ring}}`,
    );
  });

  it('rings a focused Switch, in the destructive color while invalid', () => {
    const text = css(switchPresentation, 'switch');
    expect(text).toContain(
      `[part~="switch"][data-focus-visible]:focus-visible{outline:${ring};outline-offset:var(--tp-ring-offset)`,
    );
    expect(text).toContain(
      '[part~="switch"][data-invalid][data-focus-visible]:focus-visible{outline-color:var(--tp-destructive)',
    );
    expect(text).not.toContain('outline:none');
  });

  it('rings the Slider thumb on keyboard focus but not on hover', () => {
    const text = css(sliderPresentation, 'slider-thumb');
    expect(text).toContain(
      `[part~="slider-thumb"]:has(input:focus-visible){outline:${ring};outline-offset:var(--tp-ring-offset)}`,
    );
    const hover = text.split('\n').filter((line) => line.includes(':hover'));
    expect(hover.length).toBeGreaterThan(0);
    for (const line of hover) expect(line).not.toContain('outline');
    // The bar variant rings its Track; the unpainted Thumb draws none.
    const bar = css(sliderPresentation, 'slider-thumb', { variant: 'bar' });
    expectOrder(
      bar,
      `[part~="slider-thumb"]:has(input:focus-visible){outline:${ring}`,
      '[part~="slider-thumb"]:has(input:focus-visible){outline:none}',
    );
    expect(css(sliderPresentation, 'slider-track', { variant: 'bar' })).toContain(
      `[part~="slider"][data-focus-visible] [part~="slider-track"]{outline:${ring}`,
    );
  });
});

describe('highlighted command rows carry an inset ring', () => {
  it('rings the keyboard-highlighted Menu item after its highlight fill', () => {
    const text = css(menuPresentation, 'menu-item');
    expectOrder(
      text,
      '[part~="menu-item"][data-highlighted]:not([data-disabled], [aria-disabled="true"]){',
      `[part~="menu-item"]:is(:focus-visible, [data-focus-visible]):not([data-disabled], [aria-disabled="true"]){outline:${ring};${inset}}`,
    );
  });

  it('rings the highlighted Command palette item after its highlight fill', () => {
    expectOrder(
      css(commandPalettePresentation, 'command-palette-item'),
      '[part~="command-palette-item"]:is(:focus, [data-highlighted]):not([data-disabled], [aria-disabled="true"]){',
      `[part~="command-palette-item"]:is(:focus-visible, [data-focus-visible], [data-highlighted]):not([data-disabled], [aria-disabled="true"]){outline:${ring};${inset}}`,
    );
  });

  it('rings the highlighted Select option and Emoji picker item after their highlight fill', () => {
    for (const [family, part] of [
      [selectPresentation, 'select-option'],
      [emojiPickerPresentation, 'emoji-picker-item'],
    ] as const) {
      const text = css(family, part);
      expectOrder(
        text,
        `[part~="${part}"][data-highlighted]:not([data-disabled]){`,
        `[part~="${part}"]:is(:focus-visible, [data-highlighted]):not([data-disabled]){outline:${ring};${inset}}`,
      );
      // The base paint's `outline:0` precedes the ring, so the ring wins.
      expect(text.indexOf('outline:0')).toBeLessThan(text.indexOf(inset));
    }
  });

  it('never rings a hover-only state', () => {
    for (const [family, part] of [
      [menuPresentation, 'menu-item'],
      [selectPresentation, 'select-option'],
      [emojiPickerPresentation, 'emoji-picker-item'],
      [navigationMenuPresentation, 'navigation-menu-link'],
    ] as const)
      for (const line of css(family, part).split('\n'))
        if (line.includes(':hover') && !line.includes(':focus-visible'))
          expect(line).not.toContain('outline');
  });
});
