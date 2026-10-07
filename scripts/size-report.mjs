// Per-component bundle size report (gzipped), measured the way a consumer ships it: each entry
// imports a catalog component from `@tweakpad/ui` (package `exports` and `sideEffects`, as an
// application resolves it) and defines it, both alone (root) and as documented (with the parts
// its canonical example composes). One Rolldown build splits shared chunks; a
// component's size is the minified code of every chunk it reaches, gzipped together. `lit` is a
// peer dependency, so it is external and reported once.
//
// Writes src/stories/size-report.json (rendered by the "Tweakpad UI/Bundle size" story) and
// fails when importing a component through the `@tweakpad/ui` barrel ships any module that
// importing its own module directly does not (tree-shaking guard).
import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const root = resolve(import.meta.dirname, '..');
const work = join(root, 'tmp', 'size-report');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { catalogEntries } = await import(join(root, 'dist', 'catalog.js'));
const elementsManifest = JSON.parse(
  readFileSync(join(root, 'dist', 'custom-elements.json'), 'utf8'),
);
// Tag → class name and the published module that declares it (src/x.ts → dist/x.js).
const classByTag = new Map(
  elementsManifest.modules.flatMap((module) =>
    (module.declarations ?? [])
      .filter((declaration) => declaration.tagName)
      .map((declaration) => [
        declaration.tagName,
        {
          name: declaration.name,
          module: realpathSync(
            join(root, module.path.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js')),
          ),
        },
      ]),
  ),
);

// A throwaway consumer that resolves `@tweakpad/ui` through node_modules, like an application.
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'node_modules', '@tweakpad'), { recursive: true });
mkdirSync(join(work, 'entries'));
symlinkSync(root, join(work, 'node_modules', '@tweakpad', 'ui'), 'dir');
symlinkSync(join(root, 'node_modules', 'lit'), join(work, 'node_modules', 'lit'), 'dir');

const defineModule = realpathSync(join(root, 'dist', 'foundation', 'define.js'));
const entries = {};
const components = [];

// Tags each catalog component's canonical example renders (src/stories/examples.ts): the
// documented composition, e.g. tp-media-player with tp-media-video-layout, or tp-accordion
// with its items. Parts authored as children are not elementDependencies of the root.
const examplesSource = readFileSync(join(root, 'src', 'stories', 'examples.ts'), 'utf8');
const exampleTags = new Map();
for (const block of examplesSource.split(/\n(?= {2}'tp-[a-z0-9-]+': )/u).slice(1)) {
  const tag = /^ {2}'(tp-[a-z0-9-]+)'/u.exec(block)?.[1];
  if (tag)
    exampleTags.set(tag, [...new Set([...block.matchAll(/<(tp-[a-z0-9-]+)/gu)].map((m) => m[1]))]);
}

/**
 * Two entries per measured set of tags: one imports the classes from the `@tweakpad/ui` barrel
 * as an application does; the other imports each class from its own module (the minimum
 * graph). Any module the barrel entry ships beyond the direct one means tree-shaking leaked.
 */
function addEntries(name, tags) {
  const classes = tags.map((tag) => {
    const declared = classByTag.get(tag);
    if (!declared) throw new Error(`No class for ${tag} in custom-elements.json`);
    return declared;
  });
  const defines = classes
    .map((declared) => `defineElement(${declared.name}.tagName, ${declared.name});`)
    .join('\n');
  const barrel = join(work, 'entries', `${name}.js`);
  writeFileSync(
    barrel,
    `import { ${classes.map((c) => c.name).join(', ')}, defineElement } from '@tweakpad/ui';\n${defines}\n`,
  );
  const direct = join(work, 'entries', `direct--${name}.js`);
  writeFileSync(
    direct,
    `${classes.map((c) => `import { ${c.name} } from ${JSON.stringify(c.module)};`).join('\n')}\nimport { defineElement } from ${JSON.stringify(defineModule)};\n${defines}\n`,
  );
  entries[name] = barrel;
  entries[`direct--${name}`] = direct;
}

for (const entry of catalogEntries) {
  const documented = [
    entry.tagName,
    ...(exampleTags.get(entry.tagName) ?? []).filter(
      (tag) => tag !== entry.tagName && classByTag.has(tag),
    ),
  ];
  addEntries(`root--${entry.tagName}`, [entry.tagName]);
  addEntries(`doc--${entry.tagName}`, documented);
  components.push({
    name: entry.name,
    tagName: entry.tagName,
    className: classByTag.get(entry.tagName).name,
    kind: entry.kind,
    uses: documented.slice(1),
  });
}
const fullEntry = join(work, 'entries', 'register-all.js');
writeFileSync(fullEntry, "import '@tweakpad/ui/register';\n");
entries['register-all'] = fullEntry;
const litEntry = join(work, 'entries', 'lit.js');
writeFileSync(litEntry, "export * from 'lit';\n");

