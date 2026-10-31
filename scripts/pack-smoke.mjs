// Consumer-level package check: packs the built library, installs the tarball into a throwaway
// project and proves the published `exports`, types and tree-shaking work as a consumer sees
// them. No browser: rendering is verified separately.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { textEditorManifestProblems } from './pack-smoke-manifest.mjs';

const root = resolve(import.meta.dirname, '..');
// The work folder is a fresh one outside the library root: a dev server that watches the root
// reloads its pages when a `tsconfig.json` under it changes, and the consumer project writes one.
// A passing run removes the folder; a failure keeps it for inspection and prints its path.
const work = mkdtempSync(join(tmpdir(), 'tweakpad-pack-smoke-'));
process.on('exit', (code) => {
  if (code !== 0) console.error(`pack-smoke: the work folder is kept for inspection: ${work}`);
});
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
const fail = (message) => {
  console.error(`pack-smoke: ${message}`);
  process.exit(1);
};

// 1. Pack and inspect the tarball contents.
const [pack] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work]));
const files = new Set(pack.files.map((file) => file.path));
// The documentation pages (`docs/components`, `docs/widgets`) ship; the library's internal
// markdown under `docs/` does not.
const forbidden = [...files].filter(
  (path) =>
    /^(src|tmp|plans|external|scripts|tests|\.storybook)\/|^\.env|stylesheet\.js/u.test(path) ||
    (/^docs\//u.test(path) &&
      !/^docs\/(?:components|motion\/[^/]+|widgets)\/[^/]+\.mdx$/u.test(path)),
);
if (forbidden.length) fail(`unexpected files in the package: ${forbidden.slice(0, 10).join(', ')}`);
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const [subpath, target] of Object.entries(manifest.exports)) {
  const paths = typeof target === 'string' ? [target] : Object.values(target);
  for (const path of paths) {
    if (path.includes('*')) continue;
    if (!files.has(path.replace(/^\.\//u, ''))) fail(`export ${subpath} -> ${path} is not packed`);
  }
}
for (const required of [
  'LICENSE',
  'README.md',
  'dist/custom-elements.json',
  'dist/docs.json',
  'docs/components/badge.mdx',
])
  if (!files.has(required)) fail(`${required} is not packed`);
// Every license notice that the build emits for bundled third-party portions ships beside them.
const notices = [
  ...readFileSync(join(root, 'vite.config.ts'), 'utf8').matchAll(
    /\[\s*'src\/[^']+',\s*'(LICENSE\.[^']+)'\s*\]/gu,
  ),
].map((match) => `dist/${match[1]}`);
if (notices.length === 0) fail('vite.config.ts lists no bundled license notice');
for (const notice of notices) if (!files.has(notice)) fail(`${notice} is not packed`);
// Module specifiers of a published file: static imports and exports at line start (type-only ones
// of declarations included), side-effect imports, and `import(…)` calls, which yield `null`
// without a string specifier.
const moduleSpecifiers = (code) => [
  ...[
    ...code.matchAll(
      /^(?:import|export)\s+[^'"]*?from\s*['"]([^'"]+)['"]|^import\s*['"]([^'"]+)['"]/gmu,
    ),
  ].map((match) => match[1] ?? match[2]),
  ...[...code.matchAll(/(?<![\w$.])import\s*\(\s*(?:(['"`])([^'"`]*)\1)?/gu)].map(
    (match) => match[2] ?? null,
  ),
];
const relativeSpecifier = /^\.\.?\//u;
/** The packed modules that entries reach through relative imports, static or dynamic. */
const publishedGraph = (...entries) => {
  const graph = new Map();
  const visit = (file) => {
    if (graph.has(file)) return;
    if (!files.has(file)) fail(`${file} is imported but not packed`);
    const specifiers = moduleSpecifiers(readFileSync(join(root, file), 'utf8'));
    graph.set(file, specifiers);
    for (const specifier of specifiers)
      if (specifier !== null && relativeSpecifier.test(specifier))
        visit(posix.join(posix.dirname(file), specifier));
  };
  for (const entry of entries) visit(entry);
  return graph;
};
// The widgets section and the widgets' companion entries are opt-in: the main index and register
// reach no widget module and no module of `@tweakpad/ui/text-editor` (its engine entries
// included), `/emoji` or `/flow`.
const optInModule = (file) =>
  /^dist\/(?:widgets\/|widgets\.js$|presentation\/(?:families\/)?widgets\.js$)/u.test(file) ||
  /^dist\/(?:foundation\/(?:text-editor|emoji|flow)\/|(?:text-editor|emoji|flow)(?:\/[^/]+)*\.js$)/u.test(
    file,
  );
for (const entry of ['dist/index.js', 'dist/register.js']) {
  const leaked = [...publishedGraph(entry).keys()].filter(optInModule);
  if (leaked.length) fail(`${entry} reaches ${leaked.slice(0, 3).join(', ')}`);
}
// Each engine adapter is its own entry: the companion entry, the widgets and their registration
// reach no adapter module, and an engine entry reaches no other engine's adapter.
const engineEntries = Object.keys(manifest.exports)
  .filter((key) => /^\.\/text-editor\/adapters\/[^/]+$/u.test(key))
  .map((key) => `dist/${key.slice(2)}.js`);
if (engineEntries.length !== 2) fail(`expected 2 engine entries, found ${engineEntries.length}`);
const adapterFolder = (file) =>
  /^dist\/foundation\/text-editor\/adapters\/([^/]+)\//u.exec(file)?.[1] ?? null;
const engineOf = (entry) => entry.slice('dist/text-editor/adapters/'.length, -'.js'.length);
const engineLeaks = [
  ...publishedGraph('dist/text-editor.js', 'dist/widgets.js', 'dist/register/widgets.js').keys(),
].filter((file) => engineEntries.includes(file) || (adapterFolder(file) ?? 'shared') !== 'shared');
if (engineLeaks.length)
  fail(`the engine-free entries reach an adapter: ${engineLeaks.slice(0, 3).join(', ')}`);
for (const entry of engineEntries) {
  const others = [...publishedGraph(entry).keys()].filter((file) => {
    const folder = adapterFolder(file);
    return (
      (folder !== null && folder !== 'shared' && folder !== engineOf(entry)) ||
      (engineEntries.includes(file) && file !== entry)
    );
  });
  if (others.length) fail(`${entry} reaches another adapter: ${others.slice(0, 3).join(', ')}`);
}
// Engines come from the application: no module that `@tweakpad/ui/text-editor`, its engine
// entries or `@tweakpad/ui/widgets` reach, and no module or declaration published under a
// `text-editor` folder, imports a package other than Lit.
const litSpecifier = /^(?:lit(?:\/|$)|@lit\/)/u;
const scanned = new Map([
  ...publishedGraph('dist/text-editor.js', ...engineEntries, 'dist/widgets.js'),
  ...[...files]
    .filter((path) =>
      /^dist\/(?:(?:foundation|widgets)\/text-editor\/|text-editor\/).*\.(?:js|d\.ts)$/u.test(path),
    )
    .map((path) => [path, moduleSpecifiers(readFileSync(join(root, path), 'utf8'))]),
]);
const bareImports = [...scanned].flatMap(([file, specifiers]) =>
  specifiers
    .filter(
      (specifier) =>
        specifier === null || !(relativeSpecifier.test(specifier) || litSpecifier.test(specifier)),
    )
    .map((specifier) => `${file}: ${specifier ?? 'import() without a string specifier'}`),
);
if (bareImports.length)
  fail(`packages other than lit are imported: ${bareImports.slice(0, 10).join(', ')}`);
// The React bindings are client modules that import only React, Lit and the library itself.
const reactFiles = [...files].filter((path) => /^dist\/react\/.*\.js$/u.test(path));
const reactSpecifier = /^react(?:\/|$)/u;
for (const path of reactFiles) {
  const text = readFileSync(join(root, path), 'utf8');
  // Leaf modules are the client boundary; the barrels only re-export them (`export *` is not
  // allowed inside a client boundary).
  if (!path.endsWith('/index.js') && !text.startsWith('"use client";'))
    fail(`${path} lost its "use client" directive`);
  const foreign = moduleSpecifiers(text).filter(
    (specifier) =>
      specifier === null ||
      !(
        relativeSpecifier.test(specifier) ||
        litSpecifier.test(specifier) ||
        reactSpecifier.test(specifier)
      ),
  );
  if (foreign.length) fail(`${path} imports ${foreign.join(', ')}`);
}
if (reactFiles.length < 90) fail(`only ${reactFiles.length} React binding modules are published`);
console.log(
  `pack-smoke: ${reactFiles.length} React binding modules are client modules importing only react, lit and the library`,
);
// The Vue bindings import only Vue, Lit and the library.
const vueFiles = [...files].filter((path) => /^dist\/vue\/.*\.js$/u.test(path));
for (const path of vueFiles) {
  const foreign = moduleSpecifiers(readFileSync(join(root, path), 'utf8')).filter(
    (specifier) =>
      specifier === null ||
      !(relativeSpecifier.test(specifier) || litSpecifier.test(specifier) || specifier === 'vue'),
  );
  if (foreign.length) fail(`${path} imports ${foreign.join(', ')}`);
}
if (vueFiles.length < 90) fail(`only ${vueFiles.length} Vue binding modules are published`);
console.log(
  `pack-smoke: ${vueFiles.length} Vue binding modules import only vue, lit and the library`,
);
const elementsManifest = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
const elements = new Map(
  elementsManifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName)
    .map((declaration) => [declaration.tagName, declaration]),
);
if (
  [...elements.values()].some((element) => element.events?.some((event) => event.name === 'type'))
)
  fail('custom-elements.json lists the bogus `type` event');
if (!elements.get('tp-input')?.events?.some((event) => event.name === 'tp-value-change'))
  fail('custom-elements.json misses tp-input tp-value-change');
const editorProblems = textEditorManifestProblems(elementsManifest);
if (editorProblems.length) fail(`custom-elements.json: ${editorProblems.join('; ')}`);
const megabytes = (bytes) => bytes / 1024 / 1024;
if (megabytes(pack.size) > 8)
  fail(`tarball is ${megabytes(pack.size).toFixed(1)} MB (budget 8 MB)`);
console.log(
  `pack-smoke: ${pack.filename} ${megabytes(pack.size).toFixed(1)} MB packed, ${megabytes(pack.unpackedSize).toFixed(1)} MB unpacked, ${files.size} files`,
);
console.log(
  `pack-smoke: the main entries reach no widget or companion module; ${scanned.size} files that the widgets and the text editor publish import only lit`,
);

// 2. Install the tarball into a consumer project.
const consumer = join(work, 'consumer');
mkdirSync(consumer);
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify({ name: 'tweakpad-ui-consumer', private: true, type: 'module' }, null, 2),
);
run(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
    join(work, pack.filename),
    `lit@${manifest.peerDependencies.lit}`,
    ...['react', 'react-dom', '@types/react', '@types/react-dom', 'vue'].map(
      (name) => `${name}@${manifest.devDependencies[name]}`,
    ),
  ],
  consumer,
);

// 3. Import every public entry the way an application does.
writeFileSync(
  join(consumer, 'consumer.ts'),
  `import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpButton, defineElement, createId } from '@tweakpad/ui';
import { TpIcon } from '@tweakpad/ui/register/icon';
import '@tweakpad/ui/register/widgets';
import { widgetEntries } from '@tweakpad/ui/widgets';
import { plusIcon } from '@tweakpad/ui/icons/plus';
import * as carousel from '@tweakpad/ui/carousel';
import * as dragDrop from '@tweakpad/ui/drag-drop';
import * as media from '@tweakpad/ui/media';
import * as map from '@tweakpad/ui/map';
import * as code from '@tweakpad/ui/code';
import * as markdown from '@tweakpad/ui/markdown';
import * as qr from '@tweakpad/ui/qr';
import * as emoji from '@tweakpad/ui/emoji';
import * as flow from '@tweakpad/ui/flow';
import * as textEditor from '@tweakpad/ui/text-editor';
import * as textEditorTiptap from '@tweakpad/ui/text-editor/adapters/tiptap';
import * as textEditorLexical from '@tweakpad/ui/text-editor/adapters/lexical';
import packageJson from '@tweakpad/ui/package.json' with { type: 'json' };
import { parseDoc, elementApi, type DocsIndex } from '@tweakpad/ui/docs';
import { literalCode } from '@tweakpad/ui/docs/vite';
import docsIndex from '@tweakpad/ui/docs.json' with { type: 'json' };

defineElement(TpButton.tagName, TpButton);
const button: HTMLElementTagNameMap['tp-button'] = document.createElement('tp-button');
button.variant = 'outline';
const editor: HTMLElementTagNameMap['tp-text-editor'] = document.createElement('tp-text-editor');
// @ts-expect-error The text editor publishes no controlled value.
editor.value = editor.value;
const pageIds: DocsIndex['pages'][number]['id'][] = docsIndex.pages.map((page) => page.id);
export const used = [TpIcon, editor, plusIcon.viewBox, createId(), carousel, dragDrop, media, map, code, markdown, qr.encodeQr('x').size, emoji.builtinEmojiData().emojis.length, flow.FLOW_DOCUMENT_VERSION, textEditor, textEditorTiptap, textEditorLexical, widgetEntries.length, packageJson.version, parseDoc, elementApi, literalCode().name, pageIds.length];
`,
);
writeFileSync(join(consumer, 'css.d.ts'), "declare module '*.css';\n");
// The React bindings as an application writes them: typed props, lane callbacks and events.
writeFileSync(
  join(consumer, 'react-consumer.tsx'),
  `import { useState, type ReactElement } from 'react';
import { Button, Checkbox, Dialog, Select } from '@tweakpad/ui/react';
import { Flow } from '@tweakpad/ui/widgets/react';
import type { TpSelect } from '@tweakpad/ui';

export function Panel(): ReactElement {
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Checkbox checked={checked} onCheckedChange={(event) => setChecked(event.detail.value)} />
      <Select items={[{ value: 'a', label: 'A' }]} ref={(element: TpSelect | null) => void element} />
      <Dialog open={open} onOpenChange={(event) => setOpen(event.detail.value)} label="Rename">
        <Button slot="trigger" variant="outline">Rename</Button>
      </Dialog>
      <Flow onTpHistoryChange={(event) => event.detail.canUndo} />
      {/* @ts-expect-error A Checkbox lane value is a boolean. */}
      <Checkbox onCheckedChange={(event) => event.detail.value.trim()} />
    </>
  );
}
`,
);
writeFileSync(
  join(consumer, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        resolveJsonModule: true,
        jsx: 'react-jsx',
      },
      files: ['consumer.ts', 'react-consumer.tsx', 'css.d.ts'],
    },
    null,
    2,
  ),
);

// The documentation tooling is DOM-free: a build step reads the shipped pages and the index in Node.
run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "import { readFileSync } from 'node:fs'; import { createRequire } from 'node:module'; import { dirname, join } from 'node:path'; const require = createRequire(import.meta.url); const { parseDoc, elementApi, relatedPages } = await import('@tweakpad/ui/docs'); const index = require('@tweakpad/ui/docs.json'); const root = dirname(require.resolve('@tweakpad/ui/package.json')); const manifest = JSON.parse(readFileSync(join(root, require('@tweakpad/ui/package.json').customElements), 'utf8')); const page = parseDoc(readFileSync(join(root, 'docs/components/badge.mdx'), 'utf8'), 'components/badge'); if (page.tag !== 'tp-badge' || !page.hero || !index.pages.some((entry) => entry.tag === 'tp-badge') || !elementApi(manifest, 'tp-badge').cssParts.length || !relatedPages(manifest, index.pages).has('components/badge')) process.exit(1);",
  ],
  consumer,
);
console.log('pack-smoke: @tweakpad/ui/docs reads the shipped pages in Node');

// The QR encoder is DOM-free: it must run in Node without a document or Lit.
run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "const { encodeQr } = await import('@tweakpad/ui/qr'); if (encodeQr('HELLO WORLD').version !== 1) process.exit(1);",
  ],
  consumer,
);
console.log('pack-smoke: @tweakpad/ui/qr runs in Node');

