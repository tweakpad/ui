// Per-component bundle size report, measured on the published files in `dist` exactly as
// `npm run build` lists them: bytes on disk and gzip per file, summed over the modules a
// component ships. Every figure therefore reconciles with the build log (kB is 1000 bytes there;
// the log's native gzip differs from Node's zlib by about one percent).
//
// Rolldown is used only to resolve which modules an application ships when it imports a catalog
// component from `@tweakpad/ui`, or a widget from `@tweakpad/ui/widgets` (package `exports` and
// `sideEffects`, tree-shaken as a consumer bundler does) and defines it, both alone (root) and as
// documented (with the parts its canonical example composes). `lit` is a peer dependency, so it
// is external and reported once.
//
// Writes src/stories/size-report.json (rendered by the "Tweakpad UI/Bundle size" story) and
// fails when importing a component through its barrel ships any module that importing its own
// module directly does not (tree-shaking guard), or when `@tweakpad/ui/register` reaches the
// widgets section.
import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const root = resolve(import.meta.dirname, '..');
const work = join(root, 'tmp', 'size-report');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { catalogEntries } = await import(join(root, 'dist', 'catalog.js'));
const { widgetEntries } = await import(join(root, 'dist', 'widgets', 'catalog.js'));
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

// Tags each catalog entry's canonical example renders (src/stories/examples.ts and
// src/stories/widgets/examples.ts): the documented composition, e.g. tp-media-player with
// tp-media-video-layout, or tp-accordion with its items. Parts authored as children are not
// elementDependencies of the root.
function exampleTagsOf(...path) {
  const source = readFileSync(join(root, 'src', 'stories', ...path), 'utf8');
  const tags = new Map();
  for (const block of source.split(/\n(?= {2}'tp-[a-z0-9-]+': )/u).slice(1)) {
    const tag = /^ {2}'(tp-[a-z0-9-]+)'/u.exec(block)?.[1];
    if (tag)
      tags.set(tag, [...new Set([...block.matchAll(/<(tp-[a-z0-9-]+)/gu)].map((m) => m[1]))]);
  }
  return tags;
}
const sections = [
  {
    section: 'components',
    barrel: '@tweakpad/ui',
    entries: catalogEntries,
    examples: exampleTagsOf('examples.ts'),
  },
  {
    section: 'widgets',
    barrel: '@tweakpad/ui/widgets',
    entries: widgetEntries,
    examples: exampleTagsOf('widgets', 'examples.ts'),
  },
];

/**
 * Two entries per measured set of tags: one imports the classes from the section's barrel
 * as an application does; the other imports each class from its own module (the minimum
 * graph). Any module the barrel entry ships beyond the direct one means tree-shaking leaked.
 */
function addEntries(name, tags, barrelSpecifier) {
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
    `import { ${classes.map((c) => c.name).join(', ')} } from '${barrelSpecifier}';\nimport { defineElement } from '@tweakpad/ui';\n${defines}\n`,
  );
  const direct = join(work, 'entries', `direct--${name}.js`);
  writeFileSync(
    direct,
    `${classes.map((c) => `import { ${c.name} } from ${JSON.stringify(c.module)};`).join('\n')}\nimport { defineElement } from ${JSON.stringify(defineModule)};\n${defines}\n`,
  );
  entries[name] = barrel;
  entries[`direct--${name}`] = direct;
}

for (const { section, barrel, entries: sectionEntries, examples } of sections)
  for (const entry of sectionEntries) {
    const documented = [
      entry.tagName,
      ...(examples.get(entry.tagName) ?? []).filter(
        (tag) => tag !== entry.tagName && classByTag.has(tag),
      ),
    ];
    addEntries(`root--${entry.tagName}`, [entry.tagName], barrel);
    addEntries(`doc--${entry.tagName}`, documented, barrel);
    components.push({
      name: entry.name,
      tagName: entry.tagName,
      className: classByTag.get(entry.tagName).name,
      kind: entry.kind,
      section,
      uses: documented.slice(1),
    });
  }
const fullEntry = join(work, 'entries', 'register-all.js');
writeFileSync(fullEntry, "import '@tweakpad/ui/register';\n");
entries['register-all'] = fullEntry;
const widgetsEntry = join(work, 'entries', 'register-widgets.js');
writeFileSync(widgetsEntry, "import '@tweakpad/ui/register/widgets';\n");
entries['register-widgets'] = widgetsEntry;
const litEntry = join(work, 'entries', 'lit.js');
writeFileSync(litEntry, "export * from 'lit';\n");

