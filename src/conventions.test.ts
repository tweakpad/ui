import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source-level guard for docs/conventions.md: property/attribute spelling, axis reflection,
// state-marker domains, event naming and the change-reason registry.

const root = new URL('./', import.meta.url).pathname;
const sources = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [join(dir, entry.name)]
        : [],
  );
const files = [
  ...sources('components'),
  ...sources('widgets'),
  ...sources('foundation'),
  ...sources('presentation'),
];
const read = (file: string) => readFileSync(join(root, file), 'utf8');

interface Declaration {
  file: string;
  tag: string;
  name: string;
  options: string;
}

/** Every `static properties` entry, with the tag of the class declaring it. */
function declarations(): Declaration[] {
  const result: Declaration[] = [];
  for (const file of files) {
    const text = read(file);
    for (const match of text.matchAll(/class\s+(\w+)\s+extends\s+[\w.]+[^{]*\{/g)) {
      const next = text.indexOf('\nexport class ', match.index + 1);
      const segment = text.slice(match.index, next === -1 ? undefined : next);
      const tag = segment.match(/static (?:override )?tagName = '([^']+)'/)?.[1] ?? match[1]!;
      const start = segment.search(/static (?:override )?properties[^=]*=\s*\{/);
      if (start === -1) continue;
      let depth = 0;
      const index = segment.indexOf('{', start);
      let end = index;
      for (; end < segment.length; end++) {
        if (segment[end] === '{') depth++;
        else if (segment[end] === '}' && --depth === 0) break;
      }
      const body = segment.slice(index + 1, end);
      let nested = 0;
      let entry = '';
      const entries: string[] = [];
      for (const char of body) {
        if (char === '{') nested++;
        if (char === '}') nested--;
        if (char === ',' && nested === 0) {
          entries.push(entry);
          entry = '';
        } else entry += char;
      }
      if (entry.trim()) entries.push(entry);
      for (const item of entries) {
        const parsed = item.match(
          /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(\w+)\s*:\s*\{([\s\S]*)\}\s*$/,
        );
        if (parsed) result.push({ file, tag, name: parsed[1]!, options: parsed[2]! });
      }
    }
  }
  return result;
}

/** Properties that mirror native DOM IDL names and therefore use the native attribute. */
const nativeMirrors = new Set([
  'readOnly',
  'srcSet',
  'crossOrigin',
  'referrerPolicy',
  'fetchPriority',
  'minLength',
  'maxLength',
  'inputMode',
  'colSpan',
  'rowSpan',
]);

const canonicalAxes = new Set(['variant', 'size', 'orientation', 'align', 'side']);

/** Foundation Appendix B.8 plus the component registries (Carousel, Media, Map, Scroll spy). */
const registeredReasons = new Set([
  'programmatic',
  'initial',
  'missing',
  'disabled',
  'imperative-action',
  'trigger-press',
  'trigger-hover',
  'trigger-focus',
  'input-press',
  'item-press',
  'link-press',
  'close-action',
  'clear',
  'chip-remove-press',
  'track-press',
  'increment',
  'decrement',
  'input',
  'input-clear',
  'input-blur',
  'input-paste',
  'focus-outside',
  'escape-key',
  'close-watcher',
  'list-navigation',
  'keyboard',
  'pointer',
  'drag',
  'swipe',
  'wheel',
  'scrub',
  'cancel-open',
  'sibling-open',
  'outside-press',
  'ancestor-scroll',
  'reference-press',
  'click',
  'hover',
  'focus',
  'safe-polygon',
  'form-reset',
  'submit',
  'anchor-removed',
  'selection',
  'automatic-advance',
  'window-resize',
  'media',
  'hotkey',
  'gesture',
  'idle',
  'engine',
  'scroll',
]);

describe('attribute conventions', () => {
  const all = declarations();

  it('gives every multi-word property an explicit kebab-case attribute', () => {
    const offenders = all
      .filter(
        ({ name, options }) =>
          /[A-Z]/.test(name) &&
          !name.startsWith('_') &&
          !nativeMirrors.has(name) &&
          !/state:\s*true/.test(options) &&
          !/attribute:\s*(false|'[a-z0-9-]+')/.test(options),
      )
      .map(({ tag, name }) => `${tag}.${name}`);
    expect(offenders).toEqual([]);
  });

  it('reflects the canonical variant axes on public hosts', () => {
    const offenders = all
      .filter(
        ({ tag, name, options }) =>
          canonicalAxes.has(name) &&
          tag.startsWith('tp-') &&
          !(tag === 'tp-icon' && name === 'size') && // a CSS length, not an axis
          !/noAccessor:\s*true/.test(options) && // derived accessors publish markers instead
          !/reflect:\s*true/.test(options),
      )
      .map(({ tag, name }) => `${tag}.${name}`);
    expect(offenders).toEqual([]);
  });
});

describe('state marker conventions', () => {
  it('never serializes a boolean marker as "false" or selects on it', () => {
    const offenders: string[] = [];
    for (const file of files)
      for (const match of read(file).matchAll(/data-[a-z-]+=['"]false['"]/g))
        offenders.push(`${file}: ${match[0]}`);
    expect(offenders).toEqual([]);
  });

  it('publishes presence through data-open/data-closed, never a data-state alias', () => {
    const offenders = files.filter((file) => /data-state\b|dataset\.state\b/.test(read(file)));
    expect(offenders).toEqual([]);
  });
});

describe('event conventions', () => {
  it('names settled notifications -change-complete, never -changed', () => {
    const offenders: string[] = [];
    for (const file of files)
      for (const match of read(file).matchAll(/'tp-[a-z-]+-changed'/g))
        offenders.push(`${file}: ${match[0]}`);
    expect(offenders).toEqual([]);
  });

  it('uses only registered change reasons', () => {
    const offenders: string[] = [];
    for (const file of files)
      for (const match of read(file).matchAll(/\breason: '([a-z-]+)'/g))
        if (!registeredReasons.has(match[1]!)) offenders.push(`${file}: ${match[1]}`);
    expect(offenders).toEqual([]);
  });
});