// The emoji data helpers are DOM-free: the built-in dataset and the adapter run in Node.
run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "const { builtinEmojiData, createEmojibaseData } = await import('@tweakpad/ui/emoji'); if (!builtinEmojiData().emojis.length || createEmojibaseData([], { groups: [], subgroups: [] }).emojis.length !== 0) process.exit(1);",
  ],
  consumer,
);
console.log('pack-smoke: @tweakpad/ui/emoji runs in Node');

// The flow engine is DOM-free as well: model, routing and layout must run in Node (and workers).
run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "const { FlowModel, layoutFlow } = await import('@tweakpad/ui/flow'); const model = new FlowModel({ document: { version: 1, nodes: [{ id: 'a', type: 't', position: { x: 0, y: 0 }, size: { width: 100, height: 40 }, data: {} }, { id: 'b', type: 't', position: { x: 0, y: 0 }, size: { width: 100, height: 40 }, data: {} }], edges: [{ id: 'e', source: 'a', target: 'b' }] } }); if (layoutFlow(model, 'horizontal').changes.length === 0) process.exit(1);",
  ],
  consumer,
);
console.log('pack-smoke: @tweakpad/ui/flow runs in Node');

// The text editor companion is engine-free and DOM-free too: the built-in tools compose with the
// default layouts and the strings in Node, which also keeps the icon modules they import data-only.
const textEditorLabels = run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "const { textEditorTools, defaultTextEditorLayout, textEditorStrings } = await import('@tweakpad/ui/text-editor'); const context = { strings: textEditorStrings, direction: 'ltr' }; const ids = [...new Set(Object.values(defaultTextEditorLayout).flat(2))].filter((id) => typeof id === 'string' && id !== '*'); const labels = ids.map((id) => { const label = textEditorTools[id]?.label; return typeof label === 'function' ? label(context) : label; }); if (!ids.length || labels.some((label) => typeof label !== 'string' || !label)) process.exit(1); const api = await import('@tweakpad/ui/text-editor'); if (Object.keys(api).some((key) => key.startsWith('create'))) process.exit(2); console.log(labels.length);",
  ],
  consumer,
).trim();
console.log(
  `pack-smoke: @tweakpad/ui/text-editor runs in Node (${textEditorLabels} tools of the default layouts labeled)`,
);

