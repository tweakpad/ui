#!/usr/bin/env node
// Checks documentation pages against the tweakpad-docs skill:
//
// - grammar: every page parses (frontmatter, Preview/Code/Keys only, template literals);
// - A parity: the frozen website page (`plans/docs/sources/website/<id>.mdx`) survives unchanged in
//   `docs/<id>.mdx`: frontmatter, headings first and in order, previews in order and identical,
//   paragraphs in order and unaltered (B sentences may follow them), except listed forced edits;
// - ledger: `plans/docs/ledger/<id>.md` gives every captured B item
//   (`plans/docs/sources/storybook/<id>.json`) exactly one known disposition and names real
//   sections as targets;
// - then the library's own checks: the docs and stories tests, and `docs:build --check` (the
//   catalog, the parts and every API row described) when `dist/` is built.
//
// Usage (library root):
//   node .agents/skills/tweakpad-docs/scripts/check-docs.mjs components/badge [widgets/flow …]
//   node .agents/skills/tweakpad-docs/scripts/check-docs.mjs --all
//   … --no-tests   skips the vitest and build checks (page checks only)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const root = resolve(import.meta.dirname, '../../../..');
const { parseDoc, slugify } = await import(pathToFileURL(join(root, 'src/docs/parse.ts')).href);

export const DISPOSITIONS = new Set([
  'in-A',
  'merged',
  'appended',
  'dropped-api',
  'dropped-storybook',
]);
const FORCED_KINDS = new Set(['preview', 'prose', 'heading']);

/** The mechanical edits every moved A page gets: no Astro imports, no rendering-hint fields. */
export function normalizeWebsitePage(source) {
  const text = source.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const kept = [];
  lines.forEach((line, index) => {
    if (index > 0 && index < end && /^(?:reference|members|order):/.test(line)) return;
    if (index > end && /^import\s.+from\s+'[^']+\.astro';\s*$/.test(line)) return;
    kept.push(line);
  });
  // An import line leaves a blank line pair behind; collapse runs of blank lines after frontmatter.
  return kept.join('\n').replace(/^(---\n[\s\S]*?\n---\n)\n+/, '$1\n');
}

/** End offset (after `/>`) of the self-closing element that starts at `start`. */
function elementEnd(text, start) {
  let cursor = start;
  while (cursor < text.length) {
    const character = text[cursor];
    if (character === '/' && text[cursor + 1] === '>') return cursor + 2;
    if (character === '"' || character === "'") {
      cursor = text.indexOf(character, cursor + 1) + 1;
      continue;
    }
    if (character === '`') {
      cursor += 1;
      while (cursor < text.length && text[cursor] !== '`') cursor += text[cursor] === '\\' ? 2 : 1;
      cursor += 1;
      continue;
    }
    cursor += 1;
  }
  return text.length;
}

/**
 * The page's paragraphs: body blocks split on blank lines, with block-level elements (a Preview
 * or Code starting a line) removed and headings left out. Whitespace is collapsed.
 */
export function paragraphs(source) {
  const text = source.replace(/\r\n?/g, '\n');
  const bodyStart = text.startsWith('---\n') ? text.indexOf('\n---\n', 4) + 5 : 0;
  let body = text.slice(bodyStart);
  let result = '';
  let cursor = 0;
  for (const match of body.matchAll(/^<(?:Preview|Code)\b/gm)) {
    if (match.index < cursor) continue;
    result += body.slice(cursor, match.index) + '\n\n';
    cursor = elementEnd(body, match.index);
  }
  body = result + body.slice(cursor);
  return body
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block && !/^#{1,6}\s/.test(block));
}

const previewKey = (preview) =>
  JSON.stringify([
    preview.title,
    preview.code,
    preview.script ?? null,
    preview.align ?? null,
    preview.viewport ?? null,
    preview.language ?? null,
    preview.codeOnly ?? false,
  ]);