const gzip = (code) => gzipSync(code, { level: 9 }).length;

const bundle = await rolldown({ input: entries, cwd: work, external: [/^lit($|\/)/] });
const { output } = await bundle.write({
  dir: join(work, 'out'),
  format: 'esm',
  minify: true,
  entryFileNames: '[name].js',
  chunkFileNames: 'chunks/[name]-[hash].js',
});
await bundle.close();
const chunks = new Map(output.filter((item) => item.type === 'chunk').map((c) => [c.fileName, c]));
const reachable = (fileName, seen = new Set()) => {
  // `imports` also lists external `lit` specifiers, which are not chunks.
  if (seen.has(fileName) || !chunks.has(fileName)) return seen;
  seen.add(fileName);
  for (const imported of chunks.get(fileName)?.imports ?? []) reachable(imported, seen);
  return seen;
};

// Chunks every catalog component's root reaches form the shared runtime (element base,
// presentation).
const shared = [...chunks.keys()].filter((fileName) =>
  components.every((c) => reachable(`root--${c.tagName}.js`).has(fileName)),
);
const codeOf = (files) => [...files].map((fileName) => chunks.get(fileName).code).join('\n');
const sharedCode = codeOf(shared);
// Library modules only: no Rolldown virtual runtime ids (null byte) or measurement entries.
const modulesOf = (files) =>
  new Set(
    [...files]
      .flatMap((file) => Object.keys(chunks.get(file).modules))
      .filter((id) => !id.startsWith('\0') && !id.includes('/tmp/size-report/entries/'))
      .map((id) => realpathSync(id)),
  );
const moduleTag = new Map([...classByTag].map(([tag, declared]) => [declared.module, tag]));

const violations = [];
const leaks = (name) => {
  const modules = modulesOf(reachable(`${name}.js`));
  const minimum = modulesOf(reachable(`direct--${name}.js`));
  const leaked = [...modules].filter((id) => !minimum.has(id));
  if (leaked.length)
    violations.push(
      `${name}: ${leaked.length} modules beyond its own graph, e.g. ${leaked
        .slice(0, 3)
        .map((id) => id.slice(root.length + 1))
        .join(', ')}`,
    );
};
for (const component of components) {
  const graph = reachable(`doc--${component.tagName}.js`);
  const code = codeOf(graph);
  const modules = modulesOf(graph);
  // As documented: the root plus the parts its canonical example composes.
  component.gzip = gzip(code);
  component.minified = Buffer.byteLength(code);
  component.ownGzip = gzip(codeOf([...graph].filter((file) => !shared.includes(file))));
  component.modules = modules.size;
  // The root element alone (what `defineElement(Root)` ships without authored parts).
  component.rootGzip = gzip(codeOf(reachable(`root--${component.tagName}.js`)));
  // Library elements whose classes ship with the documented composition.
  component.includes = [...modules]
    .map((id) => moduleTag.get(id))
    .filter((tag) => tag && tag !== component.tagName)
    .sort();
  leaks(`root--${component.tagName}`);
  leaks(`doc--${component.tagName}`);
}
components.sort((a, b) => b.gzip - a.gzip);

const litBundle = await rolldown({ input: litEntry, cwd: work });
const { output: litOutput } = await litBundle.generate({ format: 'esm', minify: true });
await litBundle.close();
const litCode = litOutput
  .filter((item) => item.type === 'chunk')
  .map((c) => c.code)
  .join('\n');
const fullCode = codeOf(reachable('register-all.js'));

const report = {
  generatedAt: new Date().toISOString(),
  version: manifest.version,
  method:
    'Each catalog component as documented (the root plus the parts its canonical example composes) imported from @tweakpad/ui and defined, bundled with Rolldown (minified, lit external), gzip level 9.',
  lit: { gzip: gzip(litCode), minified: Buffer.byteLength(litCode) },
  shared: {
    gzip: gzip(sharedCode),
    minified: Buffer.byteLength(sharedCode),
    chunks: shared.length,
  },
  full: { gzip: gzip(fullCode), minified: Buffer.byteLength(fullCode) },
  components,
};
writeFileSync(
  join(root, 'src', 'stories', 'size-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
console.log(
  `size-report: ${components.length} components; shared runtime ${kb(report.shared.gzip)}, lit ${kb(report.lit.gzip)}, full register ${kb(report.full.gzip)} (gzip)`,
);
for (const c of components.slice(0, 5)) console.log(`  ${c.tagName.padEnd(28)} ${kb(c.gzip)}`);
if (violations.length) {
  console.error(`size-report: unrelated components shipped:\n  ${violations.join('\n  ')}`);
  process.exit(1);
}