// The engine factories need no engine package, which the consumer does not install: the check of
// `pack-smoke-engine-factories.mjs` runs in the consumer against the published factories.
const { BASE_CAPABILITIES } = await import(
  pathToFileURL(join(root, 'dist/foundation/text-editor/capabilities.js')).href
);
const baseCapabilities = [...BASE_CAPABILITIES];
if (baseCapabilities.length !== 30)
  fail(`expected 30 base capabilities, read ${baseCapabilities.length}`);
for (const engine of ['@tiptap', '@lexical', 'lexical', 'prosemirror-model'])
  if (existsSync(join(consumer, 'node_modules', engine)))
    fail(`the consumer has ${engine} installed`);
writeFileSync(
  join(consumer, 'engine-factories.mjs'),
  `import { createTiptapEngine } from '@tweakpad/ui/text-editor/adapters/tiptap';
import { createLexicalEngine } from '@tweakpad/ui/text-editor/adapters/lexical';
import { engineFactoryProblems } from ${JSON.stringify(pathToFileURL(join(root, 'scripts/pack-smoke-engine-factories.mjs')).href)};
const base = JSON.parse(process.argv[2]);
const results = [];
for (const [name, factory] of [['createTiptapEngine', createTiptapEngine], ['createLexicalEngine', createLexicalEngine]]) {
  const { problems, engine } = engineFactoryProblems(name, factory, base);
  if (problems.length) {
    console.error(name + ': ' + problems.join('; '));
    process.exit(1);
  }
  results.push(name + ' (' + engine.capabilities.size + ' capabilities, reserved ' + (engine.reservedKeys.join(' ') || 'none') + ')');
}
// A mount started behind the factory's back would reject or throw here, without a document.
await new Promise((resolve) => setTimeout(resolve, 10));
console.log(results.join(', '));
`,
);
const engineFactories = run(
  process.execPath,
  ['engine-factories.mjs', JSON.stringify(baseCapabilities)],
  consumer,
).trim();
console.log(
  `pack-smoke: the engine factories run in Node from their entries without an engine package: ${engineFactories}`,
);

