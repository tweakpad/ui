#!/usr/bin/env node
// Freezes the two former documentation sources once, before either is deleted, so a merge works
// from fixed inputs and `check-docs.mjs` can prove the result kept them:
//
// - A, the website pages: `<site>/src/content/docs/{components,widgets}/<slug>.mdx`, copied byte
//   for byte to `plans/docs/sources/website/<section>/<slug>.mdx`.
// - B, the Storybook material for the same tag: the sections of `docs/<name>.md` (or of an
//   existing `docs/<section>/<slug>.mdx`), every `*.examples.ts` entry in Preview form, and every
//   story besides Default, written to `plans/docs/sources/storybook/<section>/<slug>.json`.
//
// Usage (library root): node .agents/skills/tweakpad-docs/scripts/capture-sources.mjs
//   [--site ../../tweakpad.github.io] [--force]
// Existing captures are kept unless --force is given: the sources are frozen on purpose.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../../../..');
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const site = resolve(root, argument('--site', '../../tweakpad.github.io'));
const force = process.argv.includes('--force');
const out = join(root, 'plans/docs/sources');

const frontmatterTag = (source) => /^tag:\s*(\S+)\s*$/m.exec(source)?.[1];

// A: the website pages, by tag.
const websitePages = new Map();
for (const section of ['components', 'motion/text', 'motion/surface', 'widgets']) {
  const folder = join(site, 'src/content/docs', section);
  if (!existsSync(folder)) throw new Error(`no website pages at ${folder}`);
  for (const file of readdirSync(folder).sort()) {
    if (!file.endsWith('.mdx')) continue;
    const source = readFileSync(join(folder, file), 'utf8');
    const tag = frontmatterTag(source);
    if (!tag) throw new Error(`${section}/${file} has no tag`);
    websitePages.set(tag, { section, slug: file.slice(0, -4), source });
  }
}

// Markdown split into sections by heading, outside code fences. Items keep their source text.
function markdownItems(source, prefix) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const items = [];
  const path = [];
  let current = { id: `${prefix}: (intro)`, heading: null, lines: [] };
  let fence = null;
  let start = 0;
  if (lines[0] === '---') start = lines.indexOf('---', 1) + 1;
  for (const line of lines.slice(start)) {
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) fence = fence === null ? fenceMatch[1] : line.startsWith(fence) ? null : fence;
    const heading = fence === null && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading && heading[1].length > 1) {
      items.push(current);
      const depth = heading[1].length;
      path.length = Math.max(0, depth - 2);
      path.push(heading[2]);
      current = { id: `${prefix}: ${path.join(' › ')}`, heading: line, lines: [] };
      continue;
    }
    if (heading) continue; // the `# Title` line
    current.lines.push(line);
  }
  items.push(current);
  return items
    .map(({ id, heading, lines: body }) => ({
      id,
      kind: 'md',
      heading,
      text: body.join('\n').trim(),
    }))
    .filter((item) => item.heading || item.text);
}

const REGISTRATION = /^import '@tweakpad\/ui\/(?:register(?:\/widgets)?|styles\.css)';\n?/gm;

/** An examples entry in Preview form: markup as `code`, its module script without registration. */
function exampleItem(example) {
  const item = { id: `example: ${example.title}`, kind: 'example', title: example.title };
  if (example.description) item.description = example.description;
  const code = String(example.code ?? '');
  const scriptAt = code.indexOf('\n<script type="module">\n');
  if (scriptAt !== -1 && code.trimEnd().endsWith('</script>')) {
    item.code = code.slice(0, scriptAt);
    item.script = code
      .slice(
        scriptAt + '\n<script type="module">\n'.length,
        code.trimEnd().length - '</script>'.length,
      )
      .replace(REGISTRATION, '')
      .trim();
  } else item.code = code;
  for (const key of ['language', 'viewport']) if (example[key]) item[key] = example[key];
  return item;
}

const unique = (items) => {
  const seen = new Map();
  return items.map((item) => {
    const count = (seen.get(item.id) ?? 0) + 1;
    seen.set(item.id, count);
    return count === 1 ? item : { ...item, id: `${item.id} #${count}` };
  });
};