/** Reads a ledger's two tables. */
export function readLedger(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1].toLowerCase();
      sections.set(current, []);
      continue;
    }
    if (!current || !line.startsWith('|')) continue;
    const cells = line
      .slice(1, line.trimEnd().endsWith('|') ? line.trimEnd().length - 1 : undefined)
      .split('|')
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    sections.get(current).push(cells);
  }
  const strip = (rows) => rows.slice(1); // header row
  return {
    items: strip(sections.get('b items') ?? []).map(([item, disposition, target]) => ({
      item,
      disposition,
      target: target ?? '',
    })),
    forced: strip(sections.get('forced edits') ?? []).map(([kind, text, reason]) => ({
      kind,
      text: text ?? '',
      reason: reason ?? '',
    })),
    hasItems: sections.has('b items'),
    hasForced: sections.has('forced edits'),
  };
}

/** Problems of one page id (`components/badge`). */
export function checkPage(id, options = {}) {
  const base = options.root ?? root;
  const problems = [];
  const pagePath = join(base, 'docs', `${id}.mdx`);
  if (!existsSync(pagePath)) return [`${id}: docs/${id}.mdx does not exist`];
  const pageSource = readFileSync(pagePath, 'utf8');
  let page;
  try {
    page = parseDoc(pageSource, id);
  } catch (error) {
    return [String(error.message)];
  }

  const ledgerPath = join(base, 'plans/docs/ledger', `${id}.md`);
  const ledger = existsSync(ledgerPath) ? readLedger(readFileSync(ledgerPath, 'utf8')) : null;
  const forced = ledger?.forced ?? [];
  for (const edit of forced)
    if (!FORCED_KINDS.has(edit.kind))
      problems.push(
        `${id}: ledger forced edit kind "${edit.kind}" is not preview, prose or heading`,
      );
  const forcedPreview = new Set(forced.filter((e) => e.kind === 'preview').map((e) => e.text));
  const forcedHeading = new Set(forced.filter((e) => e.kind === 'heading').map((e) => e.text));
  const forcedProse = forced.filter((e) => e.kind === 'prose').map((e) => e.text);

  // A parity.
  const websitePath = join(base, 'plans/docs/sources/website', `${id}.mdx`);
  if (existsSync(websitePath)) {
    const websiteSource = normalizeWebsitePage(readFileSync(websitePath, 'utf8'));
    let website;
    try {
      website = parseDoc(websiteSource, id);
    } catch (error) {
      problems.push(`${id}: the frozen website page does not parse: ${error.message}`);
    }
    if (website) {
      for (const field of ['title', 'description', 'tag'])
        if (website[field] !== page[field])
          problems.push(`${id}: frontmatter ${field} changed from the website page`);
      website.headings.forEach((heading, index) => {
        const actual = page.headings[index];
        if (forcedHeading.has(heading.text)) return;
        if (!actual || actual.depth !== heading.depth || actual.text !== heading.text)
          problems.push(
            `${id}: website heading ${'#'.repeat(heading.depth)} ${heading.text} must be heading ${index + 1}` +
              (actual ? `, found ${'#'.repeat(actual.depth)} ${actual.text}` : ''),
          );
      });
      let cursor = 0;
      for (const preview of website.previews) {
        const forcedEdit = forcedPreview.has(preview.title);
        const at = page.previews.findIndex(
          (candidate, index) =>
            index >= cursor &&
            (forcedEdit
              ? candidate.title === preview.title
              : previewKey(candidate) === previewKey(preview)),
        );
        if (at === -1) {
          problems.push(
            `${id}: website preview "${preview.title}" is missing, moved or changed` +
              ' (list a forced edit only when a rule requires the change)',
          );
          continue;
        }
        cursor = at + 1;
      }
      if (
        website.hero &&
        page.hero &&
        previewKey(website.hero) !== previewKey(page.hero) &&
        !forcedPreview.has(website.hero.title)
      )
        problems.push(`${id}: the main use case (hero) changed`);
      const pageParagraphs = paragraphs(pageSource);
      let paragraphCursor = 0;
      for (const paragraph of paragraphs(websiteSource)) {
        if (forcedProse.some((start) => start && paragraph.startsWith(start))) continue;
        const at = pageParagraphs.findIndex(
          (candidate, index) => index >= paragraphCursor && candidate.startsWith(paragraph),
        );
        if (at === -1) {
          problems.push(
            `${id}: website paragraph changed, moved or missing: "${paragraph.slice(0, 90)}${paragraph.length > 90 ? '…' : ''}"`,
          );
          continue;
        }
        paragraphCursor = at + 1;
      }
    }
  }

  // Ledger completeness.
  const capturePath = join(base, 'plans/docs/sources/storybook', `${id}.json`);
  if (existsSync(capturePath)) {
    const captured = JSON.parse(readFileSync(capturePath, 'utf8')).items.map((item) => item.id);
    if (!ledger)
      problems.push(`${id}: plans/docs/ledger/${id}.md is missing (${captured.length} B items)`);
    else {
      if (!ledger.hasItems) problems.push(`${id}: the ledger needs a "## B items" table`);
      if (!ledger.hasForced) problems.push(`${id}: the ledger needs a "## Forced edits" table`);
      const listed = new Map();
      for (const row of ledger.items) {
        if (listed.has(row.item)) problems.push(`${id}: ledger lists "${row.item}" twice`);
        listed.set(row.item, row);
        if (!DISPOSITIONS.has(row.disposition))
          problems.push(`${id}: ledger "${row.item}" has unknown disposition "${row.disposition}"`);
        if (!captured.includes(row.item))
          problems.push(`${id}: ledger "${row.item}" is not a captured B item`);
        if (row.disposition === 'appended' || row.disposition === 'merged') {
          const target = /^(#{2,3})\s+(.+)$/.exec(row.target);
          if (!target) problems.push(`${id}: ledger "${row.item}" needs a "### Heading" target`);
          else if (
            !page.headings.some(
              (heading) =>
                heading.depth === target[1].length && slugify(heading.text) === slugify(target[2]),
            )
          )
            problems.push(
              `${id}: ledger "${row.item}" targets ${row.target}, which the page lacks`,
            );
        }
      }
      for (const item of captured)
        if (!listed.has(item)) problems.push(`${id}: ledger has no row for B item "${item}"`);
    }
  }
  return problems;
}

/** Every page id: written pages plus frozen sources. */
export function allIds(base = root) {
  const ids = new Set();
  for (const folder of ['docs', 'plans/docs/sources/website', 'plans/docs/sources/storybook'])
    for (const section of ['components', 'widgets']) {
      const path = join(base, folder, section);
      if (!existsSync(path)) continue;
      for (const file of readdirSync(path))
        if (/\.(mdx|json)$/.test(file)) ids.add(`${section}/${file.replace(/\.(mdx|json)$/, '')}`);
    }
  return [...ids].sort();
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  return result.status === 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const ids = args.includes('--all') ? allIds() : args.filter((arg) => !arg.startsWith('--'));
  if (!ids.length) {
    console.error('usage: check-docs.mjs <section>/<slug>… | --all [--no-tests]');
    process.exit(2);
  }
  const problems = ids.flatMap((id) => checkPage(id));
  for (const problem of problems) console.error(`docs: ${problem}`);
  let ok = problems.length === 0;
  if (!args.includes('--no-tests')) {
    ok =
      run('npx', ['vitest', 'run', 'src/docs/docs.test.ts', 'src/stories/stories.test.ts']) && ok;
    if (
      existsSync(join(root, 'dist/docs/index.js')) &&
      existsSync(join(root, 'dist/custom-elements.json'))
    )
      ok = run('node', ['scripts/docs/build.mjs', '--check']) && ok;
    else {
      console.error('docs: dist/ is not built; run `npm run build` for the API and catalog checks');
      ok = false;
    }
  }
  console.log(
    ok
      ? `docs: ${ids.length} page${ids.length === 1 ? '' : 's'} pass`
      : `docs: FAILED (${problems.length} page problem${problems.length === 1 ? '' : 's'})`,
  );
  process.exit(ok ? 0 : 1);
}