// The React bindings import in Node and server-render: a framework renders client modules on
// the server first. Primitive props become attributes; objects and functions wait for the client.
writeFileSync(
  join(consumer, 'react-ssr.mjs'),
  `import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { Button, Select } from '@tweakpad/ui/react';
process.stdout.write(
  renderToString(h('div', null, h(Button, { variant: 'outline', onClick() {} }, 'Save'), h(Select, { items: [{ value: 'a', label: 'A' }], label: 'Fruit' }))),
);
`,
);
const serverRendered = execFileSync(process.execPath, ['react-ssr.mjs'], {
  cwd: consumer,
  encoding: 'utf8',
});
if (
  !serverRendered.includes('<tp-button variant="outline">Save</tp-button>') ||
  !serverRendered.includes('<tp-select label="Fruit"></tp-select>')
)
  fail(`the React bindings server-render unexpected markup: ${serverRendered}`);
console.log('pack-smoke: the React bindings import in Node and server-render their elements');
writeFileSync(
  join(consumer, 'vue-ssr.mjs'),
  `import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Button, Checkbox } from '@tweakpad/ui/vue';
const app = createSSRApp(() => h('div', null, [h(Button, { variant: 'outline' }, () => 'Save'), h(Checkbox, { checked: true })]));
process.stdout.write(await renderToString(app));
`,
);
const vueRendered = execFileSync(process.execPath, ['vue-ssr.mjs'], {
  cwd: consumer,
  encoding: 'utf8',
});
if (!vueRendered.includes('<tp-button') || !vueRendered.includes('<tp-checkbox'))
  fail(`the Vue bindings server-render unexpected markup: ${vueRendered}`);
