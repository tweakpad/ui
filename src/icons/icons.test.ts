/**
 * Guards of the text-editing icon modules and of the license notice that ships with their
 * artwork. Each module is plain data that imports only the definition type, so a consumer selects
 * one definition at a time and a Node import runs no code (Component Library
 * `req-cl-146-independent`, `req-cl-146-consumer`; Widgets `uwg-te-lis-conf-i3`). The guard never
 * spells the name of the artwork's source: it reads it from the one license file name.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importSpecifiers } from '../source-imports.test.js';
import type { IconDefinition } from './types.js';

const icons = new URL('./', import.meta.url).pathname;
const repository = join(icons, '..', '..');
const read = (file: string) => readFileSync(join(repository, file), 'utf8');
const load = async (module: string) =>
  (await import(/* @vite-ignore */ pathToFileURL(join(icons, `${module}.ts`)).href)) as Record<
    string,
    unknown
  >;

/** The text-editing modules and every definition each exports, in source order. */
const MODULES: Readonly<Record<string, readonly string[]>> = {
  'text-formatting': [
    'boldIcon',
    'italicIcon',
    'underlineIcon',
    'bookmarkIcon',
    'filledBookmarkIcon',
    'strikethroughIcon',
    'codeIcon',
    'superscriptIcon',
    'subscriptIcon',
    'highlighterIcon',
    'baselineIcon',
    'removeFormattingIcon',
  ],
  'text-blocks': [
    'heading1Icon',
    'heading2Icon',
    'heading3Icon',
    'pilcrowIcon',
    'bulletListIcon',
    'orderedListIcon',
    'taskListIcon',
    'quoteIcon',
    'codeBlockIcon',
    'calloutIcon',
    'embedIcon',
  ],
  'text-align': [
    'textAlignLeftIcon',
    'textAlignCenterIcon',
    'textAlignRightIcon',
    'textAlignJustifyIcon',
  ],
  link: ['linkIcon', 'unlinkIcon', 'cornerDownLeftIcon'],
  'table-editing': [
    'tableIcon',
    'insertRowAboveIcon',
    'insertRowBelowIcon',
    'insertColumnLeftIcon',
    'insertColumnRightIcon',
    'mergeCellsIcon',
    'splitCellIcon',
    'headerRowIcon',
    'headerColumnIcon',
    'paintBucketIcon',
    'clearCellsIcon',
  ],
  arrows: ['arrowUpIcon', 'arrowDownIcon', 'arrowLeftIcon', 'arrowRightIcon'],
  ellipsis: ['ellipsisVerticalIcon'],
  'image-plus': ['imagePlusIcon'],
  'at-sign': ['atSignIcon'],
  ban: ['banIcon'],
};

/** The definitions of `text-formatting` that predate the text-editing set. */
const EARLIER = new Set([
  'boldIcon',
  'italicIcon',
  'underlineIcon',
  'bookmarkIcon',
  'filledBookmarkIcon',
]);

/** A source with its comments and string literals blanked. */
const code = (source: string) =>
  source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/gu,
    ' ',
  );

const PATH_TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/gu;
/** The numbers each path command takes, in whole groups. */
const ARITY: Readonly<Record<string, number>> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
  z: 0,
};

/** What keeps path data from reading as SVG path grammar that starts with a move. */
function pathProblems(d: string): string[] {
  const problems: string[] = [];
  if (!/^[Mm]/u.test(d)) problems.push('does not start with a move');
  if (d.replace(PATH_TOKEN, '').replace(/[\s,]/gu, '') !== '')
    problems.push('holds characters outside the grammar');
  let command = '';
  let count = 0;
  const close = () => {
    if (!command) return;
    const arity = ARITY[command.toLowerCase()]!;
    if (arity === 0 ? count !== 0 : count === 0 || count % arity !== 0)
      problems.push(`${command} takes ${count} numbers`);
  };
  for (const token of d.match(PATH_TOKEN) ?? []) {
    if (/^[A-Za-z]$/u.test(token)) {
      close();
      command = token;
      count = 0;
    } else count += 1;
  }
  close();
  return problems;
}

const isDefinition = (value: unknown): value is IconDefinition =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as IconDefinition).viewBox === 'string' &&
  Array.isArray((value as IconDefinition).paths);

/** The definitions an export holds: itself, or the members of a grouped record. */
const definitionsOf = (name: string, value: unknown): [string, IconDefinition][] =>
  isDefinition(value)
    ? [[name, value]]
    : typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, member]) =>
          isDefinition(member) ? [[`${name}.${key}`, member] as [string, IconDefinition]] : [],
        )
      : [];

/** The artwork of a definition, whatever the order of its paths. */
const artwork = (icon: IconDefinition) =>
  JSON.stringify([
    icon.viewBox,
    icon.paths.map((path) => JSON.stringify(Object.entries(path).sort())).sort(),
  ]);