// Module membership only: the code Rolldown emits is never measured, the published files are.
const bundle = await rolldown({ input: entries, cwd: work, external: [/^lit($|\/)/] });
const { output } = await bundle.generate({
  format: 'esm',
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
// Published modules only: no Rolldown virtual runtime ids (null byte) or measurement entries.
const modulesOf = (files) =>
  new Set(
    [...files]
      .flatMap((file) => Object.keys(chunks.get(file).modules))
      .filter((id) => !id.startsWith('\0') && !id.includes('/tmp/size-report/entries/'))
      .map((id) => realpathSync(id)),
  );
const shipped = (name) => modulesOf(reachable(`${name}.js`));

// Each published file as `npm run build` lists it: bytes on disk and its own gzip size.
const fileSizes = new Map();
const sizeOf = (id) => {
  let size = fileSizes.get(id);
  if (!size) {
    const code = readFileSync(id);
    size = { bytes: code.length, gzip: gzipSync(code).length };
    fileSizes.set(id, size);
  }
  return size;
};
const sum = (ids) => {
  const total = { bytes: 0, gzip: 0 };
  for (const id of ids) {
    const size = sizeOf(id);
    total.bytes += size.bytes;
    total.gzip += size.gzip;
  }
  return total;
};

// Modules every catalog component's root ships form the shared runtime (element base,
// presentation). Widgets build on the same runtime, so it is derived from components only.
const roots = components.map((c) => shipped(`root--${c.tagName}`));
const componentRoots = roots.filter((_, index) => components[index].section === 'components');
const shared = new Set(
  [...componentRoots[0]].filter((id) => componentRoots.every((modules) => modules.has(id))),
);
const moduleTag = new Map([...classByTag].map(([tag, declared]) => [declared.module, tag]));

const violations = [];
const leaks = (name) => {
  const modules = shipped(name);
  const minimum = shipped(`direct--${name}`);
  const leaked = [...modules].filter((id) => !minimum.has(id));
  if (leaked.length)
    violations.push(
      `${name}: ${leaked.length} modules beyond its own graph, e.g. ${leaked
        .slice(0, 3)
        .map((id) => id.slice(root.length + 1))
        .join(', ')}`,
    );
};
for (const [index, component] of components.entries()) {
  // As documented: the root plus the parts its canonical example composes.
  const modules = shipped(`doc--${component.tagName}`);
  const documented = sum(modules);
  component.bytes = documented.bytes;
  component.gzip = documented.gzip;
  component.ownGzip = sum([...modules].filter((id) => !shared.has(id))).gzip;
  component.modules = modules.size;
  // The root element alone (what `defineElement(Root)` ships without authored parts).
  const rootSize = sum(roots[index]);
  component.rootBytes = rootSize.bytes;
  component.rootGzip = rootSize.gzip;
  // Library elements whose classes ship with the documented composition.
  component.includes = [...modules]
    .map((id) => moduleTag.get(id))
    .filter((tag) => tag && tag !== component.tagName)
    .sort();
  leaks(`root--${component.tagName}`);
  leaks(`doc--${component.tagName}`);
}
components.sort((a, b) => b.gzip - a.gzip);

// `lit` as published in node_modules (its files are already minified).
const litBundle = await rolldown({ input: litEntry, cwd: work });
const { output: litOutput } = await litBundle.generate({ format: 'esm' });
await litBundle.close();
const litModules = new Set(
  litOutput
    .filter((item) => item.type === 'chunk')
    .flatMap((c) => Object.keys(c.modules))
    .filter((id) => !id.startsWith('\0') && !id.includes('/tmp/size-report/entries/'))
    .map((id) => realpathSync(id)),
);
const fullModules = shipped('register-all');
const widgetModules = shipped('register-widgets');
// The widgets section is opt-in: `@tweakpad/ui/register` must not reach any widget module.
const isWidgetModule = (id) =>
  /\/dist\/(?:widgets\/|widgets\.js$|presentation\/(?:families\/)?widgets\.js$)/u.test(id);
const widgetLeaks = [...fullModules].filter(isWidgetModule);
if (widgetLeaks.length)
  violations.push(
    `register-all ships ${widgetLeaks.length} widget modules, e.g. ${widgetLeaks
      .slice(0, 3)
      .map((id) => id.slice(root.length + 1))
      .join(', ')}`,
  );

const report = {
  generatedAt: new Date().toISOString(),
  version: manifest.version,
  method:
    'Each catalog component (from @tweakpad/ui) and widget (from @tweakpad/ui/widgets) as documented (the root plus the parts its canonical example composes), imported and defined; Rolldown resolves the modules that ships (lit external, tree-shaken) and each module is measured as published in dist, bytes on disk and gzip per file, the way the build log lists it.',
  lit: { ...sum(litModules), modules: litModules.size },
  shared: { ...sum(shared), modules: shared.size },
  full: { ...sum(fullModules), modules: fullModules.size },
  fullWidgets: { ...sum(widgetModules), modules: widgetModules.size },
  components,
};
writeFileSync(
  join(root, 'src', 'stories', 'size-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

// The build log's format: kB of 1000 bytes, truncated to two decimals.
const kb = (bytes) => `${(Math.floor(bytes / 10) / 100).toFixed(2)} kB`;
const widgetCount = components.filter((c) => c.section === 'widgets').length;
console.log(
  `size-report: ${components.length - widgetCount} components, ${widgetCount} widgets; shared runtime ${kb(report.shared.bytes)} (gzip ${kb(report.shared.gzip)}), lit ${kb(report.lit.gzip)} gzip, full register ${kb(report.full.bytes)} (gzip ${kb(report.full.gzip)}), widgets register ${kb(report.fullWidgets.bytes)} (gzip ${kb(report.fullWidgets.gzip)})`,
);
for (const c of components.slice(0, 5))
  console.log(`  ${c.tagName.padEnd(28)} ${kb(c.bytes).padStart(10)} │ gzip: ${kb(c.gzip)}`);
if (violations.length) {
  console.error(`size-report: unrelated components shipped:\n  ${violations.join('\n  ')}`);
  process.exit(1);
}