console.log('pack-smoke: the Vue bindings import in Node and server-render their elements');

// 4. Type-check against the published declarations, including the library's own.
run(join(root, 'node_modules/.bin/tsc'), ['-p', consumer]);
console.log('pack-smoke: consumer type check passed (skipLibCheck: false)');

// 5. Bundle the consumer, then a selective import in a build of its own, and prove unrelated
// modules are dropped. A build of both entries would move the modules they share into a common
// chunk, together with the definitions that only the full consumer uses.
writeFileSync(
  join(consumer, 'icon-only.js'),
  `import '@tweakpad/ui/register/icon';
import { plusIcon } from '@tweakpad/ui/icons/plus';
import { strikethroughIcon } from '@tweakpad/ui/icons/text-formatting';
document.querySelector('tp-icon').icon = plusIcon;
document.querySelectorAll('tp-icon')[1].icon = strikethroughIcon;
`,
);
/** Builds one consumer entry alone and returns the JavaScript of every file the build emits. */
const bundle = (name, entry) => {
  const config = `${name}.vite.config.mjs`;
  writeFileSync(
    join(consumer, config),
    `export default {
  logLevel: 'warn',
  build: {
    outDir: ${JSON.stringify(`out/${name}`)},
    minify: false,
    lib: { entry: { ${JSON.stringify(name)}: ${JSON.stringify(entry)} }, formats: ['es'] },
    rollupOptions: { external: [/^lit/] },
  },
};
`,
  );
  run(join(root, 'node_modules/.bin/vite'), ['build', '--config', config], consumer);
  const out = join(consumer, 'out', name);
  return readdirSync(out, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFileSync(join(out, file), 'utf8'))
    .join('\n');
};
bundle('full', 'consumer.ts');
const iconOnly = bundle('icon-only', 'icon-only.js');
// One React binding from the barrel ships its element, not the other components'.
writeFileSync(join(consumer, 'react-one.js'), "export { Switch } from '@tweakpad/ui/react';\n");
const reactOne = bundle('react-one', 'react-one.js');
if (!reactOne.includes('tp-switch')) fail('the single React binding bundle is missing tp-switch');
if (reactOne.includes('tp-select') || reactOne.includes('tp-dialog'))
  fail('the single React binding bundle includes unrelated components');