describe('text-editing icons', () => {
  it('the text-editing modules are plain data that import only the definition type (req-cl-146-independent)', () => {
    for (const [module, names] of Object.entries(MODULES)) {
      const source = read(`src/icons/${module}.ts`);
      expect(importSpecifiers(source), module).toEqual(['./types.js']);
      expect(source, module).toMatch(/^import type \{ IconDefinition \} from '\.\/types\.js';$/mu);
      const body = code(source);
      for (const construct of [/\(/u, /=>/u, /\.\.\./u, /\bfunction\b/u, /\bclass\b/u, /\bnew\b/u])
        expect(body, `${module}: ${construct.source}`).not.toMatch(construct);
      // Every export is one typed object literal, in the listed order.
      const declared = [...body.matchAll(/^export const (\w+): IconDefinition = \{$/gmu)].map(
        (match) => match[1],
      );
      expect(declared, module).toEqual(names);
      expect(body.match(/\bexport\b/gu)?.length, module).toBe(names.length);
    }
  });

  it('each module exports exactly its 24×24 definitions with a 2-unit stroke (req-cl-146-consumer)', async () => {
    for (const [module, names] of Object.entries(MODULES)) {
      const exports = await load(module);
      expect(Object.keys(exports).sort(), module).toEqual([...names].sort());
      for (const name of names) {
        const icon = exports[name];
        expect(name).toMatch(/^[a-z][A-Za-z0-9]*Icon$/u);
        expect(isDefinition(icon), name).toBe(true);
        if (!isDefinition(icon)) continue;
        expect(Object.keys(icon).sort(), name).toEqual(['paths', 'viewBox']);
        expect(icon.viewBox, name).toBe('0 0 24 24');
        expect(icon.paths.length, name).toBeGreaterThan(0);
        for (const path of icon.paths) {
          expect(pathProblems(path.d), `${name}: ${path.d}`).toEqual([]);
          expect(path.strokeWidth, name).toBe(2);
          // Only the filled bookmark fills its artwork; every other path is a stroke.
          expect(Object.keys(path).sort(), name).toEqual(
            name === 'filledBookmarkIcon' ? ['d', 'fill', 'strokeWidth'] : ['d', 'strokeWidth'],
          );
        }
      }
    }
    const formatting = await load('text-formatting');
    const bookmark = formatting.bookmarkIcon as IconDefinition;
    expect(formatting.filledBookmarkIcon).toEqual({
      viewBox: bookmark.viewBox,
      paths: bookmark.paths.map((path) => ({ ...path, fill: 'currentColor' })),
    });
  });

  it('no text-editing definition copies the artwork of another icon module (req-cl-146-independent)', async () => {
    // The chat composer's send mark draws the up arrow, but only as a member of its grouped
    // record, which a selective import cannot take alone.
    const groupedOnly = new Set(['chat:chatIcons.send']);
    const modules = readdirSync(icons)
      .filter((file) => file.endsWith('.ts') && file !== 'types.ts' && !file.endsWith('.test.ts'))
      .map((file) => file.slice(0, -3));
    const all: { where: string; added: boolean; icon: IconDefinition }[] = [];
    for (const module of modules)
      for (const [name, value] of Object.entries(await load(module)))
        for (const [member, icon] of definitionsOf(name, value))
          all.push({
            where: `${module}:${member}`,
            added: (MODULES[module]?.includes(member) ?? false) && !EARLIER.has(member),
            icon,
          });
    const added = all.filter((entry) => entry.added);
    expect(added).toHaveLength(44);
    const copies = added.flatMap(({ where, icon }) =>
      all
        .filter(
          (other) =>
            other.where !== where &&
            !groupedOnly.has(other.where) &&
            artwork(other.icon) === artwork(icon),
        )
        .map((other) => `${where} = ${other.where}`),
    );
    expect(copies).toEqual([]);
  });

  it('ships the license notice of the icon artwork', () => {
    const notices = readdirSync(icons).filter((file) => file.startsWith('LICENSE.'));
    expect(notices).toHaveLength(1);
    const notice = notices[0]!;
    expect(read(`src/icons/${notice}`)).toContain('Permission to use, copy, modify');
    expect(read('vite.config.ts')).toContain(`['src/icons/${notice}', '${notice}'],`);
    const name = notice.slice('LICENSE.'.length).toLowerCase();
    expect(name).toMatch(/^[a-z][a-z0-9-]*$/u);
    // The notice file and its build entry are the only places that name the source.
    const folder = (dir: string, keep: (file: string) => boolean) =>
      existsSync(join(repository, dir))
        ? readdirSync(join(repository, dir))
            .filter(keep)
            .map((file) => `${dir}/${file}`)
        : [];
    const files = [
      ...Object.keys(MODULES).map((module) => `src/icons/${module}.ts`),
      'src/icons/icons.test.ts',
      'docs/icon.md',
      'README.md',
      ...folder('.changeset', (file) => file.endsWith('.md')),
      ...folder('tests/fixtures/components/icon', () => true),
    ];
    expect(files.filter((file) => read(file).toLowerCase().includes(name))).toEqual([]);
  });
});