const require = createRequire(join(root, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

const storyFiles = [
  ...readdirSync(join(root, 'src/stories')).map((file) => `src/stories/${file}`),
  ...readdirSync(join(root, 'src/stories/widgets')).map((file) => `src/stories/widgets/${file}`),
].filter((file) => file.endsWith('.stories.ts'));

const written = [];
const problems = [];
const covered = new Set();
try {
  for (const file of storyFiles) {
    const text = readFileSync(join(root, file), 'utf8');
    const tag = /component:\s*'(tp-[\w-]+)'/.exec(text)?.[1];
    const page = tag && websitePages.get(tag);
    if (!page) continue;
    covered.add(tag);
    const id = `${page.section}/${page.slug}`;
    const items = [];
    const sources = { story: file };

    // Reference markdown, or a page already written in the library.
    const markdown = /from '((?:\.\.\/)+docs\/[^']+\.md)\?raw'/.exec(text)?.[1];
    const existingPage = join(root, 'docs', page.section, `${page.slug}.mdx`);
    if (markdown) {
      const path = relative(root, resolve(dirname(join(root, file)), markdown));
      sources.markdown = path;
      items.push(...markdownItems(readFileSync(join(root, path), 'utf8'), 'md'));
    } else if (existsSync(existingPage)) {
      sources.markdown = relative(root, existingPage);
      items.push(...markdownItems(readFileSync(existingPage, 'utf8'), 'md'));
    }

    // Examples modules the story file imports.
    for (const match of text.matchAll(/from '(\.\/[\w-]+\.examples\.js)'/g)) {
      const path = relative(root, resolve(dirname(join(root, file)), match[1])).replace(
        /\.js$/,
        '.ts',
      );
      sources.examples = [...(sources.examples ?? []), path];
      try {
        const module = await server.ssrLoadModule(`/${path}`);
        for (const value of Object.values(module))
          if (
            Array.isArray(value) &&
            value.every((entry) => entry && typeof entry.title === 'string')
          )
            items.push(...value.map(exampleItem));
      } catch (error) {
        problems.push(`${id}: cannot load ${path}: ${String(error).split('\n')[0]}`);
      }
    }

    // Stories besides Default.
    let stories = null;
    try {
      const module = await server.ssrLoadModule(`/${file}`);
      stories = Object.entries(module).filter(([name]) => name !== 'default' && name !== 'Default');
    } catch {
      stories = [...text.matchAll(/^export const (\w+)\b/gm)]
        .map((match) => [match[1], null])
        .filter(([name]) => name !== 'Default');
    }
    for (const [name, story] of stories) {
      const item = { id: `story: ${name}`, kind: 'story', name };
      const docs = story?.parameters?.docs;
      if (story?.name) item.title = story.name;
      if (docs?.description?.story) item.description = docs.description.story;
      if (docs?.source?.code) item.code = docs.source.code;
      if (story?.tags) item.tags = story.tags;
      items.push(item);
    }

    const capture = { id, tag, sources, items: unique(items) };
    const websiteTarget = join(out, 'website', page.section, `${page.slug}.mdx`);
    const storybookTarget = join(out, 'storybook', page.section, `${page.slug}.json`);
    for (const [target, content] of [
      [websiteTarget, page.source],
      [storybookTarget, `${JSON.stringify(capture, null, 2)}\n`],
    ]) {
      if (existsSync(target) && !force) continue;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
      written.push(relative(root, target));
    }
  }
} finally {
  await server.close();
}

for (const [tag, page] of websitePages)
  if (!covered.has(tag)) {
    problems.push(`${page.section}/${page.slug}: no story declares ${tag}; captured A only`);
    const target = join(out, 'website', page.section, `${page.slug}.mdx`);
    if (!existsSync(target) || force) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, page.source);
      written.push(relative(root, target));
    }
  }

for (const problem of problems) console.error(`capture: ${problem}`);
console.log(
  `capture: ${written.length} file${written.length === 1 ? '' : 's'} written to ${relative(root, out)}`,
);
process.exit(problems.some((problem) => problem.includes('cannot load')) ? 1 : 0);