if (!iconOnly.includes('M12 5v14M5 12h14')) fail('the icon-only bundle is missing the plus icon');
if (iconOnly.includes('tp-button')) fail('the icon-only bundle includes unrelated components');
// One definition of a module that holds several ships without its siblings.
if (!iconOnly.includes('M14 12a4 4 0 0 1 0 8H6'))
  fail('the icon-only bundle is missing the strikethrough icon');
const publishedIcons = join(consumer, 'node_modules/@tweakpad/ui/dist/icons');
for (const [name, module, d] of [
  ['chevron', 'chevron-right', 'm9 18 6-6-6-6'],
  ['bold', 'text-formatting', 'M6 12h8a4 4 0 0 1 0 8H6V4h7a4 4 0 0 1 0 8'],
  ['bookmark', 'text-formatting', 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4Z'],
  ['code', 'text-formatting', 'M16 18L22 12L16 6'],
]) {
  // The artwork is published as the bundle would carry it, so its absence means it was dropped.
  if (!readFileSync(join(publishedIcons, `${module}.js`), 'utf8').includes(d))
    fail(`the published ${module} module has no ${name} artwork to look for`);
  if (iconOnly.includes(d)) fail(`the icon-only bundle includes the unrelated ${name} icon`);
}
// One engine entry alone ships its adapter and never the other's: the extension name of the
// second adapter and the editing-root selectors of the first are the tell-tales.
const lexicalName = '@tweakpad/ui/text-editor/adapters/lexical';
writeFileSync(
  join(consumer, 'engine-only.js'),
  `import { createTiptapEngine } from '@tweakpad/ui/text-editor/adapters/tiptap';
export const engine = createTiptapEngine({});
`,
);
const engineOnly = bundle('engine-only', 'engine-only.js');
if (!engineOnly.includes('ProseMirror')) fail('the single-engine bundle is missing its adapter');
if (engineOnly.includes(lexicalName)) fail('the single-engine bundle includes the other adapter');
writeFileSync(
  join(consumer, 'other-engine-only.js'),
  `import { createLexicalEngine } from '@tweakpad/ui/text-editor/adapters/lexical';
export const engine = createLexicalEngine({});
`,
);
const otherEngineOnly = bundle('other-engine-only', 'other-engine-only.js');
if (!otherEngineOnly.includes(lexicalName))
  fail('the other single-engine bundle is missing its adapter');
if (otherEngineOnly.includes('ProseMirror'))
  fail('the other single-engine bundle includes the first adapter');
console.log(
  'pack-smoke: consumer bundle built; selective imports tree-shake; each engine entry ships its adapter alone',
);
rmSync(work, { recursive: true, force: true });
