// Build independent, minified consumer bundles from fresh dist output.
// npm run size:report builds the package first and regenerates the Storybook data.
import { mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';
import { format, resolveConfig } from 'prettier';

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

const sections = [
  { section: 'components', barrel: '@tweakpad/ui', entries: catalogEntries },
  { section: 'widgets', barrel: '@tweakpad/ui/widgets', entries: widgetEntries },
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

for (const { section, barrel, entries: sectionEntries } of sections)
  for (const entry of sectionEntries) {
    addEntries(entry.tagName, [entry.tagName], barrel);
    components.push({ name: entry.name, tagName: entry.tagName, section });
  }
const fullEntry = join(work, 'entries', 'register-all.js');
writeFileSync(fullEntry, "import '@tweakpad/ui/register';\n");
entries['register-all'] = fullEntry;
const widgetsEntry = join(work, 'entries', 'register-widgets.js');
writeFileSync(widgetsEntry, "import '@tweakpad/ui/register/widgets';\n");
entries['register-widgets'] = widgetsEntry;
const litEntry = join(work, 'entries', 'lit.js');
writeFileSync(litEntry, "export * from 'lit';\n");

// Each entry is bundled independently: a multi-entry build would introduce shared chunks
// and change the compression of a component used alone. Keep concurrency bounded.
async function measure(input, external = [/^lit($|\/)/, /^@lit\//]) {
  const bundle = await rolldown({
    input,
    cwd: work,
    external,
    platform: 'browser',
    transform: { define: { 'process.env.NODE_ENV': JSON.stringify('production') } },
    onLog(level, log, handler) {
      if (log.code !== 'INEFFECTIVE_DYNAMIC_IMPORT') handler(level, log);
    },
  });
  try {
    const { output } = await bundle.generate({ format: 'esm', minify: true, sourcemap: false });
    const chunks = output.filter((item) => item.type === 'chunk');
    const modules = new Set(
      chunks
        .flatMap((chunk) => Object.keys(chunk.modules))
        .filter((id) => !id.startsWith('\0') && !id.startsWith(join(work, 'entries')))
        .map((id) => realpathSync(id)),
    );
    // Compress actual output chunks individually, including any lazy chunks.
    return {
      modules,
      bytes: chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk.code), 0),
      gzip: chunks.reduce((sum, chunk) => sum + gzipSync(chunk.code).length, 0),
    };
  } finally {
    await bundle.close();
  }
}
const results = new Map();
const queue = Object.entries(entries);
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [name, input] = next;
      results.set(name, await measure(input));
    }
  }),
);
const moduleTag = new Map([...classByTag].map(([tag, declared]) => [declared.module, tag]));
const violations = [];
for (const component of components) {
  const result = results.get(component.tagName);
  const minimum = results.get(`direct--${component.tagName}`);
  const leaked = [...result.modules].filter((id) => !minimum.modules.has(id));
  if (leaked.length)
    violations.push(`${component.tagName}: unrelated modules: ${leaked.join(', ')}`);
  Object.assign(component, {
    bytes: result.bytes,
    gzip: result.gzip,
    modules: result.modules.size,
    includes: [...result.modules]
      .map((id) => moduleTag.get(id))
      .filter((tag) => tag && tag !== component.tagName)
      .sort(),
  });
}
components.sort((a, b) => b.gzip - a.gzip);
const isWidgetModule = (id) =>
  /\/dist\/(?:widgets\/|widgets\.js$|presentation\/(?:families\/)?widgets\.js$)/u.test(id) ||
  /\/dist\/(?:foundation\/(?:text-editor|emoji|flow)\/|(?:text-editor|emoji|flow)\.js$)/u.test(id);
const full = results.get('register-all');
const widgetLeaks = [...full.modules].filter(isWidgetModule);
if (widgetLeaks.length) violations.push(`register-all reaches widgets: ${widgetLeaks.join(', ')}`);
if (violations.length)
  throw new Error(`size-report: tree-shaking failed:\n${violations.join('\n')}`);
const sizes = ({ bytes, gzip }) => ({ bytes, gzip });
const report = {
  generatedAt: new Date().toISOString(),
  version: manifest.version,
  method:
    'Each row imports and registers one component or widget from its public package entry. Rolldown tree-shakes and minifies an independent production JavaScript bundle, then measures its output before and after gzip. Required dependencies and embedded styles are included; Lit, optional engines, source maps and the separate global stylesheet are excluded. Sizes use kB of 1000 bytes.',
  lit: sizes(await measure(litEntry, [])),
  full: sizes(full),
  fullWidgets: sizes(results.get('register-widgets')),
  components,
};
// Publish only a complete report that passed every guard.
const reportPath = join(root, 'src', 'stories', 'size-report.json');
writeFileSync(
  reportPath,
  await format(JSON.stringify(report), {
    ...(await resolveConfig(reportPath)),
    filepath: reportPath,
  }),
);
console.log(
  `size-report: generated ${components.length} independent component/widget bundles; tree-shaking verified`,
);
for (const c of components.slice(0, 5))
  console.log(
    `  ${c.tagName}: ${(c.bytes / 1000).toFixed(2)} kB uncompressed, ${(c.gzip / 1000).toFixed(2)} kB gzip`,
  );
